import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  NgZone,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { DEFAULT_CENTER, GOOGLE_MAP_ID } from './api-config';
import { PlaceDto } from './models/place-model';
import {
  GoogleTravelMode,
  LocationDto,
  PlanTripPreviewResult,
  ShoppingListItemDto,
  TripCandidateDto,
  TripDto
} from './models/trip-model';
import { GoogleMapsLibraries, GoogleMapsLoader } from './services/google-maps-loader';
import { PlaceService } from './services/placeservice';
import { TripPlanningService } from './services/tripservice';

type OriginSource = 'browser' | 'member' | 'map' | 'default';

interface Origin {
  lat: number;
  lng: number;
  label: string;
  source: OriginSource;
}

// 行程列表裡的一站
interface ItineraryStop {
  placeId: number;
  googlePlaceId: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeCategoryId: number | null;
  rating: number | null;
  isRecommend: boolean;
  matchedItemIds: number[];
  matchedItemNames: string[];
}

interface TravelModeOption {
  label: string;
  value: GoogleTravelMode;
}

const BRAND_COLOR = '#ab3500';
const ORIGIN_COLOR = '#406840';
const SEARCH_COLOR = '#2563eb';
// Google Maps 導航連結的 travelmode 參數值
const NAVIGATION_TRAVEL_MODE: Record<GoogleTravelMode, string> = {
  [GoogleTravelMode.Drive]: 'driving',
  [GoogleTravelMode.Walk]: 'walking',
  [GoogleTravelMode.Bicycle]: 'bicycling',
  [GoogleTravelMode.TwoWheeler]: 'two-wheeler',
  [GoogleTravelMode.Transit]: 'transit'
};
// Google Maps 導航連結最多帶 9 個中途點（不含終點）
const MAX_NAVIGATION_WAYPOINTS = 9;
// 候選店家每頁顯示幾家
const CANDIDATE_PAGE_SIZE = 10;

@Component({
  selector: 'app-trip-builder',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DragDropModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    ProgressBarModule,
    SelectModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './trip-builder.html',
  styleUrl: './trip-builder.css'
})
export class TripBuilder implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tripService = inject(TripPlanningService);
  private readonly placeService = inject(PlaceService);
  private readonly mapsLoader = inject(GoogleMapsLoader);
  private readonly messageService = inject(MessageService);
  private readonly zone = inject(NgZone);

  private readonly mapCanvas = viewChild.required<ElementRef<HTMLDivElement>>('mapCanvas');

  readonly travelModeOptions: TravelModeOption[] = [
    { label: '開車', value: GoogleTravelMode.Drive },
    { label: '步行', value: GoogleTravelMode.Walk },
    { label: '腳踏車', value: GoogleTravelMode.Bicycle },
    { label: '機車（部分地區不支援）', value: GoogleTravelMode.TwoWheeler },
    { label: '大眾運輸', value: GoogleTravelMode.Transit }
  ];

  // ---------- 頁面狀態 ----------
  readonly loadingContext = signal(true);
  readonly pageError = signal<string | null>(null);
  readonly needsLogin = signal(false);

  readonly shoppingListId = signal<number | null>(null);
  readonly listName = signal<string | null>(null);
  readonly pendingItemCount = signal(0);
  readonly memberLocation = signal<LocationDto | null>(null);

  readonly origin = signal<Origin | null>(null);
  readonly locating = signal(false);
  readonly pickingOrigin = signal(false);
  readonly originChangedSincePreview = signal(false);

  readonly travelMode = signal<GoogleTravelMode>(GoogleTravelMode.Drive);
  readonly searchRadiusMeters = signal(3000);

  readonly previewing = signal(false);
  readonly preview = signal<PlanTripPreviewResult | null>(null);
  readonly stops = signal<ItineraryStop[]>([]);

  readonly searchQuery = signal('');
  readonly searching = signal(false);
  readonly searchResults = signal<PlaceDto[]>([]);

  readonly tripName = signal('');
  readonly confirming = signal(false);
  readonly savedTrip = signal<TripDto | null>(null);
  readonly hasUnsavedChanges = signal(false);

  readonly mapReady = signal(false);
  readonly mapError = signal<string | null>(null);

  // ---------- 衍生資料 ----------
  readonly candidates = computed(() => this.preview()?.candidates ?? []);

  // ---------- 候選店家分頁（資料一次拿完，換頁只在前端切片，不打 API） ----------
  readonly candidatePage = signal(1);

  readonly candidatePageCount = computed(() =>
    Math.max(1, Math.ceil(this.candidates().length / CANDIDATE_PAGE_SIZE))
  );

  readonly pagedCandidates = computed(() => {
    const start = (this.candidatePage() - 1) * CANDIDATE_PAGE_SIZE;
    return this.candidates().slice(start, start + CANDIDATE_PAGE_SIZE);
  });

  // 目前這頁是第幾筆到第幾筆（顯示「第 11–20 家」用）
  readonly candidateRange = computed(() => {
    const total = this.candidates().length;
    const start = (this.candidatePage() - 1) * CANDIDATE_PAGE_SIZE + 1;
    return { start, end: Math.min(start + CANDIDATE_PAGE_SIZE - 1, total) };
  });

  // 頁碼列：9 頁以內全部列出；超過就顯示 1 … 4 5 6 … 12（null 代表省略號）
  readonly candidatePageNumbers = computed<(number | null)[]>(() => {
    const total = this.candidatePageCount();
    const current = this.candidatePage();

    if (total <= 9) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | null)[] = [1];
    const from = Math.max(2, current - 1);
    const to = Math.min(total - 1, current + 1);

    if (from > 2) {
      pages.push(null);
    }
    for (let page = from; page <= to; page++) {
      pages.push(page);
    }
    if (to < total - 1) {
      pages.push(null);
    }
    pages.push(total);
    return pages;
  });

  readonly stopIds = computed(() => new Set(this.stops().map((s) => s.placeId)));

  private readonly coveredItemIds = computed(
    () => new Set(this.stops().flatMap((s) => s.matchedItemIds))
  );

  // 覆蓋率在前端即時計算：使用者加店、刪店不用再打 API
  readonly coveragePercent = computed(() => {
    const preview = this.preview();
    if (!preview || preview.totalItemCount === 0) {
      return 0;
    }

    const covered = this.coveredItemIds();
    const coveredCount = preview.items.filter((i) => covered.has(i.fShoppingListItemId)).length;
    return Math.round((coveredCount / preview.totalItemCount) * 100);
  });

  readonly uncoveredItemNames = computed(() => {
    const covered = this.coveredItemIds();
    return (this.preview()?.items ?? [])
      .filter((i) => !covered.has(i.fShoppingListItemId))
      .map((i) => i.fIngredientName);
  });

  // 行程已儲存且之後沒再改過，才提供匯出（確保分享出去的跟存檔的是同一份）
  readonly canShare = computed(
    () => !!this.savedTrip() && !this.hasUnsavedChanges() && this.stops().length > 0
  );

  // 每一站要買的品項：同一個品項有多家店買得到時，只列在順序最前面的那一站，避免重複買
  readonly shoppingPlan = computed(() => {
    const itemsById = new Map(
      (this.preview()?.items ?? []).map((item) => [item.fShoppingListItemId, item])
    );
    const assigned = new Set<number>();

    return this.stops().map((stop) => {
      const items: ShoppingListItemDto[] = [];
      for (const id of stop.matchedItemIds) {
        const item = itemsById.get(id);
        if (item && !assigned.has(id)) {
          assigned.add(id);
          items.push(item);
        }
      }
      return { stop, items };
    });
  });

  // ---------- 採買模式（checklist） ----------
  readonly shoppingMode = signal(false);
  readonly purchasedItemIds = signal<ReadonlySet<number>>(new Set<number>());

  // 沒有任何一站買得到的品項：列在清單最後，在別處買到一樣可以打勾
  readonly unassignedItems = computed(() => {
    const assigned = new Set(
      this.shoppingPlan().flatMap((group) => group.items.map((i) => i.fShoppingListItemId))
    );
    return (this.preview()?.items ?? []).filter((i) => !assigned.has(i.fShoppingListItemId));
  });

  readonly checklistTotal = computed(() => this.preview()?.items.length ?? 0);

  readonly checklistDone = computed(() => {
    const purchased = this.purchasedItemIds();
    return (this.preview()?.items ?? []).filter((i) => purchased.has(i.fShoppingListItemId)).length;
  });

  readonly checklistPercent = computed(() => {
    const total = this.checklistTotal();
    return total === 0 ? 0 : Math.round((this.checklistDone() / total) * 100);
  });

  readonly canConfirm = computed(
    () => this.stops().length > 0 && this.tripName().trim().length > 0 && !this.confirming()
  );

  // ---------- Google 地圖物件（不放進 signal） ----------
  private maps: GoogleMapsLibraries | null = null;
  private map: any = null;
  private infoWindow: any = null;
  private originMarker: any = null;
  private placeMarkers: any[] = [];
  private searchMarkers: any[] = [];
  private routeLines: any[] = [];
  private initialPreviewDone = false;

  constructor() {
    afterNextRender(() => {
      void this.initMap();
    });

    // 資料變動 → 重畫地圖（地圖還沒載入完成時先略過，載入完會再觸發一次）
    effect(() => {
      const origin = this.origin();
      if (this.mapReady()) {
        this.renderOrigin(origin);
      }
    });

    effect(() => {
      const candidates = this.candidates();
      const stops = this.stops();
      if (this.mapReady()) {
        this.renderPlaceMarkers(candidates, stops);
      }
    });

    effect(() => {
      const results = this.searchResults();
      if (this.mapReady()) {
        this.renderSearchMarkers(results);
      }
    });

    effect(() => {
      const origin = this.origin();
      const stops = this.stops();
      const savedTrip = this.savedTrip();
      const dirty = this.hasUnsavedChanges();
      if (this.mapReady()) {
        this.renderRoute(origin, stops, dirty ? null : savedTrip);
      }
    });
  }

  ngOnInit(): void {
    // 採買清單頁用 /trip-builder?shoppingListId=6 帶進來；沒帶就用自己目前的清單
    const raw = this.route.snapshot.queryParamMap.get('shoppingListId');
    const parsed = raw ? Number(raw) : NaN;
    this.loadContext(Number.isInteger(parsed) && parsed > 0 ? parsed : null);
  }

  // ---------- 初始化 ----------

  private loadContext(shoppingListId: number | null): void {
    this.loadingContext.set(true);

    this.tripService.getPlanningContext(shoppingListId).subscribe({
      next: (context) => {
        this.loadingContext.set(false);
        this.shoppingListId.set(context.shoppingListId);
        this.listName.set(context.listName);
        this.pendingItemCount.set(context.pendingItemCount);
        this.memberLocation.set(context.memberLocation);

        if (!context.shoppingListId) {
          this.pageError.set('還沒有採買清單，請先到「料理採購清單」加入食材並儲存。');
        } else if (context.pendingItemCount === 0) {
          this.pageError.set('這份採買清單沒有待採買的品項。');
        }

        this.resolveInitialOrigin();
      },
      error: (error: HttpErrorResponse) => {
        this.loadingContext.set(false);
        this.pageError.set(this.describeError(error));
        // 就算拿不到清單，地圖還是可以先顯示
        this.setOrigin({ ...DEFAULT_CENTER, label: '預設位置', source: 'default' });
      }
    });
  }

  // 起點優先順序：瀏覽器定位 → 會員地址 → 預設位置
  private resolveInitialOrigin(): void {
    const fallback = () => {
      const member = this.memberLocation();
      if (member) {
        this.setOrigin({
          lat: member.latitude,
          lng: member.longitude,
          label: member.address ?? '會員地址',
          source: 'member'
        });
      } else {
        this.setOrigin({ ...DEFAULT_CENTER, label: '預設位置（台北車站）', source: 'default' });
      }
      this.runInitialPreview();
    };

    if (!navigator.geolocation) {
      fallback();
      return;
    }

    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) =>
        this.zone.run(() => {
          this.locating.set(false);
          this.setOrigin({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: '目前位置',
            source: 'browser'
          });
          this.runInitialPreview();
        }),
      () =>
        this.zone.run(() => {
          this.locating.set(false);
          fallback();
        }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }

  private runInitialPreview(): void {
    if (this.initialPreviewDone || !this.shoppingListId() || this.pendingItemCount() === 0) {
      return;
    }

    this.initialPreviewDone = true;
    this.runPreview();
  }

  private async initMap(): Promise<void> {
    try {
      this.maps = await this.mapsLoader.load();
    } catch (error) {
      this.zone.run(() =>
        this.mapError.set(error instanceof Error ? error.message : 'Google 地圖載入失敗')
      );
      return;
    }

    const center = this.origin() ?? DEFAULT_CENTER;

    this.map = new this.maps.Map(this.mapCanvas().nativeElement, {
      center: { lat: center.lat, lng: center.lng },
      zoom: 14,
      mapId: GOOGLE_MAP_ID,
      clickableIcons: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    this.infoWindow = new this.maps.InfoWindow();
    this.map.addListener('click', (event: any) => this.zone.run(() => this.onMapClick(event)));

    this.zone.run(() => this.mapReady.set(true));
  }

  // ---------- 起點 ----------

  private setOrigin(origin: Origin): void {
    const previous = this.origin();
    this.origin.set(origin);

    if (this.preview() && previous && (previous.lat !== origin.lat || previous.lng !== origin.lng)) {
      this.originChangedSincePreview.set(true);
    }
  }

  useBrowserLocation(): void {
    if (!navigator.geolocation) {
      this.toast('warn', '無法定位', '這個瀏覽器不支援定位功能。');
      return;
    }

    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) =>
        this.zone.run(() => {
          this.locating.set(false);
          this.setOrigin({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: '目前位置',
            source: 'browser'
          });
        }),
      () =>
        this.zone.run(() => {
          this.locating.set(false);
          this.toast('warn', '無法取得目前位置', '請確認瀏覽器已允許定位，或改用會員地址、在地圖上點選。');
        }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useMemberLocation(): void {
    const member = this.memberLocation();
    if (!member) {
      this.toast('info', '沒有會員地址', '會員資料沒有填寫地址，或地址無法轉換成位置。');
      return;
    }

    this.setOrigin({
      lat: member.latitude,
      lng: member.longitude,
      label: member.address ?? '會員地址',
      source: 'member'
    });
  }

  togglePickOrigin(): void {
    this.pickingOrigin.update((value) => !value);
    if (this.pickingOrigin()) {
      this.toast('info', '選擇起點', '在地圖上點一下，設定為出發位置。');
    }
  }

  private onMapClick(event: any): void {
    const latLng = event?.latLng;
    if (!latLng) {
      return;
    }

    if (this.pickingOrigin()) {
      event.stop?.();
      this.pickingOrigin.set(false);
      this.setOrigin({ lat: latLng.lat(), lng: latLng.lng(), label: '地圖上選取的位置', source: 'map' });
      return;
    }

    // 點到地圖上的店家圖示（POI）：event 會帶 placeId
    if (event.placeId) {
      event.stop?.();
      this.showGooglePlace(event.placeId, latLng);
    }
  }

  // ---------- 規劃（預覽，不存檔） ----------

  runPreview(): void {
    const shoppingListId = this.shoppingListId();
    const origin = this.origin();

    if (!shoppingListId) {
      this.toast('warn', '沒有採買清單', '請先到「料理採購清單」儲存清單。');
      return;
    }
    if (!origin) {
      this.toast('warn', '還沒有起點', '請先設定出發位置。');
      return;
    }

    this.previewing.set(true);

    this.tripService
      .previewTrip({
        shoppingListId,
        originLatitude: Number(origin.lat.toFixed(7)),
        originLongitude: Number(origin.lng.toFixed(7)),
        travelMode: this.travelMode(),
        searchRadiusMeters: this.searchRadiusMeters()
      })
      .subscribe({
        next: (result) => {
          this.previewing.set(false);
          this.preview.set(result);
          this.candidatePage.set(1); // 重新規劃後候選清單換了，回到第 1 頁
          this.purchasedItemIds.set(new Set<number>()); // 預覽只含還沒買的品項，勾選狀態重新開始
          this.shoppingMode.set(false);
          this.originChangedSincePreview.set(false);
          this.savedTrip.set(null);
          this.hasUnsavedChanges.set(false);

          const suggested = result.candidates
            .filter((c) => c.isSuggested)
            .sort((a, b) => (a.suggestedOrder ?? 0) - (b.suggestedOrder ?? 0))
            .map((c) => this.candidateToStop(c));

          this.stops.set(suggested);

          if (!this.tripName().trim()) {
            this.tripName.set(`${result.listName || '採買'}行程`);
          }

          if (suggested.length === 0) {
            this.toast('warn', '找不到合適的店家', '附近沒有能買到清單品項的店家，試著放大搜尋半徑。');
          }

          this.fitMapToPlan();
        },
        error: (error: HttpErrorResponse) => {
          this.previewing.set(false);
          this.toast('error', '規劃失敗', this.describeError(error));
        }
      });
  }

  // ---------- 行程編輯 ----------

  isInItinerary(placeId: number): boolean {
    return this.stopIds().has(placeId);
  }

  goToCandidatePage(page: number): void {
    const target = Math.min(Math.max(1, page), this.candidatePageCount());
    this.candidatePage.set(target);
  }

  toggleCandidate(candidate: TripCandidateDto): void {
    if (this.isInItinerary(candidate.fPlaceId)) {
      this.removeStop(candidate.fPlaceId);
    } else {
      this.addStop(this.candidateToStop(candidate));
    }
  }

  addStop(stop: ItineraryStop): void {
    if (this.isInItinerary(stop.placeId)) {
      return;
    }

    this.stops.update((stops) => [...stops, stop]);
    this.markDirty();
  }

  removeStop(placeId: number): void {
    this.stops.update((stops) => stops.filter((s) => s.placeId !== placeId));
    this.markDirty();
  }

  onDrop(event: CdkDragDrop<ItineraryStop[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const reordered = [...this.stops()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.stops.set(reordered);
    this.markDirty();
  }

  focusCandidate(candidate: TripCandidateDto): void {
    this.focusStop(this.candidateToStop(candidate));
  }

  focusStop(stop: ItineraryStop): void {
    this.map?.panTo({ lat: stop.lat, lng: stop.lng });
    this.openPlaceInfo(stop, null);
  }

  private markDirty(): void {
    if (this.savedTrip()) {
      this.hasUnsavedChanges.set(true);
    }
  }

  // ---------- 搜尋地點 ----------

  searchPlaces(): void {
    const query = this.searchQuery().trim();
    if (!query) {
      this.searchResults.set([]);
      return;
    }

    const center = this.map?.getCenter?.();
    const origin = this.origin();

    this.searching.set(true);
    this.placeService
      .searchPlaces({
        query,
        latitude: center ? center.lat() : origin?.lat ?? null,
        longitude: center ? center.lng() : origin?.lng ?? null,
        radiusMeters: Math.max(this.searchRadiusMeters(), 5000)
      })
      .subscribe({
        next: (results) => {
          this.searching.set(false);
          this.searchResults.set(results);

          if (results.length === 0) {
            this.toast('info', '查無結果', `找不到「${query}」相關的地點。`);
          } else {
            this.fitToPoints(results.map((r) => ({ lat: r.fLatitude, lng: r.fLongitude })));
          }
        },
        error: (error: HttpErrorResponse) => {
          this.searching.set(false);
          this.toast('error', '搜尋失敗', this.describeError(error));
        }
      });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  focusSearchResult(place: PlaceDto): void {
    this.map?.panTo({ lat: place.fLatitude, lng: place.fLongitude });
    this.openPlaceInfo(this.placeToStop(place), null);
  }

  // 搜尋結果、地圖上點選的店家加入行程：還沒存進 tFoodMapPlace 的先 resolve 拿 fPlaceId
  addPlace(place: PlaceDto): void {
    if (place.fPlaceId > 0) {
      this.addStop(this.placeToStop(place));
      return;
    }

    if (!place.fGooglePlaceId) {
      return;
    }

    this.placeService.resolvePlace({ fGooglePlaceId: place.fGooglePlaceId }).subscribe({
      next: (resolved) => this.addStop(this.placeToStop(resolved)),
      error: (error: HttpErrorResponse) => this.toast('error', '無法加入', this.describeError(error))
    });
  }

  private showGooglePlace(googlePlaceId: string, latLng: any): void {
    if (!this.infoWindow) {
      return;
    }

    const loading = document.createElement('div');
    loading.textContent = '讀取店家資料中…';
    this.infoWindow.setContent(loading);
    this.infoWindow.setPosition(latLng);
    this.infoWindow.open({ map: this.map });

    this.placeService.resolvePlace({ fGooglePlaceId: googlePlaceId }).subscribe({
      next: (place) => this.openPlaceInfo(this.placeToStop(place), null),
      error: (error: HttpErrorResponse) => {
        loading.textContent = this.describeError(error);
      }
    });
  }

  // ---------- 確認儲存（這時才寫進資料庫） ----------

  confirmTrip(): void {
    const stops = this.stops();
    const name = this.tripName().trim();

    if (stops.length === 0 || !name) {
      this.toast('warn', '還不能儲存', '請至少加入一個地點，並輸入行程名稱。');
      return;
    }

    this.confirming.set(true);

    this.tripService
      .confirmTrip({
        fTripName: name,
        shoppingListId: this.shoppingListId(),
        travelMode: this.travelMode(),
        places: stops.map((s, index) => ({
          fPlaceID: s.placeId,
          fSortOrder: index + 1,
          fPlaceCategoryId: s.placeCategoryId
        }))
      })
      .subscribe({
        next: (result) => {
          this.confirming.set(false);
          this.savedTrip.set(result.trip);
          this.hasUnsavedChanges.set(false);
          this.toast('success', '行程已儲存', `「${result.trip.fTripName}」已加入你的行程。`);

          if (stops.length > 1 && result.trip.routes.length === 0) {
            this.toast('warn', '路線暫時無法取得', '行程已儲存，但 Google 路線服務沒有回應，地圖先顯示直線距離。');
          }

          this.fitMapToPlan();
        },
        error: (error: HttpErrorResponse) => {
          this.confirming.set(false);
          this.toast('error', '儲存失敗', this.describeError(error));
        }
      });
  }

  // ---------- 採買模式（checklist） ----------

  isPurchased(itemId: number): boolean {
    return this.purchasedItemIds().has(itemId);
  }

  // 先在畫面上打勾，再寫回資料庫；寫入失敗就還原
  togglePurchased(item: ShoppingListItemDto, checked: boolean): void {
    const itemId = item.fShoppingListItemId;
    this.applyPurchased(itemId, checked);

    this.tripService.setItemPurchased(itemId, checked).subscribe({
      error: (error: HttpErrorResponse) => {
        this.applyPurchased(itemId, !checked);
        this.toast('error', '沒有存到', `「${item.fIngredientName}」${this.describeError(error)}`);
      }
    });
  }

  stopNavigationUrl(stop: ItineraryStop): string {
    return this.buildStopUrl(stop, true);
  }

  private applyPurchased(itemId: number, purchased: boolean): void {
    const current = this.purchasedItemIds();
    if (current.has(itemId) === purchased) {
      return;
    }

    const next = new Set(current);
    if (purchased) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }
    this.purchasedItemIds.set(next);

    // 頁首的「待採買 N 項」跟著更新
    this.pendingItemCount.update((count) => Math.max(0, count + (purchased ? -1 : 1)));
  }

  // ---------- 匯出、分享 ----------

  // 用手機或新分頁開啟 Google 地圖導航（不帶起點，Google 會用開啟者目前的位置出發）
  openNavigation(): void {
    const url = this.buildNavigationUrl();
    if (!url) {
      return;
    }

    if (this.navigationIsPartial()) {
      this.toast('info', '導航只到第一站', '大眾運輸的導航不支援多個停靠點，其餘店家請看複製出來的行程文字。');
    }

    window.open(url, '_blank', 'noopener');
  }

  // 把行程（每站店名、地址、要買的品項、導航連結）複製成文字，可直接貼到 LINE
  async copyTripText(): Promise<void> {
    const text = this.buildTripText();

    try {
      await navigator.clipboard.writeText(text);
      this.toast('success', '已複製行程', '貼到 LINE 或訊息裡就能分享給代買的人。');
    } catch {
      // 非 https 或瀏覽器不允許時的備用做法
      const area = document.createElement('textarea');
      area.value = text;
      area.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(area);

      if (copied) {
        this.toast('success', '已複製行程', '貼到 LINE 或訊息裡就能分享給代買的人。');
      } else {
        this.toast('error', '複製失敗', '瀏覽器不允許存取剪貼簿，請改用「開啟導航」後自行分享。');
      }
    }
  }

  // 大眾運輸不支援中途點：多站行程的導航連結只能導到第一站
  private navigationIsPartial(): boolean {
    return this.travelMode() === GoogleTravelMode.Transit && this.stops().length > 1;
  }

  // Google Maps URLs：https://developers.google.com/maps/documentation/urls/get-started#directions-action
  private buildNavigationUrl(): string | null {
    const stops = this.stops();
    if (stops.length === 0) {
      return null;
    }

    if (this.navigationIsPartial()) {
      return this.buildStopUrl(stops[0], true);
    }

    const destination = stops[stops.length - 1];
    // 超過上限時保留前 9 個中途點；終點不變
    const waypoints = stops.slice(0, -1).slice(0, MAX_NAVIGATION_WAYPOINTS);

    const params = new URLSearchParams({
      api: '1',
      destination: `${destination.lat},${destination.lng}`,
      travelmode: NAVIGATION_TRAVEL_MODE[this.travelMode()]
    });

    if (destination.googlePlaceId) {
      params.set('destination_place_id', destination.googlePlaceId);
    }

    if (waypoints.length > 0) {
      params.set('waypoints', waypoints.map((s) => `${s.lat},${s.lng}`).join('|'));

      // 地點 ID 要跟 waypoints 一對一，有任何一站沒有就整組不帶
      if (waypoints.every((s) => !!s.googlePlaceId)) {
        params.set('waypoint_place_ids', waypoints.map((s) => s.googlePlaceId).join('|'));
      }
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  // 單一店家的連結：導航到這一站，或只在地圖上顯示這家店
  private buildStopUrl(stop: ItineraryStop, navigate: boolean): string {
    if (navigate) {
      const params = new URLSearchParams({
        api: '1',
        destination: `${stop.lat},${stop.lng}`,
        travelmode: NAVIGATION_TRAVEL_MODE[this.travelMode()]
      });
      if (stop.googlePlaceId) {
        params.set('destination_place_id', stop.googlePlaceId);
      }
      return `https://www.google.com/maps/dir/?${params.toString()}`;
    }

    const params = new URLSearchParams({ api: '1', query: `${stop.lat},${stop.lng}` });
    if (stop.googlePlaceId) {
      params.set('query_place_id', stop.googlePlaceId);
    }
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }

  private buildTripText(): string {
    const plan = this.shoppingPlan();
    const name = this.savedTrip()?.fTripName || this.tripName().trim() || '採買行程';
    const perStopLinks = this.navigationIsPartial();
    const lines: string[] = [`🛒 ${name}（${plan.length} 站）`, ''];

    plan.forEach(({ stop, items }, index) => {
      lines.push(`${index + 1}. ${stop.name}`);
      if (stop.address) {
        lines.push(`   ${stop.address}`);
      }
      for (const item of items) {
        lines.push(`   □ ${this.formatItem(item)}`);
      }
      if (perStopLinks) {
        lines.push(`   導航：${this.buildStopUrl(stop, true)}`);
      }
      lines.push('');
    });

    const uncovered = this.uncoveredItemNames();
    if (uncovered.length > 0) {
      lines.push(`附近買不到：${uncovered.join('、')}`, '');
    }

    if (!perStopLinks) {
      lines.push(`整趟導航：${this.buildNavigationUrl()}`);
      if (plan.length - 1 > MAX_NAVIGATION_WAYPOINTS) {
        lines.push(`（導航連結最多 ${MAX_NAVIGATION_WAYPOINTS + 1} 站，其餘店家請依上面的順序自行前往）`);
      }
    }

    return lines.join('\n').trimEnd();
  }

  formatItem(item: ShoppingListItemDto): string {
    const quantity = item.fQuantity != null ? ` ${item.fQuantity}${item.fUnit ?? ''}` : '';
    return `${item.fIngredientName}${quantity}`;
  }

  // ---------- 顯示用 ----------

  formatDistance(meters: number | null | undefined): string {
    if (meters == null) {
      return '';
    }
    return meters < 1000 ? `${Math.round(meters)} 公尺` : `${(meters / 1000).toFixed(1)} 公里`;
  }

  formatDuration(seconds: number | null | undefined): string {
    if (seconds == null) {
      return '';
    }
    const minutes = Math.max(1, Math.round(seconds / 60));
    return minutes < 60 ? `${minutes} 分鐘` : `${Math.floor(minutes / 60)} 小時 ${minutes % 60} 分`;
  }

  // 已儲存行程裡，「前一站 → 這一站」的路線資料
  legToStop(index: number): { distance: string; duration: string } | null {
    const trip = this.savedTrip();
    if (!trip || this.hasUnsavedChanges() || index === 0) {
      return null;
    }

    const toTripPlaceId = trip.places[index]?.fTripPlaceId;
    const leg = trip.routes.find((r) => r.fToTripPlaceId === toTripPlaceId);
    return leg
      ? { distance: this.formatDistance(leg.fDistanceMeters), duration: this.formatDuration(leg.fDurationSeconds) }
      : null;
  }

  // ---------- 地圖繪製 ----------

  private renderOrigin(origin: Origin | null): void {
    if (!this.maps || !this.map) {
      return;
    }

    if (this.originMarker) {
      this.originMarker.map = null;
      this.originMarker = null;
    }

    if (!origin) {
      return;
    }

    this.originMarker = new this.maps.AdvancedMarkerElement({
      map: this.map,
      position: { lat: origin.lat, lng: origin.lng },
      title: `起點：${origin.label}`,
      content: this.createPin('起', ORIGIN_COLOR, '#ffffff', 34),
      zIndex: 1000
    });

    this.map.panTo({ lat: origin.lat, lng: origin.lng });
  }

  private renderPlaceMarkers(candidates: TripCandidateDto[], stops: ItineraryStop[]): void {
    if (!this.maps || !this.map) {
      return;
    }

    this.placeMarkers.forEach((marker) => (marker.map = null));
    this.placeMarkers = [];

    const orderByPlaceId = new Map(stops.map((s, index) => [s.placeId, index + 1]));

    for (const candidate of candidates) {
      const order = orderByPlaceId.get(candidate.fPlaceId);
      const stop = this.candidateToStop(candidate);
      const pin = order
        ? this.createPin(String(order), BRAND_COLOR, '#ffffff', 30)
        : this.createPin(candidate.isRecommend ? '★' : '', '#ffffff', BRAND_COLOR, 20);

      this.placeMarkers.push(this.createMarker(stop, pin, order ? 500 : 100));
    }

    // 從搜尋、地圖點選加入、但不在候選清單裡的站點也要畫出來
    const candidateIds = new Set(candidates.map((c) => c.fPlaceId));
    stops
      .filter((s) => !candidateIds.has(s.placeId))
      .forEach((stop) => {
        const pin = this.createPin(String(orderByPlaceId.get(stop.placeId)), BRAND_COLOR, '#ffffff', 30);
        this.placeMarkers.push(this.createMarker(stop, pin, 500));
      });
  }

  private renderSearchMarkers(results: PlaceDto[]): void {
    if (!this.maps || !this.map) {
      return;
    }

    this.searchMarkers.forEach((marker) => (marker.map = null));
    this.searchMarkers = results.map((place) =>
      this.createMarker(this.placeToStop(place), this.createPin('搜', SEARCH_COLOR, '#ffffff', 24), 300)
    );
  }

  private renderRoute(origin: Origin | null, stops: ItineraryStop[], savedTrip: TripDto | null): void {
    if (!this.maps || !this.map) {
      return;
    }

    this.routeLines.forEach((line) => line.setMap(null));
    this.routeLines = [];

    if (stops.length === 0) {
      return;
    }

    const dashed = {
      strokeOpacity: 0,
      icons: [
        {
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: BRAND_COLOR, scale: 3 },
          offset: '0',
          repeat: '14px'
        }
      ]
    };

    // 起點 → 第一站：Google 路線只算店家之間，這段用虛線表示
    if (origin) {
      this.routeLines.push(
        new this.maps.Polyline({
          map: this.map,
          path: [{ lat: origin.lat, lng: origin.lng }, { lat: stops[0].lat, lng: stops[0].lng }],
          ...dashed
        })
      );
    }

    const polylines = savedTrip?.routes.map((r) => r.fPolyline).filter((p): p is string => !!p) ?? [];

    if (polylines.length > 0) {
      // 已儲存且算好路線：畫 Google 回傳的實際道路路線
      for (const encoded of polylines) {
        this.routeLines.push(
          new this.maps.Polyline({
            map: this.map,
            path: this.maps.encoding.decodePath(encoded),
            strokeColor: BRAND_COLOR,
            strokeOpacity: 0.85,
            strokeWeight: 5
          })
        );
      }
      return;
    }

    // 預覽中：先用直線連起來（不花 Routes API 費用），按下確認儲存後才換成實際路線
    if (stops.length > 1) {
      this.routeLines.push(
        new this.maps.Polyline({
          map: this.map,
          path: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
          ...dashed
        })
      );
    }
  }

  private createMarker(stop: ItineraryStop, content: HTMLElement, zIndex: number): any {
    const marker = new this.maps!.AdvancedMarkerElement({
      map: this.map,
      position: { lat: stop.lat, lng: stop.lng },
      title: stop.name,
      content,
      zIndex
    });

    marker.addListener('click', () => this.zone.run(() => this.openPlaceInfo(stop, marker)));
    return marker;
  }

  // 標記外觀（地圖元素不在 Angular 樣板裡，元件 CSS 套不到，所以用 inline style）
  private createPin(text: string, background: string, color: string, size: number): HTMLElement {
    const pin = document.createElement('div');
    pin.textContent = text;
    pin.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      'border-radius:50%',
      `background:${background}`,
      `color:${color}`,
      `border:2px solid ${background === '#ffffff' ? color : '#ffffff'}`,
      'box-shadow:0 2px 6px rgba(0,0,0,.3)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      `font:700 ${Math.round(size * 0.45)}px/1 sans-serif`,
      'cursor:pointer'
    ].join(';');
    return pin;
  }

  private openPlaceInfo(stop: ItineraryStop, anchor: any): void {
    if (!this.infoWindow) {
      return;
    }

    const root = document.createElement('div');
    root.style.cssText = 'max-width:240px;font-size:13px;line-height:1.5;color:#261814';

    const title = document.createElement('strong');
    title.textContent = stop.name;
    title.style.cssText = 'display:block;font-size:14px;margin-bottom:2px';
    root.appendChild(title);

    const lines: string[] = [];
    if (stop.address) {
      lines.push(stop.address);
    }
    if (stop.rating != null) {
      lines.push(`Google 評分 ★ ${stop.rating}`);
    }
    if (stop.isRecommend) {
      lines.push('平台推薦店家');
    }
    if (this.preview()) {
      lines.push(
        stop.matchedItemNames.length > 0
          ? `可買到：${stop.matchedItemNames.join('、')}`
          : '清單中的品項在這裡可能買不到'
      );
    }

    for (const text of lines) {
      const line = document.createElement('div');
      line.textContent = text;
      line.style.color = '#6d5a51';
      root.appendChild(line);
    }

    const inItinerary = this.isInItinerary(stop.placeId);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = inItinerary ? '移出行程' : '加入行程';
    button.style.cssText = `margin-top:8px;padding:4px 12px;border:0;border-radius:6px;cursor:pointer;color:#fff;background:${inItinerary ? '#6d5a51' : BRAND_COLOR}`;
    button.addEventListener('click', () =>
      this.zone.run(() => {
        if (this.isInItinerary(stop.placeId)) {
          this.removeStop(stop.placeId);
        } else if (stop.placeId > 0) {
          this.addStop(stop);
        } else if (stop.googlePlaceId) {
          this.addPlace(this.stopToPlace(stop));
        }
        this.infoWindow.close();
      })
    );
    root.appendChild(button);

    this.infoWindow.setContent(root);

    if (anchor) {
      this.infoWindow.open({ map: this.map, anchor });
    } else {
      this.infoWindow.setPosition({ lat: stop.lat, lng: stop.lng });
      this.infoWindow.open({ map: this.map });
    }
  }

  private fitMapToPlan(): void {
    const origin = this.origin();
    const points = this.stops().map((s) => ({ lat: s.lat, lng: s.lng }));
    if (origin) {
      points.push({ lat: origin.lat, lng: origin.lng });
    }
    this.fitToPoints(points);
  }

  private fitToPoints(points: { lat: number; lng: number }[]): void {
    if (!this.maps || !this.map || points.length === 0) {
      return;
    }

    if (points.length === 1) {
      this.map.panTo(points[0]);
      return;
    }

    const bounds = new this.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    this.map.fitBounds(bounds, 60);
  }

  // ---------- 資料轉換 ----------

  private candidateToStop(candidate: TripCandidateDto): ItineraryStop {
    return {
      placeId: candidate.fPlaceId,
      googlePlaceId: candidate.fGooglePlaceId,
      name: candidate.fName,
      address: candidate.fAddress,
      lat: candidate.fLatitude,
      lng: candidate.fLongitude,
      placeCategoryId: candidate.fPlaceCategoryId,
      rating: candidate.fGoogleRating,
      isRecommend: candidate.isRecommend,
      matchedItemIds: candidate.matchedItemIds,
      matchedItemNames: candidate.matchedItemNames
    };
  }

  // 搜尋 / 地圖點選的店家：如果剛好也是候選店家，沿用候選店家算好的可購買品項
  private placeToStop(place: PlaceDto): ItineraryStop {
    const candidate = place.fPlaceId > 0
      ? this.candidates().find((c) => c.fPlaceId === place.fPlaceId)
      : this.candidates().find((c) => !!place.fGooglePlaceId && c.fGooglePlaceId === place.fGooglePlaceId);

    if (candidate) {
      return this.candidateToStop(candidate);
    }

    return {
      placeId: place.fPlaceId,
      googlePlaceId: place.fGooglePlaceId ?? null,
      name: place.fName,
      address: place.fAddress,
      lat: place.fLatitude,
      lng: place.fLongitude,
      placeCategoryId: place.fPlaceCategoryId ?? null,
      rating: place.fGoogleRating ?? null,
      isRecommend: place.fIsRecommend ?? false,
      matchedItemIds: [],
      matchedItemNames: []
    };
  }

  private stopToPlace(stop: ItineraryStop): PlaceDto {
    return {
      fPlaceId: stop.placeId,
      fGooglePlaceId: stop.googlePlaceId,
      fName: stop.name,
      fAddress: stop.address,
      fLatitude: stop.lat,
      fLongitude: stop.lng,
      fGoogleRating: stop.rating,
      fIsRecommend: stop.isRecommend
    };
  }

  private describeError(error: HttpErrorResponse): string {
    if (error.status === 401) {
      this.needsLogin.set(true);
      return '請先登入後再使用美食地圖。';
    }
    if (error.status === 0) {
      return '無法連線到伺服器，請確認後端 API 已啟動。';
    }

    const message = error.error?.message;
    if (typeof message === 'string' && message) {
      return message;
    }

    // [ApiController] 自動驗證失敗時回傳的格式：{ errors: { 欄位: [訊息] } }
    const errors = error.error?.errors;
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors as Record<string, string[]>)[0]?.[0];
      if (first) {
        return first;
      }
    }

    return '發生錯誤，請稍後再試。';
  }

  private toast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }
}

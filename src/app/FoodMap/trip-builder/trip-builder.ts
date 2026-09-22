import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import { PlaceService } from './services/placeservice';
import { TripService } from './services/tripservice';
import { NearbyResponse, PlaceDto } from './models/place-model';
import { TripDto } from './models/trip-model';

interface SelectedPlace {
  placeId: number;
  name: string;
  sortOrder: number;
}

@Component({
  selector: 'app-trip-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputNumberModule,
    InputTextModule,
    TagModule
  ],
  templateUrl: './trip-builder.html',
  styleUrl: './trip-builder.css'
})
export class TripBuilder {
  // ── Step 1：座標 ──
  latitude: number | null = null;
  longitude: number | null = null;
  readonly locationError = signal<string | null>(null);

  // ── Step 2：搜尋附近店家 ──
  readonly isSearching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly searchResult = signal<NearbyResponse | null>(null);

  // 已經 resolve 過的店家，用 googlePlaceId 當 Key 避免重複呼叫 API。
  private readonly resolvedPlaceIds = new Map<string, number>();
  readonly resolvingGooglePlaceId = signal<string | null>(null);

  // ── Step 3：組行程 ──
  tripName = '';
  readonly selectedPlaces = signal<SelectedPlace[]>([]);
  readonly isCreatingTrip = signal(false);
  readonly createTripError = signal<string | null>(null);
  readonly createdTrip = signal<TripDto | null>(null);

  constructor(
    private readonly placeService: PlaceService,
    private readonly tripService: TripService
  ) {}

  // 用瀏覽器內建 Geolocation 拿目前座標，不需要額外的 Google API。
  useCurrentLocation(): void {
    this.locationError.set(null);

    if (!navigator.geolocation) {
      this.locationError.set('這個瀏覽器不支援定位功能。');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
      },
      () => {
        this.locationError.set('無法取得目前位置，請手動輸入經緯度測試。');
      }
    );
  }

  // 後端內部本身就會先查 1km，不夠再自動擴大到 3km，
  // 這裡只負責把結果跟 expandedSearch 旗標顯示出來。
  search(): void {
    if (this.latitude == null || this.longitude == null) {
      this.searchError.set('請先取得或輸入經緯度。');
      return;
    }

    this.isSearching.set(true);
    this.searchError.set(null);
    this.searchResult.set(null);

    this.placeService
      .getNearbyPlaces({
        fLatitude: this.latitude,
        fLongitude: this.longitude
      })
      .subscribe({
        next: (response) => {
          console.log('nearby 原始回應：', response); // 先確認欄位名稱對不對，測試穩定後可拿掉
          this.isSearching.set(false);
          this.searchResult.set(response);
        },
        error: (err) => {
          this.isSearching.set(false);
          this.searchError.set(
            err?.error?.message ?? '搜尋失敗，請稍後再試。'
          );
        }
      });
  }

  addPlaceToTrip(place: PlaceDto): void {
    if (place.fPlaceId > 0) {
      this.pushSelectedPlace(place.fPlaceId, place.fName);
      return;
    }

    if (!place.fGooglePlaceId) {
      this.createTripError.set('這筆店家資料缺少 GooglePlaceID，無法加入行程。');
      return;
    }

    const cached = this.resolvedPlaceIds.get(place.fGooglePlaceId);
    if (cached != null) {
      this.pushSelectedPlace(cached, place.fName);
      return;
    }

    this.resolvingGooglePlaceId.set(place.fGooglePlaceId);

    this.placeService
      .resolvePlace({
        googlePlaceId: place.fGooglePlaceId,
        categoryId: 1 // ⚠️ 先寫死，之後對照實際的分類來源調整
      })
      .subscribe({
        next: (placeId) => {
          this.resolvingGooglePlaceId.set(null);
          this.resolvedPlaceIds.set(place.fGooglePlaceId!, placeId);
          this.pushSelectedPlace(placeId, place.fName);
        },
        error: (err) => {
          this.resolvingGooglePlaceId.set(null);
          this.createTripError.set(
            err?.error?.message ?? '無法收錄這間店，請稍後再試。'
          );
        }
      });
  }

  private pushSelectedPlace(placeId: number, name: string): void {
    const current = this.selectedPlaces();

    if (current.some((p) => p.placeId === placeId)) {
      return;
    }

    this.selectedPlaces.set([
      ...current,
      { placeId, name, sortOrder: current.length + 1 }
    ]);
  }

  removePlace(placeId: number): void {
    const remaining = this.selectedPlaces()
      .filter((p) => p.placeId !== placeId)
      .map((p, index) => ({ ...p, sortOrder: index + 1 }));

    this.selectedPlaces.set(remaining);
  }

  createTrip(): void {
    if (!this.tripName.trim()) {
      this.createTripError.set('請輸入行程名稱。');
      return;
    }

    if (this.selectedPlaces().length === 0) {
      this.createTripError.set('請至少選一間店加入行程。');
      return;
    }

    this.isCreatingTrip.set(true);
    this.createTripError.set(null);

    this.tripService
      .createTrip({
        name: this.tripName,
        places: this.selectedPlaces().map((p) => ({
          placeId: p.placeId,
          sortOrder: p.sortOrder
        }))
      })
      .subscribe({
        next: (trip) => {
          this.isCreatingTrip.set(false);
          this.createdTrip.set(trip);
        },
        error: (err) => {
          this.isCreatingTrip.set(false);
          this.createTripError.set(
            err?.error?.message ?? '建立行程失敗，請稍後再試。'
          );
        }
      });
  }
}

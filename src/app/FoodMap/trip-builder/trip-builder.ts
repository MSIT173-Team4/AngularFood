import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GoogleTravelMode, TripPlaceDto } from './models/trip-model';
import { TripPlanningService } from './services/tripservice';

interface TravelModeOption {
  label: string;
  value: GoogleTravelMode;
}

@Component({
  selector: 'app-trip-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    ButtonModule,
    CardModule,
    InputNumberModule,
    SelectModule,
    ProgressBarModule,
    TagModule,
    DividerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './trip-builder.html',
  styleUrl: './trip-builder.css'
})
export class TripBuilder {
  private tripPlanningService = inject(TripPlanningService);
  private messageService = inject(MessageService);

  // 搜尋條件（左欄）
  shoppingListId = 6; // 測試用清單 ID，實際串接時應從使用者選擇的採買清單帶入
  originLatitude = 25.07;
  originLongitude = 121.57;
  searchRadiusMeters = 3000;

  travelModeOptions: TravelModeOption[] = [
    { label: '開車', value: GoogleTravelMode.Drive },
    { label: '走路', value: GoogleTravelMode.Walk },
    { label: '騎自行車', value: GoogleTravelMode.Bicycle },
    { label: '機車/二輪車', value: GoogleTravelMode.TwoWheeler },
    { label: '大眾運輸', value: GoogleTravelMode.Transit }
  ];
  selectedTravelMode: GoogleTravelMode = GoogleTravelMode.Drive;

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // 結果（中欄路線預覽 + 右欄行程列表共用同一份資料）
  tripId = signal<number | null>(null);
  tripPlaces = signal<TripPlaceDto[]>([]);
  tripName = signal<string | null>(null);
  finalCoveragePercentage = signal(0);
  uncoveredItemNames = signal<string[]>([]);

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.messageService.add({
        severity: 'warn',
        summary: '不支援定位',
        detail: '這個瀏覽器不支援定位功能，請手動輸入經緯度。'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.originLatitude = position.coords.latitude;
        this.originLongitude = position.coords.longitude;
      },
      () => {
        this.messageService.add({
          severity: 'warn',
          summary: '無法取得目前位置',
          detail: '請手動輸入經緯度測試。'
        });
      }
    );
  }

  planTrip(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tripPlanningService
      .planTrip({
        shoppingListId: this.shoppingListId,
        originLatitude: this.originLatitude,
        originLongitude: this.originLongitude,
        travelMode: this.selectedTravelMode,
        searchRadiusMeters: this.searchRadiusMeters
      })
      .subscribe({
        next: (result: { trip: { fTripId: number | null; fTripName: string | null; places: TripPlaceDto[]; }; finalCoveragePercentage: number; uncoveredItemNames: string[]; }) => {
          this.tripId.set(result.trip.fTripId);
          this.tripName.set(result.trip.fTripName);
          this.tripPlaces.set(result.trip.places);
          this.finalCoveragePercentage.set(result.finalCoveragePercentage);
          this.uncoveredItemNames.set(result.uncoveredItemNames);
          this.loading.set(false);
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set(
            error?.error?.message ?? '規劃行程失敗，請確認 API 是否正常啟動、Token 是否有效。'
          );
          this.loading.set(false);
        }
      });
  }

  // 對應截圖右欄「行程列表」的拖曳排序。
  // 目前只做本地排序（樂觀更新），因為後端 /reorder 端點還沒做（規格 E 節），
  // 呼叫失敗只印警告，不擋住使用者操作。
  onDrop(event: CdkDragDrop<TripPlaceDto[]>): void {
    const reordered = [...this.tripPlaces()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    const withUpdatedSortOrder = reordered.map((place, index) => ({
      ...place,
      fSortOrder: index + 1
    }));

    this.tripPlaces.set(withUpdatedSortOrder);

    const tripId = this.tripId();
    if (!tripId) {
      return; // 還沒建立行程（tripId 是 null），沒有東西可以同步
    }

    this.tripPlanningService
      .reorderTripPlaces(
        tripId,
        withUpdatedSortOrder.map((p) => ({
          placeId: p.fPlaceId,
          sortOrder: p.fSortOrder
        }))
      )
      .subscribe({
        next: () => { },
        error: (error) => {
          // 預期後端這支還沒做，404 是正常現象，不跳錯誤訊息擋住使用者
          console.warn('reorder 同步失敗（後端 E 節尚未完成，屬預期行為）：', error);
        }
      });
  }

  formatCoveragePercentage(): number {
    return Math.round(this.finalCoveragePercentage() * 100);
  }
}

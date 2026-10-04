import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api-config';
import {
  ConfirmTripRequest,
  PlanningContext,
  PlanTripPreviewResult,
  PlanTripRequest,
  PlanTripResult,
  TripDto
} from '../models/trip-model';

// 後端用 token cookie 驗證身分，跨網域（4200 → 7164）一定要帶 withCredentials 才會送出 cookie
const withCredentials = { withCredentials: true } as const;

@Injectable({ providedIn: 'root' })
export class TripPlanningService {
  private readonly http = inject(HttpClient);

  // 進頁面：要規劃哪份清單（沒帶 ID 就用自己目前的清單）＋會員地址座標
  getPlanningContext(shoppingListId: number | null): Observable<PlanningContext> {
    let params = new HttpParams();
    if (shoppingListId) {
      params = params.set('shoppingListId', shoppingListId);
    }

    return this.http.get<PlanningContext>(`${API_BASE_URL}/trips/planning-context`, {
      ...withCredentials,
      params
    });
  }

  // 第一段：只計算，不存檔
  previewTrip(request: PlanTripRequest): Observable<PlanTripPreviewResult> {
    return this.http.post<PlanTripPreviewResult>(
      `${API_BASE_URL}/trips/plan/preview`,
      request,
      withCredentials
    );
  }

  // 第二段：確認後才建立行程並計算路線
  confirmTrip(request: ConfirmTripRequest): Observable<PlanTripResult> {
    return this.http.post<PlanTripResult>(
      `${API_BASE_URL}/trips/plan/confirm`,
      request,
      withCredentials
    );
  }

  // 採買模式：把清單裡的一個品項標成已買／未買
  setItemPurchased(
    itemId: number,
    isPurchased: boolean
  ): Observable<{ fShoppingListItemId: number; fIsPurchased: boolean }> {
    return this.http.patch<{ fShoppingListItemId: number; fIsPurchased: boolean }>(
      `${API_BASE_URL}/trips/shopping-items/${itemId}/purchased`,
      { isPurchased },
      withCredentials
    );
  }

  getTrip(tripId: number): Observable<TripDto> {
    return this.http.get<TripDto>(`${API_BASE_URL}/trips/${tripId}`, withCredentials);
  }

  getMyTrips(): Observable<TripDto[]> {
    return this.http.get<TripDto[]>(`${API_BASE_URL}/trips`, withCredentials);
  }
}

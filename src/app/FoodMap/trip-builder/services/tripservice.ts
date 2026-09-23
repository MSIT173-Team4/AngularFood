import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api-config';
import { PlanTripRequest, PlanTripResult } from '../models/trip-model';

@Injectable({
  providedIn: 'root'
})
export class TripPlanningService {
  private http = inject(HttpClient);

  // 對應後端 POST /api/trips/plan，這支已經用 Postman 端到端驗證過，
  // 一次呼叫涵蓋 A（Mapping）→ B（Coverage/推薦）→ C（最佳化）→ D（Google Routes 逐段路線）
  planTrip(request: PlanTripRequest): Observable<PlanTripResult> {
    return this.http.post<PlanTripResult>(
      `${API_BASE_URL}/trips/plan`,
      request
    );
  }

  // 對應後端規格 E 節 /reorder 端點——目前後端尚未實作，呼叫這支預期會收到 404。
  // 前端設計成非阻塞：呼叫失敗只印 console warning，不擋住使用者操作。
  // 等後端這支做出來，這裡不用改，直接可以用。
  reorderTripPlaces(
    tripId: number,
    places: { placeId: number; sortOrder: number }[]
  ): Observable<TripDtoLike> {
    return this.http.patch<TripDtoLike>(
      `${API_BASE_URL}/trips/${tripId}/places/reorder`,
      places
    );
  }
}

// 避免這個檔案額外 import TripDto 造成循環相依，這裡用最小的形狀即可
type TripDtoLike = { fTripId: number };

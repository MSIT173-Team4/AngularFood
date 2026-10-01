import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api-config';
import {
  NearbyRequest,
  NearbyResponse,
  PlaceDto,
  PlaceSearchRequest,
  ResolvePlaceRequest
} from '../models/place-model';

const withCredentials = { withCredentials: true } as const;

@Injectable({ providedIn: 'root' })
export class PlaceService {
  private readonly http = inject(HttpClient);

  // 後端已改成 POST /api/places/nearby
  getNearbyPlaces(request: NearbyRequest): Observable<NearbyResponse> {
    return this.http.post<NearbyResponse>(`${API_BASE_URL}/places/nearby`, request, withCredentials);
  }

  // 用店名、地名搜尋（後端呼叫 Google Text Search，有快取）
  searchPlaces(request: PlaceSearchRequest): Observable<PlaceDto[]> {
    return this.http.post<PlaceDto[]>(`${API_BASE_URL}/places/search`, request, withCredentials);
  }

  // Google 地點 → 內部店家（回傳含 fPlaceId 的完整資料）
  resolvePlace(request: ResolvePlaceRequest): Observable<PlaceDto> {
    return this.http.post<PlaceDto>(`${API_BASE_URL}/places/resolve`, request, withCredentials);
  }
}

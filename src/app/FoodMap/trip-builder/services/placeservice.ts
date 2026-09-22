import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import {
  NearbyRequest,
  NearbyResponse,
  ResolvePlaceRequest
} from '../models/place-model';

@Injectable({ providedIn: 'root' })
export class PlaceService {
  constructor(private readonly http: HttpClient) {}

  // ⚠️ 假設：GET /api/places/nearby，用 Query String 帶條件。
  // 如果 Controller 是 [FromBody]（POST），把 http.get 改成 http.post 即可，
  // 呼叫端（trip-builder.ts）不用跟著改。
  getNearbyPlaces(request: NearbyRequest): Observable<NearbyResponse> {
    let params = new HttpParams()
      .set('fLatitude', request.fLatitude)
      .set('fLongitude', request.fLongitude);

    if (request.fPlacesCategoryId != null) {
      params = params.set('fPlacesCategoryId', request.fPlacesCategoryId);
    }

    if (request.minimumRequests != null) {
      params = params.set('minimumRequests', request.minimumRequests);
    }

    return this.http.get<NearbyResponse>(`${API_BASE_URL}/places/nearby`, {
      params
    });
  }

  resolvePlace(request: ResolvePlaceRequest): Observable<number> {
    return this.http.post<number>(`${API_BASE_URL}/places/resolve`, request);
  }
}

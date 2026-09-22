import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { CreateTripRequest, TripDto } from '../models/trip-model';

@Injectable({ providedIn: 'root' })
export class TripService {
  constructor(private readonly http: HttpClient) {}

  createTrip(request: CreateTripRequest): Observable<TripDto> {
    return this.http.post<TripDto>(`${API_BASE_URL}/trips`, request);
  }
}

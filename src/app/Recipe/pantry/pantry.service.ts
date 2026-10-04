import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiConfig } from '../api.config';
import { ApiResponse, PantryItem } from '../recipe.models';
import {
  AddPantryItemPayload,
  PantryAiDiagnosticDto,
  UpdatePantryItemPayload
} from './pantry.models';

@Injectable({ providedIn: 'root' })
export class PantryService {
  private readonly http = inject(HttpClient);

  getItems(): Observable<ApiResponse<PantryItem[]>> {
    return this.http.get<ApiResponse<PantryItem[]>>(
      apiConfig.pantry.list,
      { withCredentials: true }
    );
  }

  diagnoseImage(file: File): Observable<ApiResponse<PantryAiDiagnosticDto[]>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ApiResponse<PantryAiDiagnosticDto[]>>(
      apiConfig.pantry.diagnoseImage,
      formData,
      { withCredentials: true }
    );
  }

  addPantryItem(payload: AddPantryItemPayload): Observable<ApiResponse<PantryItem>> {
    return this.http.post<ApiResponse<PantryItem>>(
      apiConfig.pantry.addItem,
      payload,
      { withCredentials: true }
    );
  }

  updateItem(
    pantryId: number,
    payload: UpdatePantryItemPayload
  ): Observable<ApiResponse<PantryItem>> {
    return this.http.put<ApiResponse<PantryItem>>(
      apiConfig.pantry.update(pantryId),
      payload,
      { withCredentials: true }
    );
  }

  deleteItem(pantryId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      apiConfig.pantry.delete(pantryId),
      { withCredentials: true }
    );
  }
}

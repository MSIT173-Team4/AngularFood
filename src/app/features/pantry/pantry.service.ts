import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiConfig } from '../../Recipe/api.config';
import { ApiResponse, PantryItem } from '../../Recipe/recipe.models';
import { AddPantryItemPayload, PantryAiDiagnosticDto } from './pantry.models';

@Injectable({ providedIn: 'root' })
export class PantryService {
  private readonly http = inject(HttpClient);

  getItems(userId: number): Observable<ApiResponse<PantryItem[]>> {
    return this.http.get<ApiResponse<PantryItem[]>>(apiConfig.pantry.listByUser(userId));
  }

  diagnoseImage(file: File): Observable<ApiResponse<PantryAiDiagnosticDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ApiResponse<PantryAiDiagnosticDto>>(
      apiConfig.pantry.diagnoseImage,
      formData
    );
  }

  addPantryItem(payload: AddPantryItemPayload): Observable<ApiResponse<PantryItem>> {
    return this.http.post<ApiResponse<PantryItem>>(apiConfig.pantry.addItem, payload);
  }

  deleteItem(pantryId: number, userId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${apiConfig.pantry.delete(pantryId)}?userId=${userId}`
    );
  }
}

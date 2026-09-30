import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/MarketProduct`;

  // 注入 HttpClient，用來打 API
  constructor(private http: HttpClient) { }

  createProduct(formData: FormData) {
    return this.http.post(this.apiUrl, formData);
  }
}

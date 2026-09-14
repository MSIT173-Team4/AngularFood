import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = 'https://localhost:5247/api/MarketProduct';

  // 注入 HttpClient，用來打 API
  constructor(private http: HttpClient) { }

  createProduct(formData: FormData) {
    return this.http.post(this.apiUrl, formData);
  }

  getPublicProducts(page: number = 1) {
    return this.http.get<any[]>(`${this.apiUrl}/public?page=${page}`);
  }
}

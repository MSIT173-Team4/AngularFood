import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SellerProduct {
  productId: number;
  productNo: string;
  productName: string;
  description: string;
  stock: number;
  price: number;
  brandOrOrigin: string;
  manufacturingDate: string | null;
  expirationDate: string | null;
  productStatus: number;
  imageUrls: string[];
  salesLast30Days: number;
}

export interface SellerProductPagedResult {
  items: SellerProduct[];
  totalCount: number;
}

export interface MarketCategory {
  categoryId: number;
  categoryNo: string;
  categoryName: string;
  parentCategoryId: number | null;
  productCount: number;
  children: MarketCategory[];
}

export interface ProductImage {
  imageId: number;
  imageUrl: string;
  sortOrder: number;
}

export interface SellerProductDetail {
  productId: number;
  productNo: string;
  productName: string;
  description: string;
  stock: number;
  price: number;
  brandOrOrigin: string;
  manufacturingDate: string | null;
  expirationDate: string | null;
  productStatus: number;
  productsCategoryNo: string;
  images: ProductImage[];
}

@Injectable({ providedIn: 'root' })
export class SellcenterProductService {
  private readonly base = 'https://localhost:7164/api/MarketProduct';
  private readonly categoryBase = 'https://localhost:7164/api/MarketCategory';

  constructor(private http: HttpClient) { }

  getSellerProducts(
    status?: number,
    lowStock?: boolean,
    page: number = 1,
    keyword?: string
  ): Observable<SellerProductPagedResult> {
    let params = new HttpParams().set('page', page);
    if (status !== undefined && status !== null)
      params = params.set('status', status);
    if (lowStock)
      params = params.set('lowStock', true);
    if (keyword && keyword.trim())
      params = params.set('keyword', keyword.trim());
    return this.http.get<SellerProductPagedResult>(`${this.base}/sellcenter`, { params });
  }

  updateStatus(productId: number, newStatus: number): Observable<any> {
    return this.http.patch(`${this.base}/${productId}/status`, { status: newStatus });
  }

  getCategories(): Observable<MarketCategory[]> {
    return this.http.get<MarketCategory[]>(this.categoryBase);
  }

  createProduct(formData: FormData): Observable<{ productId: number }> {
    return this.http.post<{ productId: number }>(this.base, formData);
  }

  getSellerProductDetail(id: number): Observable<SellerProductDetail> {
    return this.http.get<SellerProductDetail>(`${this.base}/seller/${id}`);
  }

  updateProduct(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.base}/seller/${id}`, formData);
  }

  updateStock(productId: number, stock: number): Observable<{ message: string; stock: number; productStatus: number }> {
    return this.http.patch<{ message: string; stock: number; productStatus: number }>(
      `${this.base}/seller/${productId}/stock`,
      { stock }
    );
  }
}

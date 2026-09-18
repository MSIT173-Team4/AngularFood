import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── 對應後端 MarketPublicProductListDto ──────────────────────────
// .NET JSON 序列化預設把 PascalCase → camelCase
// 所以後端的 ProductId 到前端就是 productId，不需要額外設定
export interface MarketProduct {
  productId: number;
  productName: string;
  description: string;
  stock: number;
  price: number;
  brandOrOrigin: string;
  manufacturingDate: string | null;  // DateOnly 序列化後是字串 "2024-01-01"
  expirationDate: string | null;
  productStatus: number;             // 0=審核中/1=架上/2=售完/3=未上架/4=違規
  imageUrls: string[] | null;
}

// ── 搜尋參數，對應後端 MarketProductSearchDto ────────────────────
export interface ProductSearchParams {
  keyword?: string;
  categoryNo?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
}

// ── 分頁結果包裝，對應後端 MarketProductPagedResultDto ───────────
// 如果你後端還沒改成回傳這個格式，先用 MarketProduct[] 就好
// 等後端改完再換回來
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class MarketService {

  // 用 7164（你跑的是 https profile，7164 是主要 port）
  private readonly baseUrl = 'https://localhost:7164/api/MarketProduct';

  constructor(private http: HttpClient) { }

  // 首頁瀏覽用（不帶篩選條件）
  getPublicProducts(page: number = 1): Observable<MarketProduct[]> {
    return this.http.get<MarketProduct[]>(
      `${this.baseUrl}/public?page=${page}`
    );
  }

  // 搜尋 + 篩選（接 GET /api/MarketProduct/search）
  searchProducts(params: ProductSearchParams): Observable<PagedResult<MarketProduct>> {
    let httpParams = new HttpParams();

    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    if (params.categoryNo) httpParams = httpParams.set('categoryNo', params.categoryNo);
    if (params.minPrice != null) httpParams = httpParams.set('minPrice', params.minPrice);
    if (params.maxPrice != null) httpParams = httpParams.set('maxPrice', params.maxPrice);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.page) httpParams = httpParams.set('page', params.page);

    return this.http.get<PagedResult<MarketProduct>>(
      `${this.baseUrl}/search`,
      { params: httpParams }
    );
  }

  // 新增商品（賣家後台用）
  createProduct(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}`, formData);
  }
}

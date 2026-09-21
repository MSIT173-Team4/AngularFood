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
  parentCategoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
}

//分頁
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
}

//商品分類
export interface MarketCategory {
  categoryId: number;
  categoryNo: string;
  categoryName: string;
  parentCategoryId: number | null;
  children: MarketCategory[];
}

export interface MarketProductDetail {
  productId: number;
  productName: string;
  description: string | null;
  stock: number;
  price: number;
  brandOrOrigin: string | null;
  manufacturingDate: string | null;
  expirationDate: string | null;
  productStatus: number;
  imageUrls: string[];
  averageRating: number;
  reviewCount: number;
  sellerId: number;
  sellerName: string;
  sellerDescription: string | null;
  sellerProductCount: number;
}

export interface MarketReview {
  reviewId: number;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdDate: string;
}

export interface MarketReviewPaged {
  items: MarketReview[];
  totalCount: number;
}

export interface MarketRelatedRecipe {
  recipeId: number;
  recipeName: string;
  imageUrl: string | null;
  cookingTime: number;
}

//加入購物車
export interface AddToCartDto {
  productId: number;
  quantity: number;
}

// 購物車相關 interface
export interface CartItemDto {
  cartItemId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  price: number;
  stock: number;
  quantity: number;
  subtotal: number;
}

export interface CartSellerGroupDto {
  sellerId: number;
  sellerName: string;
  items: CartItemDto[];
}

// 優惠券相關 interface
export interface ValidateCouponDto {
  code: string;
  orderAmount: number;
  sellerId?: number;
}

export interface ValidateCouponResultDto {
  couponId: number;
  couponName: string;
  scopeType: string;
  discountType: string;
  discountValue: number;
  appliedAmount: number;
  message: string;
}

// 賣家套用的優惠券（前端狀態用）
export interface AppliedSellerCoupon {
  sellerId: number;
  couponId: number;
  couponName: string;
  appliedAmount: number;
  message: string;
}

// 使用者資料
export interface UserProfileDto {
  userId: number;
  username: string;
  phone: string;
  address: string;
}

// 收件人資料（每個賣家各自的配送資訊）
export interface ShippingAddress {
  recipientName: string;
  phone: string;
  city: string;
  district: string;
  streetAddress: string;
  useDefault: boolean;  // true=套用全域預設，false=個別指定
}

@Injectable({
  providedIn: 'root'
})
export class MarketService {

  // 用 7164（你跑的是 https profile，7164 是主要 port）
  private readonly baseUrl = 'https://localhost:7164/api/MarketProduct';
  private readonly cartUrl = 'https://localhost:7164/api/ShoppingCart';
  private readonly couponUrl = 'https://localhost:7164/api/MarketCoupon';

  constructor(private http: HttpClient) { }

  // 首頁瀏覽用（不帶篩選條件）
  getPublicProducts(page: number = 1): Observable<MarketProduct[]> {
    return this.http.get<MarketProduct[]>(
      `${this.baseUrl}/public?page=${page}`
    );

  }

  getCategories(): Observable<MarketCategory[]> {
    return this.http.get<MarketCategory[]>(
      'https://localhost:7164/api/MarketCategory'
    );
  }

  // 搜尋 + 篩選（接 GET /api/MarketProduct/search）
  searchProducts(params: ProductSearchParams): Observable<PagedResult<MarketProduct>> {
    let httpParams = new HttpParams();

    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    if (params.categoryNo) httpParams = httpParams.set('categoryNo', params.categoryNo);
    if (params.parentCategoryId != null) httpParams = httpParams.set('parentCategoryId', params.parentCategoryId);
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

  // 商品詳情
  getProductDetail(id: number): Observable<MarketProductDetail> {
    return this.http.get<MarketProductDetail>(`${this.baseUrl}/${id}`);
  }

  // 評論（分頁）
  getProductReviews(id: number, page: number = 1, pageSize: number = 3): Observable<MarketReviewPaged> {
    return this.http.get<MarketReviewPaged>(
      `${this.baseUrl}/${id}/reviews?page=${page}&pageSize=${pageSize}`
    );
  }

  // 相關食譜
  getRelatedRecipes(id: number): Observable<MarketRelatedRecipe[]> {
    return this.http.get<MarketRelatedRecipe[]>(`${this.baseUrl}/${id}/recipes`);
  }

  // 收藏 Toggle
  toggleFavorite(productId: number): Observable<{ isFavorite: boolean; message: string }> {
    return this.http.post<{ isFavorite: boolean; message: string }>(
      `https://localhost:7164/api/MarketFavorite/toggle/${productId}`, {},
      { withCredentials: true }
    );
  }

  // 確認是否已收藏
  checkFavorite(productId: number): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(
      `https://localhost:7164/api/MarketFavorite/check/${productId}`,
      { withCredentials: true }
    );
  }

  //加入購物車
  addToCart(dto: AddToCartDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      'https://localhost:7164/api/ShoppingCart/add', dto
    );
  }

  // 取得購物車
  getCart(): Observable<CartSellerGroupDto[]> {
    return this.http.get<CartSellerGroupDto[]>(this.cartUrl);
  }

  // 修改數量
  updateCartItem(cartItemId: number, quantity: number): Observable<{ message: string; quantity: number; subtotal: number }> {
    return this.http.put<{ message: string; quantity: number; subtotal: number }>(
      `${this.cartUrl}/${cartItemId}`, { quantity }
    );
  }

  // 刪除單筆
  deleteCartItem(cartItemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.cartUrl}/${cartItemId}`);
  }

  // 清空購物車
  clearCart(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.cartUrl}/all`);
  }

  // 驗證優惠券
  validateCoupon(dto: ValidateCouponDto): Observable<ValidateCouponResultDto> {
    return this.http.post<ValidateCouponResultDto>(`${this.couponUrl}/validate`, dto);
  }

  // 取得使用者資料（填寫送貨地址用）
  getUserProfile(): Observable<UserProfileDto> {
    return this.http.get<UserProfileDto>(
      'https://localhost:7164/api/ShoppingCartUsers/profile'
    );
  }

  // 建立訂單（結帳用）
  createOrder(dto: { cartItemIds: number[] }): Observable<{ batchId: number; bathNo: string; totalAmount: number }> {
    return this.http.post<{ batchId: number; bathNo: string; totalAmount: number }>(
      'https://localhost:7164/api/Checkout/CreateOrder', dto
    );
  }
}



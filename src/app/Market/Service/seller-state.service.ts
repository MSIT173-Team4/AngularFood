import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../../Member/services/auth-services';
import { environment } from '../../../environments/environment';

export interface MySellerInfo {
  isSeller: boolean;
  sellerId?: number;
  sellerName?: string;    // 賣場名稱
  ownerName?: string;     // 賣家本人真實姓名
}

export interface SellerSummary {
  total: number;
  onSale: number;
  lowStock: number;
  soldOut: number;
  reviewing: number;
  violated: number;
  unlisted: number;
  pendingOrders: number;
}

@Injectable({ providedIn: 'root' })
export class SellerStateService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly meUrl = `${environment.apiUrl}/MarketSeller/me`;

  // 目前登入者的賣家身份；null = 未登入或尚未查詢
  readonly sellerInfo = signal<MySellerInfo | null>(null);
  readonly isSeller = computed(() => this.sellerInfo()?.isSeller ?? false);
  // 側欄與商品分頁的數量；進入後台、上下架或改庫存後重新載入
  readonly summary = signal<SellerSummary | null>(null);
  private readonly summaryUrl = `${environment.apiUrl}/MarketSeller/summary`;

  loadSummary(): void {
    this.http.get<SellerSummary>(this.summaryUrl, { withCredentials: true })
      .subscribe({
        next: data => this.summary.set(data),
        error: () => this.summary.set(null)
      });
  }

  constructor() {
    // 跟著會員登入狀態走：登入 → 查賣家身份；登出 → 清空
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        if (user) {
          this.fetch().subscribe({ error: () => this.sellerInfo.set(null) });
        } else {
          this.sellerInfo.set(null);
        }
      });
    });
  }

  // 向後端查詢最新的賣家身份（sellerGuard 也會呼叫，確保停權等狀態是最新的）
  fetch(): Observable<MySellerInfo> {
    return this.http
      .get<MySellerInfo>(this.meUrl, { withCredentials: true })
      .pipe(tap(info => this.sellerInfo.set(info)));
  }
}

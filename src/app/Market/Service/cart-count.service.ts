import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../Member/services/auth-services';

@Injectable({ providedIn: 'root' })
export class CartCountService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly countUrl = 'https://localhost:7164/api/ShoppingCart/count';

  // Header 購物車徽章顯示的數字（購物車有幾項商品）
  readonly count = signal(0);

  constructor() {
    // 跟著登入狀態走：登入 → 查數量；登出 → 歸零
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => user ? this.refresh() : this.count.set(0));
    });
  }

  // 加入購物車等「不知道確切數量」的情況：向後端重新查詢
  refresh(): void {
    this.http.get<{ count: number }>(this.countUrl, { withCredentials: true })
      .subscribe({
        next: res => this.count.set(res.count),
        error: () => this.count.set(0)
      });
  }
}

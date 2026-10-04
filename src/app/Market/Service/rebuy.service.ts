import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MarketOrderService, RebuyResult } from './market-order.service';
import { CartCountService } from './cart-count.service';

// 跳到購物車頁時一起帶過去的提示（購物車頁讀取後顯示）
export interface RebuyNotice {
  severity: 'success' | 'warn';
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class RebuyService {
  private readonly orderService = inject(MarketOrderService);
  private readonly cartCount = inject(CartCountService);
  private readonly router = inject(Router);

  // messages 由呼叫的頁面傳入：PrimeNG 的 MessageService 是各頁面自己提供的，
  // root 層級的 Service 拿不到頁面的那一個，所以用參數傳進來
  run(orderIds: number[], messages: MessageService): void {
    this.orderService.rebuy(orderIds).subscribe({
      next: result => {
        this.cartCount.refresh();

        if (result.addedCount > 0) {
          // 有加入成功 → 帶著提示跳到購物車頁
          const notice: RebuyNotice = {
            severity: result.skipped.length > 0 ? 'warn' : 'success',
            detail: this.buildMessage(result),
          };
          this.router.navigate(['/market/cart'], { state: { rebuyNotice: notice } });
        } else {
          // 一項都沒加入 → 留在原頁面說明原因
          messages.add({
            severity: 'warn',
            summary: '商品無法加入購物車',
            detail: this.buildMessage(result),
            life: 5000,
          });
        }
      },
      error: err => {
        if (err.status === 401) {
          this.router.navigate(['/login']);
          return;
        }
        messages.add({
          severity: 'error',
          summary: '再買一次失敗',
          detail: err.error?.message ?? '請稍後再試',
          life: 3000,
        });
      },
    });
  }

  private buildMessage(result: RebuyResult): string {
    const parts: string[] = [];
    if (result.addedCount > 0) parts.push(`已加入 ${result.addedCount} 項商品`);
    if (result.skipped.length > 0) {
      const reasons = result.skipped.map(s => `${s.productName}（${s.reason}）`).join('、');
      parts.push(`${result.skipped.length} 項未加入：${reasons}`);
    }
    return parts.join('，');
  }
}

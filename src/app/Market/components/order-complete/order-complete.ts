import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { MarketService } from '../../Service/market';
import { CheckoutStepsComponent } from '../checkout-steps/checkout-steps';

// ── DTO 介面（對應後端 OrderCompleteDto）────────────────────
export interface OrderItemDto {
  productId: number;
  productName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderGroupDto {
  orderId: number;
  orderNo: string;
  sellerName: string;
  items: OrderItemDto[];
}

export interface OrderCompleteDto {
  batchId: number;
  batchNo: string;
  paidAt: string;             // ISO 字串，顯示時用 DatePipe 格式化
  paymentMethod: string;
  paymentStatus: number;      // 1 = 已付款
  totalAmount: number;
  subTotal: number;
  discountAmount: number;
  shippingFee: number;
  orderGroups: OrderGroupDto[];
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  shippingMethod: string;
}

@Component({
  selector: 'app-order-complete',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ToastModule,
    CheckoutStepsComponent,
  ],
  providers: [MessageService],
  templateUrl: './order-complete.html',
  styleUrl: './order-complete.css',
})
export class OrderCompleteComponent implements OnInit, OnDestroy {

  order: OrderCompleteDto | null = null;
  isLoading = true;
  isError = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketService: MarketService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    // 從路由取 batchId（路由設定：/checkout/complete/:batchId）
    const batchId = Number(this.route.snapshot.paramMap.get('batchId'));

    if (!batchId || isNaN(batchId)) {
      this.router.navigate(['/market']);
      return;
    }

    this.loadOrderComplete(batchId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── API 呼叫 ──────────────────────────────────────────────
  loadOrderComplete(batchId: number): void {
    this.isLoading = true;

    this.marketService.getOrderComplete(batchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.order = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('載入訂單失敗', err);
          this.isLoading = false;
          this.isError = true;
          this.messageService.add({
            severity: 'error',
            summary: '載入失敗',
            detail: '無法取得訂單資料，請稍後再試',
          });
        },
      });
  }

  // ── 輔助方法 ──────────────────────────────────────────────
  /** 配送方式中文 */
  shippingMethodLabel(method: string): string {
    return method === 'CVS' ? '超商取貨' : '宅配到府';
  }

  /** 計算所有子訂單的商品總件數 */
  get totalItemCount(): number {
    return this.order?.orderGroups
      .flatMap(g => g.items)
      .reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }

  /** 導到訂單查詢頁（頁面還沒做，先預留路徑） */
  goToOrderTracking(): void {
    // TODO：等訂單查詢頁完成後改成 this.router.navigate(['/orders'])
    this.messageService.add({
      severity: 'info',
      summary: '功能開發中',
      detail: '訂單查詢頁面即將上線',
      life: 2500,
    });
  }

  goToMarket(): void {
    this.router.navigate(['/market']);
  }
}

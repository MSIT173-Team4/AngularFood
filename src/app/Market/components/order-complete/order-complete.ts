import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, timer } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { MarketService } from '../../Service/market';
import { CheckoutStepsComponent } from '../checkout-steps/checkout-steps';
import { RebuyService } from '../../Service/rebuy.service';


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
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  shippingMethod: string;
  paymentStatus: number;      // 子訂單付款狀態：0待付款/1已付款/2待退款/3已退款
  subTotal: number;
  productDiscount: number;
  shippingFee: number;
  shippingDiscount: number;
  orderAmount: number;
  items: OrderItemDto[];
  orderStatus: number;   // 3 = 已取消
}

export interface OrderCompleteDto {
  batchId: number;
  batchNo: string;
  paidAt: string;
  paymentMethod: string;
  paymentStatus: number;      // 批次付款狀態：1 = 已付款
  subTotal: number;
  productDiscount: number;
  shippingFee: number;
  shippingDiscount: number;
  totalAmount: number;
  orderGroups: OrderGroupDto[];
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

  // ── 付款狀態輪詢 start──
  isCheckingPayment = false;
  private batchId = 0;
  private pollCount = 0;
  private readonly maxPollCount = 5;
  private readonly pollIntervalMs = 2000;

  get isPaid(): boolean {
    return this.order?.paymentStatus === 1;
  }

  // 批次付款狀態 4：逾期或買家取消（最終狀態，不會再改變）
  get isCancelled(): boolean {
    return this.order?.paymentStatus === 4;
  }
  // ── 付款狀態輪詢 End──

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketService: MarketService,
    private messageService: MessageService,
    private rebuyService: RebuyService,
  ) { }

  ngOnInit(): void {
    // 從路由取 batchId（路由設定：/checkout/complete/:batchId）
    const batchId = Number(this.route.snapshot.paramMap.get('batchId'));

    if (!batchId || isNaN(batchId)) {
      this.router.navigate(['/market']);
      return;
    }
    this.batchId = batchId;
    this.loadOrderComplete(batchId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── API 呼叫 ──────────────────────────────────────────────
  // isPolling = true 時是背景重新查詢
  loadOrderComplete(batchId: number, isPolling = false): void {
    if (!isPolling) this.isLoading = true;

    this.marketService.getOrderComplete(batchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.order = data;
          this.isLoading = false;
          this.checkPaymentStatus();
        },
        error: (err) => {
          console.error('載入訂單失敗', err);
          this.isLoading = false;
          this.isCheckingPayment = false;
          this.isError = true;
          this.messageService.add({
            severity: 'error',
            summary: '載入失敗',
            detail: '無法取得訂單資料，請稍後再試',
          });
        },
      });
  }

  // 未付款且還沒查滿次數 → 2 秒後再查一次；已付款或查滿 → 停止
  private checkPaymentStatus(): void {
    // 已付款或已取消都是最終狀態，不需要再輪詢
    if (this.isPaid || this.isCancelled || this.pollCount >= this.maxPollCount) {
      this.isCheckingPayment = false;
      return;
    }
    this.isCheckingPayment = true;
    this.pollCount++;
    timer(this.pollIntervalMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadOrderComplete(this.batchId, true));
  }

  // 「付款尚未完成」畫面的重新查詢按鈕
  retryCheckPayment(): void {
    this.pollCount = 0;
    this.isCheckingPayment = true;
    this.loadOrderComplete(this.batchId, true);
  }

  // ── 輔助方法 ──────────────────────────────────────────────
  /** 配送方式中文 */
  shippingMethodLabel(method: string): string {
    return method === 'CVS' ? '超商取貨' : '宅配到府';
  }

  /** 子訂單付款狀態中文；已取消的子訂單優先顯示「已取消」 */
  paymentStatusLabel(status: number, orderStatus?: number): string {
    if (orderStatus === 3) return '已取消';
    switch (status) {
      case 0: return '待付款';
      case 1: return '已付款';
      case 2: return '待退款';
      case 3: return '已退款';
      default: return '未知';
    }
  }

  /** 計算所有子訂單的商品總件數 */
  get totalItemCount(): number {
    return this.order?.orderGroups
      .flatMap(g => g.items)
      .reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }

  /** 導到訂單查詢頁*/
  goToOrderTracking(): void {
    this.router.navigate(['/market/orders']);
  }

  goToMarket(): void {
    this.router.navigate(['/market/products']);
  }

  // 再買一次：整個結帳批次（所有賣家）的商品都加回購物車
  rebuyAll(): void {
    if (!this.order) return;
    const orderIds = this.order.orderGroups.map(g => g.orderId);
    this.rebuyService.run(orderIds, this.messageService);
  }
}

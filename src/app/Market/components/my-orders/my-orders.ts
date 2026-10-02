import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, of, switchMap, catchError, tap, takeUntil } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { RebuyService } from '../../Service/rebuy.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { environment } from '../../../../environments/environment';

import {
  MarketOrderService, MyOrder, MyOrderCounts, MyOrderRange, MyOrderStatusKey, MyOrderTab
} from '../../Service/market-order.service';

interface OrderTab {
  key: MyOrderTab;
  label: string;
  countKey: keyof MyOrderCounts;
}

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastModule, PaginatorModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.css',
})
export class MyOrdersComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(MarketOrderService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly rebuyService = inject(RebuyService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly tabs: OrderTab[] = [
    { key: 'pending-payment', label: '待付款', countKey: 'pendingPayment' },
    { key: 'pending-ship', label: '待出貨', countKey: 'pendingShip' },
    { key: 'to-receive', label: '待收貨', countKey: 'toReceive' },
    { key: 'completed', label: '已完成', countKey: 'completed' },
    { key: 'to-review', label: '待評價', countKey: 'toReview' },
    { key: 'cancelled', label: '已取消', countKey: 'cancelled' },
    { key: 'all', label: '全部訂單', countKey: 'all' },
  ];

  readonly rangeOptions: { label: string; value: MyOrderRange }[] = [
    { label: '近半年訂單記錄', value: '6m' },
    { label: '近一年訂單記錄', value: '1y' },
    { label: '全部訂單記錄', value: 'all' },
  ];

  readonly pageSize = 10;

  // 查詢條件
  activeTab: MyOrderTab = 'all';
  range: MyOrderRange = '6m';
  keyword = '';
  currentPage = 1;

  // 查詢結果
  orders: MyOrder[] = [];
  totalCount = 0;
  counts: MyOrderCounts | null = null;
  isLoading = false;
  loadError = false;

  private readonly reload$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.reload$.pipe(
      tap(() => {
        this.isLoading = true;
        this.loadError = false;
      }),
      // switchMap：只保留最後一次請求。快速切換分頁時，舊請求的回應不會蓋掉新分頁的結果
      switchMap(() =>
        this.orderService.getMyOrders(this.activeTab, this.range, this.keyword, this.currentPage).pipe(
          // 錯誤在內層處理，外層的 reload$ 才不會因為一次失敗就整個停止
          catchError(() => {
            this.loadError = true;
            return of(null);
          })
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.isLoading = false;
      if (!result) return;
      this.orders = result.items;
      this.totalCount = result.totalCount;
      this.counts = result.counts;
    });

    this.reload$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── 查詢條件變動：都回到第 1 頁重新查詢 ──────────────
  selectTab(key: MyOrderTab): void {
    if (this.activeTab === key) return;
    this.activeTab = key;
    this.currentPage = 1;
    this.reload$.next();
  }

  onRangeChange(value: MyOrderRange): void {
    this.range = value;
    this.currentPage = 1;
    this.reload$.next();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.reload$.next();
  }

  clearSearch(): void {
    this.keyword = '';
    this.onSearch();
  }

  onPageChange(event: PaginatorState): void {
    this.currentPage = (event.page ?? 0) + 1;
    this.reload$.next();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  retry(): void {
    this.reload$.next();
  }

  // ── 顯示用 ───────────────────────────────────────────
  getTabCount(tab: OrderTab): number {
    return this.counts?.[tab.countKey] ?? 0;
  }

  get rangeText(): string {
    if (this.totalCount === 0) return '';
    const from = (this.currentPage - 1) * this.pageSize + 1;
    const to = Math.min(this.currentPage * this.pageSize, this.totalCount);
    return `顯示第 ${from} 至 ${to} 筆，共 ${this.totalCount} 筆訂單記錄`;
  }

  statusLabel(key: MyOrderStatusKey): string {
    const map: Record<MyOrderStatusKey, string> = {
      'pending-payment': '待付款',
      'pending-ship': '待出貨',
      'shipping': '運送中',
      'delivered': '已送達',
      'completed': '已完成',
      'cancelled': '已取消',
      'other': '處理中',
    };
    return map[key];
  }

  // 實收運費（扣掉運費折抵）
  shippingNet(order: MyOrder): number {
    return order.shippingFee - order.shippingDiscount;
  }

  isToReceive(order: MyOrder): boolean {
    return order.statusKey === 'shipping' || order.statusKey === 'delivered';
  }

  // ── 按鈕動作 ─────────────────────────────────────────
  viewDetail(order: MyOrder): void {
    this.router.navigate(['/checkout/complete', order.batchId]);
  }

  // 取消訂單：未付款以「整個結帳批次」為單位，同批次有其他賣家時要先說清楚
  cancelOrder(order: MyOrder): void {
    const others = order.batchSellerNames.filter(name => name !== order.sellerName);
    const message = others.length > 0
      ? `這筆訂單與「${others.join('、')}」是同一次結帳，取消後會一併取消，共 ${order.batchSellerNames.length} 張訂單。確定要取消嗎？`
      : '確定要取消這筆訂單嗎？取消後商品庫存將會釋出。';

    this.confirmationService.confirm({
      header: '取消訂單',
      message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定取消',
      rejectLabel: '保留訂單',
      accept: () => this.doCancel(order),
    });
  }

  private doCancel(order: MyOrder): void {
    this.orderService.cancelOrder(order.orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.messageService.add({ severity: 'success', summary: '訂單已取消', detail: res.message, life: 3000 });
          this.reload$.next();
        },
        error: err => {
          // 例如在確認的這段時間剛好付款完成或已逾期取消：顯示原因並重新整理狀態
          this.messageService.add({
            severity: 'error', summary: '無法取消',
            detail: err.error?.message ?? '請稍後再試', life: 3000,
          });
          this.reload$.next();
        },
      });
  }

  // 立即付款：整頁跳到後端 Pay，由後端產生綠界表單
  payNow(order: MyOrder): void {
    if (order.paymentDeadline && new Date(order.paymentDeadline) < new Date()) {
      this.messageService.add({
        severity: 'warn', summary: '已超過付款期限',
        detail: '此訂單已逾期，將自動取消並釋出庫存', life: 3000,
      });
      this.reload$.next();
      return;
    }
    window.location.href = `${environment.apiUrl}/Checkout/Pay/${order.batchId}`;
  }

  // 再買一次
  rebuy(order: MyOrder): void {
    this.rebuyService.run([order.orderId], this.messageService);
  }

  contactSeller(order: MyOrder): void {
    this.notReady('聯絡小農');
  }

  notReady(feature: string): void {
    this.messageService.add({
      severity: 'info',
      summary: '功能開發中',
      detail: `「${feature}」功能即將上線`,
      life: 2500,
    });
  }
}

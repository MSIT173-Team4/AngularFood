import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of, switchMap, catchError, tap, takeUntil } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import {
  SellcenterOrderService, SellerOrder, SellerOrderCounts, SellerOrderStatusKey, SellerOrderTab
} from '../services/sellcenter-order';
import { SellerStateService } from '../../Market/Service/seller-state.service';

interface OrderTab {
  key: SellerOrderTab;
  label: string;
  countKey: keyof SellerOrderCounts;
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, PaginatorModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderListComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(SellcenterOrderService);
  private readonly sellerState = inject(SellerStateService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly tabs: OrderTab[] = [
    { key: 'pending-ship', label: '待出貨', countKey: 'pendingShip' },
    { key: 'shipping', label: '運送中', countKey: 'shipping' },
    { key: 'completed', label: '已完成', countKey: 'completed' },
    { key: 'all', label: '全部', countKey: 'all' },
  ];

  readonly pageSize = 10;

  // 查詢條件：預設待出貨，賣家一進來先看到要處理的訂單
  activeTab: SellerOrderTab = 'pending-ship';
  keyword = '';
  currentPage = 1;

  // 查詢結果
  orders: SellerOrder[] = [];
  totalCount = 0;
  counts: SellerOrderCounts | null = null;
  isLoading = false;
  loadError = false;

  // 出貨中的訂單（避免重複點擊）
  shippingOrderId: number | null = null;

  private readonly reload$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.reload$.pipe(
      tap(() => {
        this.isLoading = true;
        this.loadError = false;
      }),
      // 只保留最後一次請求，快速切換分頁時不會被舊結果覆蓋
      switchMap(() =>
        this.orderService.getOrders(this.activeTab, this.keyword, this.currentPage).pipe(
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

  // ── 查詢條件 ─────────────────────────────────────────
  selectTab(key: SellerOrderTab): void {
    if (this.activeTab === key) return;
    this.activeTab = key;
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
    return `顯示第 ${from} 至 ${to} 筆，共 ${this.totalCount} 筆訂單`;
  }

  statusLabel(key: SellerOrderStatusKey): string {
    const map: Record<SellerOrderStatusKey, string> = {
      'pending-ship': '待出貨',
      'shipping': '運送中',
      'delivered': '已送達',
      'completed': '已完成',
      'other': '處理中',
    };
    return map[key];
  }

  shippingMethodLabel(method: string): string {
    return method === 'CVS' ? '超商取貨' : '宅配到府';
  }

  shippingNet(order: SellerOrder): number {
    return order.shippingFee - order.shippingDiscount;
  }

  // ── 出貨 ─────────────────────────────────────────────
  ship(order: SellerOrder): void {
    this.confirmationService.confirm({
      header: '確認出貨',
      message: `訂單 ${order.orderNo} 將寄送給「${order.recipientName}（${order.recipientPhone}）」，地址：${order.shippingAddress}。確定要出貨嗎？`,
      icon: 'pi pi-truck',
      acceptLabel: '確定出貨',
      rejectLabel: '再檢查一下',
      accept: () => this.doShip(order),
    });
  }

  private doShip(order: SellerOrder): void {
    this.shippingOrderId = order.orderId;
    this.orderService.ship(order.orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.shippingOrderId = null;
          this.messageService.add({ severity: 'success', summary: '已出貨', detail: `訂單 ${order.orderNo} ${res.message}`, life: 3000 });
          this.reload$.next();
          this.sellerState.loadSummary();   // 側欄「訂單管理」的待出貨數字跟著減少
        },
        error: err => {
          this.shippingOrderId = null;
          this.messageService.add({
            severity: 'error', summary: '出貨失敗',
            detail: err.error?.message ?? '請稍後再試', life: 3000,
          });
          this.reload$.next();
        },
      });
  }
}

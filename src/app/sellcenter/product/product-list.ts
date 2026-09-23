import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SellcenterProductService, SellerProduct } from '../services/sellcenter-product';
import { MessageService } from 'primeng/api';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';

interface TabOption {
  label: string;
  status?: number;
  lowStock?: boolean;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    ToggleSwitchModule,
    TagModule,
    ToastModule,
    TooltipModule,
    InputNumberModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tabs: TabOption[] = [
    { label: '全部商品' },
    { label: '販售中', status: 1 },
    { label: '庫存警告', status: 1, lowStock: true },
    { label: '已售完', status: 2 },
    { label: '審核中', status: 0 },
    { label: '已違規', status: 4 },
    { label: '未上架', status: 3 },
  ];

  activeTabIndex = 0;
  products: SellerProduct[] = [];
  totalCount = 0;
  currentPage = 1;
  readonly pageSize = 10;
  loading = false;
  readonly LOW_STOCK_THRESHOLD = 10;
  // 庫存微調 dialog
  showStockDialog = false;
  stockEditProduct: SellerProduct | null = null;
  newStock: number | null = null;
  stockSubmitting = false;
  searchKeyword = '';

  constructor(
    private productService: SellcenterProductService,
    private messageService: MessageService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    //this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get activeTab(): TabOption {
    return this.tabs[this.activeTabIndex];
  }

  selectTab(index: number): void {
    if (this.activeTabIndex === index) return;
    this.activeTabIndex = index;
    this.currentPage = 1;
    this.searchKeyword = '';
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    const tab = this.activeTab;
    this.productService
      .getSellerProducts(tab.status, tab.lowStock, this.currentPage, this.searchKeyword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: { items: SellerProduct[]; totalCount: number }) => {
          this.products = res.items;
          this.totalCount = res.totalCount;
          this.loading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: '載入失敗',
            detail: '無法取得商品資料，請稍後再試',
          });
          this.loading = false;
        },
      });
  }

  onPageChange(event: TableLazyLoadEvent): void {
    this.currentPage = (event.first ?? 0) / (event.rows ?? this.pageSize) + 1;
    this.loadProducts();
  }

  toggleStatus(product: SellerProduct): void {
    const newStatus = product.productStatus;
    const oldStatus = newStatus === 1 ? 3 : 1;

    this.productService
      .updateStatus(product.productId, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => {
          product.productStatus = oldStatus;
          this.messageService.add({
            severity: 'error',
            summary: '更新失敗',
            detail: '上下架狀態更新失敗，請稍後再試',
          });
        },
      });
  }

  canToggle(product: SellerProduct): boolean {
    return product.productStatus === 1 || product.productStatus === 3;
  }

  isLowStock(product: SellerProduct): boolean {
    return product.stock < this.LOW_STOCK_THRESHOLD && product.productStatus === 1;
  }

  showUrgentRestock(product: SellerProduct): boolean {
    return this.isLowStock(product);
  }

  showRestock(product: SellerProduct): boolean {
    return product.productStatus === 2;
  }

  isViewOnly(product: SellerProduct): boolean {
    return product.productStatus === 0 || product.productStatus === 4;
  }

  goToEdit(productId: number): void {
    this.router.navigate(['/sellcenter/products', productId, 'edit']);
  }

  goToNew(): void {
    this.router.navigate(['/sellcenter/products/new']);
  }

  getStatusLabel(status: number): string {
    const map: Record<number, string> = {
      0: '審核中', 1: '販售中', 2: '已售完', 3: '未上架', 4: '已違規',
    };
    return map[status] ?? '未知';
  }

  getStatusSeverity(status: number): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<number, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      0: 'warn', 1: 'success', 2: 'secondary', 3: 'info', 4: 'danger',
    };
    return map[status] ?? 'secondary';
  }

  openStockDialog(product: SellerProduct): void {
    this.stockEditProduct = product;
    this.newStock = product.stock;
    this.showStockDialog = true;
  }

  closeStockDialog(): void {
    this.showStockDialog = false;
    this.stockEditProduct = null;
    this.newStock = null;
  }

  submitStock(): void {
    if (this.stockEditProduct === null || this.newStock === null || this.newStock < 0) {
      this.messageService.add({
        severity: 'warn', summary: '請輸入有效庫存數量',
      });
      return;
    }

    this.stockSubmitting = true;
    this.productService
      .updateStock(this.stockEditProduct.productId, this.newStock)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          // 直接更新畫面上的數值
          this.stockEditProduct!.stock = res.stock;
          this.stockEditProduct!.productStatus = res.productStatus;
          this.stockSubmitting = false;
          this.messageService.add({
            severity: 'success', summary: '庫存已更新',
          });
          this.closeStockDialog();
        },
        error: () => {
          this.stockSubmitting = false;
          this.messageService.add({
            severity: 'error', summary: '更新失敗', detail: '請稍後再試',
          });
        },
      });
  }

  onSearchEnter(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.currentPage = 1;
    this.loadProducts();
  }
}

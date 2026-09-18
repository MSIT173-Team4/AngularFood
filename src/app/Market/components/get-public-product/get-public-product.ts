import { ProductCardComponent } from './../product-card/product-card';
// src/app/Market/components/get-public-product/get-public-product.component.ts
import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { MarketService, MarketProduct, ProductSearchParams, MarketCategory } from '../../Service/market';

@Component({
  selector: 'app-get-public-product',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PaginatorModule,
    ToastModule,
    ProductCardComponent
  ],
  providers: [MessageService],  // 2. Toast 需要 MessageService
  templateUrl: './get-public-product.html',
  styleUrl: './get-public-product.css',
})
export class GetPublicProduct implements OnInit, OnDestroy {

  // ── 商品資料 ──────────────────────────────────────────
  products: MarketProduct[] = [];
  isLoading = false;

  //分類選單
  categories: MarketCategory[] = [];
  selectedCategoryNo: string | null | undefined = null;
  expandedCategoryId: number | null = null;
  activeCategoryTopId: number | null = null;

  // ── 搜尋 & 篩選狀態 ───────────────────────────────────
  keyword = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedSortBy = 'newest';  // 預設排序
  showAdvancedFilter = true;
  selectedQuickPrice: string | null = null;

  // ── 分頁狀態 ──────────────────────────────────────────
  currentPage = 1;          // 後端是 1-based
  pageSize = 10;
  totalRecords = 60;        // 3. 暫時寫死；後端之後要回傳 total count

  // ── 排序選項 ──────────────────────────────────────────
  sortOptions = [
    { label: '最新上架', value: 'newest' },
    { label: '價格低至高', value: 'price_asc' },
    { label: '價格高至低', value: 'price_desc' },
  ];


  // ── RxJS 生命週期管理 ─────────────────────────────────
  // 4. 這個 Subject 用來在 Component 銷毀時取消所有訂閱
  private destroy$ = new Subject<void>();

  constructor(
    private marketService: MarketService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    // 5. 頁面一進來就先打一次 API 拿商品
    this.loadCategories();//下載分類
    this.loadProducts();
  }

  ngOnDestroy(): void {
    // 6. Component 銷毀時發出信號，讓所有 takeUntil(this.destroy$) 自動取消訂閱
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── 核心：打 API ──────────────────────────────────────
  loadProducts(): void {
    this.isLoading = true;

    const params: ProductSearchParams = {
      keyword: this.keyword || undefined,
      categoryNo: this.selectedCategoryNo ?? undefined,
      minPrice: this.minPrice ?? undefined,
      maxPrice: this.maxPrice ?? undefined,
      sortBy: this.selectedSortBy,
      page: this.currentPage,
    };

    this.marketService.searchProducts(params)
      .pipe(takeUntil(this.destroy$))  // 7. 元件銷毀就自動取消這個請求的訂閱
      .subscribe({
        next: (result) => {
          this.products = result.items;        // 不是 data，是 result.items
          this.totalRecords = result.totalCount;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('載入商品失敗', err);
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: '載入失敗',
            detail: '無法取得商品資料，請稍後再試'
          });
        }
      });
  }

  // ── 使用者操作 ────────────────────────────────────────
  onSearch(): void {
    this.currentPage = 1;   // 8. 每次重新搜尋要回到第 1 頁
    this.loadProducts();
  }

  onQuickPrice(min: number, max: number | null, label: string): void {
    this.minPrice = min;
    this.maxPrice = max;
    this.selectedQuickPrice = label;
  }

  onResetFilter(): void {
    this.keyword = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedSortBy = 'newest';
    this.selectedQuickPrice = null;
    this.currentPage = 1;
    this.loadProducts();
  }

  onSortChange(sortValue: string): void {
    this.selectedSortBy = sortValue;
    this.currentPage = 1;
    this.loadProducts();
  }

  // 9. PrimeNG Paginator 的頁碼變化事件
  onPageChange(event: PaginatorState): void {
    // event.page 是 0-based，後端是 1-based，所以要 +1
    this.currentPage = (event.page ?? 0) + 1;
    this.loadProducts();
  }

  // ── 子 Component 的事件 ───────────────────────────────
  onAddToCart(product: MarketProduct): void {
    // 目前先用 Toast 示意，之後這裡呼叫購物車 Service
    this.messageService.add({
      severity: 'success',
      summary: '已加入購物車',
      detail: `「${product.productName}」已放入採買清單！`,
      life: 2500
    });
  }

  onToggleFavorite(product: MarketProduct): void {
    this.messageService.add({
      severity: 'info',
      summary: '已加入收藏',
      detail: `「${product.productName}」已加入收藏清單`,
      life: 2000
    });
  }

  loadCategories(): void {
    this.marketService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.categories = data;
        },
        error: (err) => console.error('載入分類失敗', err)
      });
  }

  // 點分類時篩選商品
  onCategorySelect(categoryNo: string | null, topId: number): void {
    this.selectedCategoryNo = categoryNo;
    this.activeCategoryTopId = topId;   // 記住目前點的是哪個頂層，讓「全部商品」的 active 判斷正確
    this.currentPage = 1;
    this.loadProducts();
  }

  // 新增折疊方法
  toggleExpand(topId: number): void {
    this.expandedCategoryId = this.expandedCategoryId === topId ? null : topId;
  }
}

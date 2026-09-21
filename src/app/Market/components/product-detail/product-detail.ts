import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';

import {
  MarketService,
  MarketProductDetail,
  MarketReview,
  MarketRelatedRecipe,
  AddToCartDto
} from '../../Service/market';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, ToastModule, DialogModule],
  providers: [MessageService],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {

  product: MarketProductDetail | null = null;
  isLoading = true;

  // 圖片相關
  selectedImageUrl = '';
  showImageDialog = false;  // 放大預覽

  // 數量
  quantity = 1;

  // 評論
  reviews: MarketReview[] = [];
  reviewTotalCount = 0;
  reviewPage = 1;
  reviewPageSize = 3;
  isLoadingMoreReviews = false;

  // 相關食譜
  relatedRecipes: MarketRelatedRecipe[] = [];

  // 收藏
  isFavorite = false;

  // 商品描述展開/收合
  isDescExpanded = false;

  private destroy$ = new Subject<void>();
  private productId!: number;

  constructor(
    private route: ActivatedRoute,
    private marketService: MarketService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    // 從路由拿 productId
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.productId = +params['id'];  // 字串轉數字
        this.loadProduct();
        this.loadReviews();
        this.loadRelatedRecipes();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProduct(): void {
    this.isLoading = true;
    this.marketService.getProductDetail(this.productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.product = data;
          // 預設顯示第一張圖
          this.selectedImageUrl = data.imageUrls?.[0] ?? '';
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: '載入失敗',
            detail: '找不到此商品'
          });
        }
      });
  }

  loadReviews(): void {
    this.marketService.getProductReviews(this.productId, this.reviewPage, this.reviewPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // 第一次載入直接替換，之後按「查看更多」才 append
          if (this.reviewPage === 1) {
            this.reviews = data.items;
          } else {
            this.reviews = [...this.reviews, ...data.items];
          }
          this.reviewTotalCount = data.totalCount;
          this.isLoadingMoreReviews = false;
        },
        error: () => { this.isLoadingMoreReviews = false; }
      });
  }

  loadMoreReviews(): void {
    if (this.reviews.length >= this.reviewTotalCount) return;
    this.isLoadingMoreReviews = true;
    this.reviewPage++;
    this.loadReviews();
  }

  loadRelatedRecipes(): void {
    this.marketService.getRelatedRecipes(this.productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.relatedRecipes = data; }
      });
  }

  // 切換主圖
  selectImage(url: string): void {
    this.selectedImageUrl = url;
  }

  // 放大預覽
  openImageDialog(): void {
    this.showImageDialog = true;
  }

  // 數量控制
  increaseQty(): void {
    if (this.product && this.quantity < this.product.stock) {
      this.quantity++;
    }
  }

  decreaseQty(): void {
    if (this.quantity > 1) this.quantity--;
  }

  // 加入購物車（目前先用 Toast 示意）
  addToCart(): void {
    if (!this.product) return;

    const dto: AddToCartDto = {
      productId: this.productId,
      quantity: this.quantity
    };

    this.marketService.addToCart(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.messageService.add({
            severity: 'success',
            summary: '已加入購物車',
            detail: `「${this.product?.productName}」x${this.quantity} 已放入採買清單！`,
            life: 2500
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: '加入失敗',
            detail: err.error?.message ?? '加入購物車失敗，請稍後再試',
            life: 3000
          });
        }
      });
  }

  // 收藏 Toggle
  toggleFavorite(): void {
    this.marketService.toggleFavorite(this.productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isFavorite = result.isFavorite;
          this.messageService.add({
            severity: 'info',
            summary: result.isFavorite ? '已加入收藏' : '已取消收藏',
            detail: result.message,
            life: 2000
          });
        },
        error: (err) => {
          if (err.status === 401) {
            this.messageService.add({
              severity: 'warn',
              summary: '請先登入',
              detail: '收藏功能需要登入後才能使用',
              life: 3000
            });
          }
        }
      });
  }

  // 星級陣列（給模板跑迴圈用）
  getStarArray(rating: number): string[] {
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) stars.push('star');
      else if (i - rating < 1) stars.push('star_half');
      else stars.push('star_border');
    }
    return stars;
  }

  // 格式化日期
  formatDate(dateStr: string): string {
    return dateStr.replace(/-/g, '.');
  }

  get hasMoreReviews(): boolean {
    return this.reviews.length < this.reviewTotalCount;
  }
}

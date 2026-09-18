import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MarketProduct } from '../../Service/market';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCardComponent {
  // 2. @Input()：從父層接收資料（單向資料流，父 → 子）
  @Input({ required: true }) product!: MarketProduct;

  // 3. @Output()：子 Component 發事件給父層（不直接改父層的狀態）
  @Output() addToCart = new EventEmitter<MarketProduct>();
  @Output() toggleFavorite = new EventEmitter<MarketProduct>();

  // 4. 處理圖片不存在的情況
  get firstImageUrl(): string {
    return this.product.imageUrls?.[0] ?? 'assets/images/product-placeholder.png';
  }

  // 5. 根據 productStatus 決定顯示文字
  get statusLabel(): string | null {
    if (this.product.productStatus === 2) return '已售完 · 補貨中';
    return null;
  }

  get isSoldOut(): boolean {
    return this.product.productStatus === 2;
  }

  onAddToCart(): void {
    this.addToCart.emit(this.product);
  }

  onToggleFavorite(): void {
    this.toggleFavorite.emit(this.product);
  }
}

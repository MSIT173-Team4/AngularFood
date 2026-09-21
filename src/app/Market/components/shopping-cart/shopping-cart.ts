import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CheckoutStepsComponent } from '../checkout-steps/checkout-steps';
import { Router } from '@angular/router';


import {
  MarketService,
  CartSellerGroupDto,
  CartItemDto,
  ValidateCouponResultDto,
  AppliedSellerCoupon
} from '../../Service/market';

import { CheckoutStateService } from '../../Service/checkout-state.service';

@Component({
  selector: 'app-shopping-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, ToastModule, CheckoutStepsComponent],
  providers: [MessageService],
  templateUrl: './shopping-cart.html',
  styleUrl: './shopping-cart.css'
})
export class ShoppingCartComponent implements OnInit, OnDestroy {

  // 購物車資料
  sellerGroups: CartSellerGroupDto[] = [];
  isLoading = true;

  // 勾選狀態：key 是 cartItemId，value 是 boolean
  checkedItems: Record<number, boolean> = {};

  // 賣家優惠券：key 是 sellerId
  sellerCouponCodes: Record<number, string> = {};
  appliedSellerCoupons: Record<number, AppliedSellerCoupon> = {};

  // 全站優惠券
  platformCouponCode = '';
  appliedPlatformCoupon: ValidateCouponResultDto | null = null;

  // 運費
  readonly shippingFee = 80;
  shippingDiscount = 0;  // 運費券折抵後變 0

  private destroy$ = new Subject<void>();

  constructor(
    private marketService: MarketService,
    private messageService: MessageService,
    private router: Router,
    private checkoutState: CheckoutStateService
  ) { }

  ngOnInit(): void {
    this.loadCart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCart(): void {
    this.isLoading = true;
    this.marketService.getCart()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.sellerGroups = data;
          // 預設全選
          data.forEach(group => {
            group.items.forEach(item => {
              this.checkedItems[item.cartItemId] = true;
            });
          });
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  // ── 勾選邏輯 ──────────────────────────────────────────
  get allChecked(): boolean {
    return this.allItems.length > 0 &&
      this.allItems.every(i => this.checkedItems[i.cartItemId]);
  }

  get checkedCount(): number {
    return this.checkedItemList.length;
  }

  get allItems(): CartItemDto[] {
    return this.sellerGroups.flatMap(g => g.items);
  }

  get checkedItemList(): CartItemDto[] {
    return this.allItems.filter(i => this.checkedItems[i.cartItemId]);
  }

  toggleAll(checked: boolean): void {
    this.allItems.forEach(i => {
      this.checkedItems[i.cartItemId] = checked;
    });
  }

  isSellerAllChecked(group: CartSellerGroupDto): boolean {
    return group.items.every(i => this.checkedItems[i.cartItemId]);
  }

  toggleSellerAll(group: CartSellerGroupDto, checked: boolean): void {
    group.items.forEach(i => {
      this.checkedItems[i.cartItemId] = checked;
    });
  }

  // ── 數量控制 ──────────────────────────────────────────
  updateQuantity(item: CartItemDto, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty < 1 || newQty > item.stock) return;

    this.marketService.updateCartItem(item.cartItemId, newQty)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          item.quantity = result.quantity;
          item.subtotal = result.subtotal;
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: '更新失敗',
            detail: err.error?.message ?? '數量更新失敗'
          });
        }
      });
  }

  // ── 刪除 ──────────────────────────────────────────────
  deleteItem(item: CartItemDto): void {
    this.marketService.deleteCartItem(item.cartItemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // 從畫面移除
          this.sellerGroups = this.sellerGroups
            .map(g => ({ ...g, items: g.items.filter(i => i.cartItemId !== item.cartItemId) }))
            .filter(g => g.items.length > 0);
          delete this.checkedItems[item.cartItemId];
        },
        error: () => { }
      });
  }

  deleteCheckedItems(): void {
    const toDelete = this.checkedItemList;
    if (toDelete.length === 0) return;

    let completed = 0;
    toDelete.forEach(item => {
      this.marketService.deleteCartItem(item.cartItemId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            completed++;
            this.sellerGroups = this.sellerGroups
              .map(g => ({ ...g, items: g.items.filter(i => i.cartItemId !== item.cartItemId) }))
              .filter(g => g.items.length > 0);
            delete this.checkedItems[item.cartItemId];
          }
        });
    });
  }

  // ── 優惠券 ────────────────────────────────────────────
  applySellerCoupon(group: CartSellerGroupDto): void {
    const code = this.sellerCouponCodes[group.sellerId]?.trim();
    if (!code) return;

    // 計算這個賣家被勾選商品的小計
    const sellerAmount = group.items
      .filter(i => this.checkedItems[i.cartItemId])
      .reduce((sum, i) => sum + i.subtotal, 0);

    this.marketService.validateCoupon({
      code,
      orderAmount: sellerAmount,
      sellerId: group.sellerId
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.appliedSellerCoupons[group.sellerId] = {
            sellerId: group.sellerId,
            couponId: result.couponId,
            couponName: result.couponName,
            appliedAmount: result.appliedAmount,
            message: result.message
          };
          this.messageService.add({
            severity: 'success',
            summary: '優惠券套用成功',
            detail: result.message,
            life: 3000
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: '優惠券無效',
            detail: err.error?.message ?? '優惠代碼不正確',
            life: 3000
          });
        }
      });
  }

  removeSellerCoupon(sellerId: number): void {
    delete this.appliedSellerCoupons[sellerId];
    this.sellerCouponCodes[sellerId] = '';
  }

  applyPlatformCoupon(): void {
    const code = this.platformCouponCode.trim();
    if (!code) return;

    this.marketService.validateCoupon({
      code,
      orderAmount: this.checkedSubtotal
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.scopeType === 'Shipping') {
            // 運費券
            this.shippingDiscount = 80;
            this.appliedPlatformCoupon = result;
          } else if (result.scopeType === 'Platform') {
            this.appliedPlatformCoupon = result;
            this.shippingDiscount = 0;
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: '此券不適用',
              detail: '此為賣場專屬券，請在對應賣家欄位輸入',
              life: 3000
            });
            return;
          }
          this.messageService.add({
            severity: 'success',
            summary: '優惠券套用成功',
            detail: result.message,
            life: 3000
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: '優惠券無效',
            detail: err.error?.message ?? '優惠代碼不正確',
            life: 3000
          });
        }
      });
  }

  removePlatformCoupon(): void {
    this.appliedPlatformCoupon = null;
    this.platformCouponCode = '';
    this.shippingDiscount = 0;
  }

  // ── 金額計算 ──────────────────────────────────────────
  get checkedSubtotal(): number {
    return this.checkedItemList.reduce((sum, i) => sum + i.subtotal, 0);
  }

  get sellerCouponDiscount(): number {
    return Object.values(this.appliedSellerCoupons)
      .reduce((sum, c) => sum + c.appliedAmount, 0);
  }

  get platformCouponDiscount(): number {
    return this.appliedPlatformCoupon?.appliedAmount ?? 0;
  }

  get finalShippingFee(): number {
    return this.shippingFee - this.shippingDiscount;
  }

  get grandTotal(): number {
    return Math.max(0,
      this.checkedSubtotal
      - this.sellerCouponDiscount
      - this.platformCouponDiscount
      + this.finalShippingFee
    );
  }

  getSellerSubtotal(group: CartSellerGroupDto): number {
    return group.items
      .filter(i => this.checkedItems[i.cartItemId])
      .reduce((sum, i) => sum + i.subtotal, 0);
  }

  getSellerOriginalSubtotal(group: CartSellerGroupDto): number {
    return group.items
      .filter(i => this.checkedItems[i.cartItemId])
      .reduce((sum, i) => sum + i.subtotal, 0);
  }

  // 收藏（目前先用 Toast 示意，等 JWT 整合再串 API）
  toggleItemFavorite(item: CartItemDto): void {
    this.messageService.add({
      severity: 'info',
      summary: '已加入收藏',
      detail: `「${item.productName}」已加入收藏清單`,
      life: 2000
    });
  }

  goToCheckout(): void {
    if (this.checkedCount === 0) return;

    // 把勾選的 cartItemIds 存進 CheckoutStateService
    const cartItemIds = this.checkedItemList.map(i => i.cartItemId);

    this.checkoutState.setCheckoutData({
      cartItemIds,
      globalRecipient: { name: '', phone: '', city: '', district: '', streetAddress: '' },
      sellerShipping: [],
      paymentMethod: 'ecpay',
      totalAmount: this.grandTotal
    });

    this.router.navigate(['/market/checkout/shipping']);
  }
}

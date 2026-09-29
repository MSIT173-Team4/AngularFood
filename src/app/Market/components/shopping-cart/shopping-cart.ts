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
import { SHIPPING_FEE_PER_SELLER } from '../../data/market-constants';


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
  readonly shippingFeePerSeller = SHIPPING_FEE_PER_SELLER;

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
    this.resetCoupons();
  }

  isSellerAllChecked(group: CartSellerGroupDto): boolean {
    return group.items.every(i => this.checkedItems[i.cartItemId]);
  }

  toggleSellerAll(group: CartSellerGroupDto, checked: boolean): void {
    group.items.forEach(i => {
      this.checkedItems[i.cartItemId] = checked;
    });
    this.resetCoupons(group.sellerId);
  }

  // 單一商品勾選變動（HTML 的 ngModelChange 呼叫）
  onItemCheckChange(item: CartItemDto): void {
    this.resetCoupons(this.findSellerId(item));
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
          if (this.checkedItems[item.cartItemId]) {
            this.resetCoupons(this.findSellerId(item));
          }
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
          if (this.checkedItems[item.cartItemId]) {
            this.resetCoupons(this.findSellerId(item));
          }
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
    this.resetCoupons();

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

    const sellerAmount = this.getSellerSubtotal(group);
    if (sellerAmount === 0) {
      this.messageService.add({
        severity: 'warn', summary: '無法套用',
        detail: '請先勾選此賣家的商品', life: 3000
      });
      return;
    }

    this.marketService.validateCoupon({
      code,
      orderAmount: sellerAmount,
      sellerId: group.sellerId
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.scopeType === 'Platform') {
            this.messageService.add({
              severity: 'warn', summary: '此券不適用',
              detail: '此為全站券，請在右側「全站優惠代碼」輸入', life: 3000
            });
            return;
          }
          this.appliedSellerCoupons[group.sellerId] = {
            sellerId: group.sellerId,
            couponId: result.couponId,
            couponName: result.couponName,
            scopeType: result.scopeType,
            appliedAmount: result.appliedAmount,
            message: result.message
          };
          this.messageService.add({
            severity: 'success', summary: '優惠券套用成功',
            detail: result.message, life: 3000
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error', summary: '優惠券無效',
            detail: err.error?.message ?? '優惠代碼不正確', life: 3000
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

    if (this.checkedCount === 0) {
      this.messageService.add({
        severity: 'warn', summary: '無法套用',
        detail: '請先勾選要結帳的商品', life: 3000
      });
      return;
    }

    this.marketService.validateCoupon({
      code,
      orderAmount: this.checkedSubtotal
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.scopeType === 'Store') {
            this.messageService.add({
              severity: 'warn', summary: '此券不適用',
              detail: '此為賣場專屬券，請在對應賣家欄位輸入', life: 3000
            });
            return;
          }
          // Platform（折扣）或 Shipping（全部賣家免運）都存在同一格，二選一
          this.appliedPlatformCoupon = result;
          const detail = result.scopeType === 'Shipping'
            ? `全部賣家免運，運費折抵 NT$ ${this.platformShippingSaved}`
            : result.message;
          this.messageService.add({
            severity: 'success', summary: '優惠券套用成功',
            detail, life: 3000
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error', summary: '優惠券無效',
            detail: err.error?.message ?? '優惠代碼不正確', life: 3000
          });
        }
      });
  }

  removePlatformCoupon(): void {
    this.appliedPlatformCoupon = null;
    this.platformCouponCode = '';
  }

  // ── 金額計算 ──────────────────────────────────────────
  get checkedSubtotal(): number {
    return this.checkedItemList.reduce((sum, i) => sum + i.subtotal, 0);
  }

  // 至少有一樣商品被勾選的賣家，才需要收運費
  get checkedSellerGroups(): CartSellerGroupDto[] {
    return this.sellerGroups.filter(g => g.items.some(i => this.checkedItems[i.cartItemId]));
  }

  // 某賣家的「商品折扣」；免運券不算在這裡
  getSellerStoreDiscount(sellerId: number): number {
    const c = this.appliedSellerCoupons[sellerId];
    return c && c.scopeType !== 'Shipping' ? c.appliedAmount : 0;
  }

  get sellerCouponDiscount(): number {
    return this.checkedSellerGroups
      .reduce((sum, g) => sum + this.getSellerStoreDiscount(g.sellerId), 0);
  }

  // 全站券只有 Platform 類型才折商品金額；Shipping 類型在運費那邊處理
  get platformCouponDiscount(): number {
    return this.appliedPlatformCoupon?.scopeType === 'Platform'
      ? this.appliedPlatformCoupon.appliedAmount
      : 0;
  }

  // 平台免運券 → 所有賣家免運；賣家免運券 → 只有該賣家免運
  isSellerShippingFree(sellerId: number): boolean {
    return this.appliedPlatformCoupon?.scopeType === 'Shipping'
      || this.appliedSellerCoupons[sellerId]?.scopeType === 'Shipping';
  }

  get finalShippingFee(): number {
    return this.checkedSellerGroups.reduce((sum, g) =>
      sum + (this.isSellerShippingFree(g.sellerId) ? 0 : this.shippingFeePerSeller), 0);
  }

  get freeShippingSellerCount(): number {
    return this.checkedSellerGroups.filter(g => this.isSellerShippingFree(g.sellerId)).length;
  }

  // 平台免運券實際省下的運費：已經用賣家免運券的賣家不重複計算
  get platformShippingSaved(): number {
    if (this.appliedPlatformCoupon?.scopeType !== 'Shipping') return 0;
    return this.checkedSellerGroups
      .filter(g => this.appliedSellerCoupons[g.sellerId]?.scopeType !== 'Shipping')
      .length * this.shippingFeePerSeller;
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
      // 只帶有勾選商品的賣家的券
      sellerCoupons: this.checkedSellerGroups
        .map(g => this.appliedSellerCoupons[g.sellerId])
        .filter((c): c is AppliedSellerCoupon => !!c),
      platformCoupon: this.appliedPlatformCoupon,
      totalAmount: this.grandTotal
    });

    this.router.navigate(['/market/checkout/shipping']);
  }

  // 折扣金額是按下套用當下算好的；勾選或數量一變就可能不準（例如不再滿額），
  // 所以直接移除，讓買家重新套用、由後端重新驗證
  private resetCoupons(sellerId?: number): void {
    let removed = false;

    // 全站券依賴整體金額，任何變動都要移除
    if (this.appliedPlatformCoupon) {
      this.removePlatformCoupon();
      removed = true;
    }

    // 有指定賣家就只移除該賣家的券；沒指定就全部移除
    const targetIds = sellerId !== undefined
      ? [sellerId]
      : Object.keys(this.appliedSellerCoupons).map(Number);

    targetIds.forEach(id => {
      if (this.appliedSellerCoupons[id]) {
        this.removeSellerCoupon(id);
        removed = true;
      }
    });

    if (removed) {
      this.messageService.add({
        severity: 'info', summary: '優惠券已移除',
        detail: '商品勾選或數量已變動，請重新套用優惠券', life: 3000
      });
    }
  }

  private findSellerId(item: CartItemDto): number | undefined {
    return this.sellerGroups
      .find(g => g.items.some(i => i.cartItemId === item.cartItemId))?.sellerId;
  }

}

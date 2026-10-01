import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { CheckoutStepsComponent } from '../checkout-steps/checkout-steps';
import {
  MarketService, UserProfileDto, ShippingAddress, CartSellerGroupDto,
  AppliedSellerCoupon, ValidateCouponResultDto
} from '../../Service/market';
import { TAIWAN_CITIES, City } from '../../data/taiwan-districts';
import { CheckoutStateService, CheckoutShippingData } from '../../Service/checkout-state.service';
import { environment } from '../../../../environments/environment';
import { SHIPPING_FEE_PER_SELLER } from '../../data/market-constants';

@Component({
  selector: 'app-checkout-shipping',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, ToastModule, CheckoutStepsComponent],
  providers: [MessageService],
  templateUrl: './checkout-shipping.html',
  styleUrl: './checkout-shipping.css'
})
export class CheckoutShippingComponent implements OnInit, OnDestroy {

  // 使用者資料
  userProfile: UserProfileDto | null = null;

  // 全域預設收件人
  globalRecipient = {
    name: '',
    phone: '',
    address: ''
  };

  // 縣市/區資料
  cities: City[] = TAIWAN_CITIES;

  // 購物車賣家（從 API 拿，用來顯示每個賣家的配送設定）
  sellerGroups: CartSellerGroupDto[] = [];

  // 每個賣家的配送地址設定
  // key: sellerId, value: 配送資料
  sellerShippingMap: Record<number, ShippingAddress> = {};
  sellerDistrictsMap: Record<number, string[]> = {};  // 每個賣家的區下拉

  private destroy$ = new Subject<void>();

  constructor(
    private marketService: MarketService,
    private messageService: MessageService,
    private router: Router,
    private checkoutState: CheckoutStateService
  ) { }

  selectedPayment = 'ecpay';
  cartItemIds: number[] = [];
  // 購物車頁套用的優惠券（從 CheckoutStateService 帶過來，只用於顯示試算）
  sellerCoupons: AppliedSellerCoupon[] = [];
  platformCoupon: ValidateCouponResultDto | null = null;
  isSubmitting = false;

  ngOnInit(): void {
    // 從 CheckoutStateService 拿購物車勾選資料
    const state = this.checkoutState.getCheckoutData();
    if (!state || state.cartItemIds.length === 0) {
      // 沒有資料，導回購物車
      this.router.navigate(['/market/cart']);
      return;
    }
    this.cartItemIds = state.cartItemIds;
    this.sellerCoupons = state.sellerCoupons ?? [];
    this.platformCoupon = state.platformCoupon ?? null;
    this.loadUserProfile();
    this.loadCart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserProfile(): void {
    // TODO: 之後換成從 JWT 拿 userId，目前寫死 userId=1
    this.marketService.getUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.userProfile = data;
          this.fillFromProfile();
        },
        error: () => { }
      });
  }

  loadCart(): void {
    this.marketService.getCart()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // 只保留購物車頁勾選的項目；整組都沒被勾的賣家直接拿掉
          this.sellerGroups = data
            .map(g => ({
              ...g,
              items: g.items.filter(i => this.cartItemIds.includes(i.cartItemId))
            }))
            .filter(g => g.items.length > 0);

          // 勾選的商品可能已在別的分頁被刪掉，沒東西可結就回購物車
          if (this.sellerGroups.length === 0) {
            this.router.navigate(['/market/cart']);
            return;
          }

          // 初始化每個賣家的配送設定（改成對過濾後的 sellerGroups 跑）
          this.sellerGroups.forEach(group => {
            this.sellerShippingMap[group.sellerId] = {
              recipientName: '',
              phone: '',
              city: '',
              district: '',
              streetAddress: '',
              useDefault: true
            };
            this.sellerDistrictsMap[group.sellerId] = [];
          });
        }
      });
  }

  // 套用會員帳號預設到全域收件人
  private fillFromProfile(): void {
    if (!this.userProfile) return;
    const p = this.userProfile;
    if (p.recipientName) this.globalRecipient.name = p.recipientName;
    if (p.phone) this.globalRecipient.phone = p.phone;
    if (p.address) this.globalRecipient.address = p.address;
  }

  // 「套用會員帳號預設」按鈕：買家改過後想恢復會員資料時使用
  applyUserProfile(): void {
    if (!this.userProfile) {
      this.messageService.add({
        severity: 'warn', summary: '無法套用',
        detail: '尚未取得會員資料', life: 2000
      });
      return;
    }
    this.fillFromProfile();
    this.messageService.add({
      severity: 'success', summary: '已套用',
      detail: '已帶入會員帳號資料', life: 2000
    });
  }

  // 個別賣家縣市變更
  onSellerCityChange(sellerId: number): void {
    const cityName = this.sellerShippingMap[sellerId]?.city;
    const city = this.cities.find(c => c.name === cityName);
    this.sellerDistrictsMap[sellerId] = city ? city.districts.map(d => d.name) : [];
    this.sellerShippingMap[sellerId].district = '';
  }

  // 切換個別賣家配送模式
  setSellerAddressMode(sellerId: number, useDefault: boolean): void {
    this.sellerShippingMap[sellerId].useDefault = useDefault;
    if (useDefault) {
      // 切回預設時清空個別填寫的資料
      this.sellerShippingMap[sellerId].city = '';
      this.sellerShippingMap[sellerId].district = '';
      this.sellerShippingMap[sellerId].streetAddress = '';
      this.sellerDistrictsMap[sellerId] = [];
    }
  }

  // 取得某個賣家實際使用的收件資料（顯示用）
  getEffectiveAddress(sellerId: number): string {
    const s = this.sellerShippingMap[sellerId];
    if (!s || s.useDefault) {
      return this.globalRecipient.address.trim() || '尚未填寫全域預設地址';
    }
    const parts = [s.city, s.district, s.streetAddress].filter(Boolean);
    return parts.join('') || '尚未填寫個別地址';
  }

  getEffectiveRecipient(sellerId: number): string {
    const s = this.sellerShippingMap[sellerId];
    if (!s || s.useDefault) {
      return this.globalRecipient.name
        ? `${this.globalRecipient.name}（${this.globalRecipient.phone}）`
        : '尚未填寫收件人';
    }
    return s.recipientName
      ? `${s.recipientName}（${s.phone}）`
      : '尚未填寫收件人';
  }

  // 表單驗證
  isFormValid(): boolean {
    if (this.isSubmitting) return false;
    // 全域收件人必填
    if (!this.globalRecipient.name.trim() || !this.globalRecipient.phone.trim() ||
      !this.globalRecipient.address.trim()) {
      return false;
    }
    // 有個別指定的賣家也要填完整
    for (const group of this.sellerGroups) {
      const s = this.sellerShippingMap[group.sellerId];
      if (!s.useDefault) {
        if (!s.recipientName || !s.phone || !s.city || !s.district || !s.streetAddress) {
          return false;
        }
      }
    }
    return true;
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: '請填寫完整',
        detail: '請確認所有必填欄位都已填寫',
        life: 3000
      });
      return;
    }

    this.isSubmitting = true;
    // 預設地址直接用整串；個別指定才由縣市 + 區 + 街道組合
    const sellerShippings = this.sellerGroups.map(g => {
      const s = this.sellerShippingMap[g.sellerId];
      if (s.useDefault) {
        return {
          sellerId: g.sellerId,
          recipientName: this.globalRecipient.name.trim(),
          recipientPhone: this.globalRecipient.phone.trim(),
          shippingAddress: this.globalRecipient.address.trim()
        };
      }
      return {
        sellerId: g.sellerId,
        recipientName: s.recipientName.trim(),
        recipientPhone: s.phone.trim(),
        shippingAddress: `${s.city}${s.district}${s.streetAddress.trim()}`
      };
    });

    // 只送券的 ID，折扣金額由後端重新驗證、重新計算
    const sellerCoupons = this.sellerCoupons
      .map(c => ({ sellerId: c.sellerId, couponId: c.couponId }));
    const platformCouponId = this.platformCoupon?.couponId ?? null;

    // Step 1：建立訂單
    this.marketService.createOrder({
      cartItemIds: this.cartItemIds,
      sellerShippings,
      sellerCoupons,
      platformCouponId
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          // Step 2：拿到 batchId，導到綠界付款頁面
          // 直接用 window.location.href 導到後端產生的 ECPay 表單
          window.location.href = `${environment.apiUrl}/Checkout/Pay/${result.batchId}`;
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({
            severity: 'error',
            summary: '建立訂單失敗',
            detail: err.error?.message ?? '請稍後再試',
            life: 3000
          });
        }
      });
  }

  getGroupSubtotal(group: CartSellerGroupDto): number {
    return group.items.reduce((sum, i) => sum + i.subtotal, 0);
  }

  readonly shippingFeePerSeller = SHIPPING_FEE_PER_SELLER;

  getItemsTotal(): number {
    return this.sellerGroups.reduce((sum, g) => sum + this.getGroupSubtotal(g), 0);
  }

  getSellerStoreDiscount(sellerId: number): number {
    const c = this.sellerCoupons.find(x => x.sellerId === sellerId);
    return c && c.scopeType !== 'Shipping' ? c.appliedAmount : 0;
  }

  get sellerDiscountTotal(): number {
    return this.sellerGroups.reduce((sum, g) => sum + this.getSellerStoreDiscount(g.sellerId), 0);
  }

  get platformDiscount(): number {
    return this.platformCoupon?.scopeType === 'Platform' ? this.platformCoupon.appliedAmount : 0;
  }

  isSellerShippingFree(sellerId: number): boolean {
    return this.platformCoupon?.scopeType === 'Shipping'
      || this.sellerCoupons.some(c => c.sellerId === sellerId && c.scopeType === 'Shipping');
  }

  getSellerShippingFee(sellerId: number): number {
    return this.isSellerShippingFree(sellerId) ? 0 : this.shippingFeePerSeller;
  }

  get freeShippingSellerCount(): number {
    return this.sellerGroups.filter(g => this.isSellerShippingFree(g.sellerId)).length;
  }

  getShippingTotal(): number {
    return this.sellerGroups.reduce((sum, g) => sum + this.getSellerShippingFee(g.sellerId), 0);
  }

  getGrandTotal(): number {
    return Math.max(0,
      this.getItemsTotal() - this.sellerDiscountTotal - this.platformDiscount + this.getShippingTotal());
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { CheckoutStepsComponent } from '../checkout-steps/checkout-steps';
import { MarketService, UserProfileDto, ShippingAddress, CartSellerGroupDto } from '../../Service/market';
import { TAIWAN_CITIES, City } from '../../data/taiwan-districts';

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
    city: '',
    district: '',
    streetAddress: ''
  };

  // 縣市/區資料
  cities: City[] = TAIWAN_CITIES;
  globalDistricts: string[] = [];

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
    private router: Router
  ) { }

  selectedPayment = 'ecpay';

  ngOnInit(): void {
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
        },
        error: () => { }
      });
  }

  loadCart(): void {
    this.marketService.getCart()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.sellerGroups = data;
          // 初始化每個賣家的配送設定（預設套用全域地址）
          data.forEach(group => {
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
  applyUserProfile(): void {
    if (!this.userProfile) return;
    this.globalRecipient.name = this.userProfile.username;
    this.globalRecipient.phone = this.userProfile.phone;
    this.globalRecipient.streetAddress = this.userProfile.address;
    // 縣市/區留給使用者自己選
    this.messageService.add({
      severity: 'success',
      summary: '已套用',
      detail: '已帶入會員帳號資料',
      life: 2000
    });
  }

  // 全域縣市變更 → 更新區下拉
  onGlobalCityChange(): void {
    const city = this.cities.find(c => c.name === this.globalRecipient.city);
    this.globalDistricts = city ? city.districts.map(d => d.name) : [];
    this.globalRecipient.district = '';  // 重設區
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
      const parts = [
        this.globalRecipient.city,
        this.globalRecipient.district,
        this.globalRecipient.streetAddress
      ].filter(Boolean);
      return parts.join('') || '尚未填寫全域預設地址';
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
    // 全域收件人必填
    if (!this.globalRecipient.name || !this.globalRecipient.phone ||
      !this.globalRecipient.city || !this.globalRecipient.district ||
      !this.globalRecipient.streetAddress) {
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
    // TODO: 之後這裡傳資料到確認付款頁面（步驟 3）
    this.messageService.add({
      severity: 'success',
      summary: '繼續',
      detail: '正在前往確認付款...',
      life: 1500
    });
  }

  getGroupSubtotal(group: CartSellerGroupDto): number {
    return group.items.reduce((sum, i) => sum + i.subtotal, 0);
  }

}

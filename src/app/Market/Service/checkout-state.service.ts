import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CheckoutShippingData {
  // 勾選的購物車項目 ID
  cartItemIds: number[];

  // 全域收件人
  globalRecipient: {
    name: string;
    phone: string;
    city: string;
    district: string;
    streetAddress: string;
  };

  // 每個賣家的配送設定
  sellerShipping: {
    sellerId: number;
    sellerName: string;
    useDefault: boolean;
    recipientName?: string;
    phone?: string;
    city?: string;
    district?: string;
    streetAddress?: string;
  }[];

  // 付款方式
  paymentMethod: string;

  // 金額（從購物車帶過來）
  totalAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class CheckoutStateService {
  // BehaviorSubject：有初始值、新訂閱者會立刻收到目前的值
  private _checkoutData = new BehaviorSubject<CheckoutShippingData | null>(null);

  // 只讀的 Observable（給外部訂閱用）
  checkoutData$ = this._checkoutData.asObservable();

  // 儲存資料
  setCheckoutData(data: CheckoutShippingData): void {
    this._checkoutData.next(data);
  }

  // 取得目前值（不用 subscribe，直接拿）
  getCheckoutData(): CheckoutShippingData | null {
    return this._checkoutData.getValue();
  }

  // 清空（結帳完成後呼叫）
  clear(): void {
    this._checkoutData.next(null);
  }
}

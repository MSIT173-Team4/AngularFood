import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MyOrderTab =
  'all' | 'pending-payment' | 'pending-ship' | 'to-receive' | 'completed' | 'to-review' | 'cancelled';

export type MyOrderRange = '6m' | '1y' | 'all';

// 後端判斷好的單張訂單狀態代碼
export type MyOrderStatusKey =
  'pending-payment' | 'pending-ship' | 'shipping' | 'delivered' | 'completed' | 'cancelled' | 'other';

export interface MyOrderItem {
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface MyOrder {
  orderId: number;
  orderNo: string;
  batchId: number;
  orderDate: string;
  sellerId: number;
  sellerName: string;
  orderStatus: number;
  paymentStatus: number;
  shippingStatus: number;
  statusKey: MyOrderStatusKey;
  subTotal: number;
  productDiscount: number;
  shippingFee: number;
  shippingDiscount: number;
  orderAmount: number;
  canReview: boolean;
  items: MyOrderItem[];
}

export interface MyOrderCounts {
  pendingPayment: number;
  pendingShip: number;
  toReceive: number;
  completed: number;
  toReview: number;
  cancelled: number;
  all: number;
}

export interface MyOrderListResult {
  items: MyOrder[];
  totalCount: number;
  counts: MyOrderCounts;
}

@Injectable({ providedIn: 'root' })
export class MarketOrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/MarketOrder`;

  getMyOrders(tab: MyOrderTab, range: MyOrderRange, keyword: string, page: number)
    : Observable<MyOrderListResult> {
    let params = new HttpParams()
      .set('tab', tab)
      .set('range', range)
      .set('page', page);
    if (keyword.trim()) params = params.set('keyword', keyword.trim());

    return this.http.get<MyOrderListResult>(`${this.baseUrl}/my`, { params, withCredentials: true });
  }
}

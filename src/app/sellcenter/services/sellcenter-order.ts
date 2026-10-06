import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SellerOrderTab = 'pending-ship' | 'shipping' | 'completed' | 'all';

export type SellerOrderStatusKey = 'pending-ship' | 'shipping' | 'delivered' | 'completed' | 'other';

export interface SellerOrderItem {
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SellerOrder {
  orderId: number;
  orderNo: string;
  orderDate: string;
  paidAt: string | null;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  shippingMethod: string;
  orderStatus: number;
  shippingStatus: number;
  statusKey: SellerOrderStatusKey;
  subTotal: number;
  productDiscount: number;
  shippingFee: number;
  shippingDiscount: number;
  orderAmount: number;
  items: SellerOrderItem[];
}

export interface SellerOrderCounts {
  pendingShip: number;
  shipping: number;
  completed: number;
  all: number;
}

export interface SellerOrderListResult {
  items: SellerOrder[];
  totalCount: number;
  counts: SellerOrderCounts;
}

@Injectable({ providedIn: 'root' })
export class SellcenterOrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/MarketSeller/orders`;
  private readonly withCred = { withCredentials: true };

  getOrders(tab: SellerOrderTab, keyword: string, page: number): Observable<SellerOrderListResult> {
    let params = new HttpParams().set('tab', tab).set('page', page);
    if (keyword.trim()) params = params.set('keyword', keyword.trim());
    return this.http.get<SellerOrderListResult>(this.baseUrl, { params, ...this.withCred });
  }

  ship(orderId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${orderId}/ship`, {}, this.withCred);
  }
}

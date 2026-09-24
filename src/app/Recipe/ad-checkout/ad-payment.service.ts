import { Injectable } from '@angular/core';
import { Observable, delay, map, of, tap, timer } from 'rxjs';

import {
  AdPaymentOrder,
  CardAuthorizationRequest,
  CreateAdPaymentOrderRequest
} from './ad-payment.models';

@Injectable({ providedIn: 'root' })
export class AdPaymentPresentationService {
  private readonly storageKey = 'friendly-food.recipe.ad-payment-orders';

  createOrder(request: CreateAdPaymentOrderRequest): Observable<AdPaymentOrder> {
    const order: AdPaymentOrder = {
      ...request,
      orderNo: this.createOrderNumber(),
      paymentProvider: 'TapPay',
      paymentStatus: 'created',
      createdAt: new Date().toISOString(),
      paidAt: null,
      emailSentAt: null,
      emailVerifiedAt: null,
      transactionId: null,
      authorizationCode: null,
      cardBrand: null,
      cardLastFour: null
    };

    this.saveOrder(order);
    return of(order).pipe(delay(500));
  }

  authorizePayment(
    order: AdPaymentOrder,
    card: CardAuthorizationRequest
  ): Observable<AdPaymentOrder> {
    const digits = card.cardNumber.replace(/\D/g, '');
    const authorizingOrder: AdPaymentOrder = { ...order, paymentStatus: 'authorizing' };
    this.saveOrder(authorizingOrder);

    return timer(1800).pipe(
      map((): AdPaymentOrder => ({
        ...authorizingOrder,
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
        transactionId: `TP${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`,
        authorizationCode: Math.floor(100000 + Math.random() * 900000).toString(),
        cardBrand: this.resolveCardBrand(digits),
        cardLastFour: digits.slice(-4)
      })),
      tap((paidOrder) => this.saveOrder(paidOrder))
    );
  }

  markOtpSent(order: AdPaymentOrder): AdPaymentOrder {
    const updatedOrder: AdPaymentOrder = {
      ...order,
      paymentStatus: 'otp-pending',
      emailSentAt: new Date().toISOString()
    };
    this.saveOrder(updatedOrder);
    return updatedOrder;
  }

  completeEmailVerification(order: AdPaymentOrder): AdPaymentOrder {
    const completedOrder: AdPaymentOrder = {
      ...order,
      paymentStatus: 'completed',
      emailVerifiedAt: new Date().toISOString()
    };
    this.saveOrder(completedOrder);
    return completedOrder;
  }

  private resolveCardBrand(cardNumber: string): string {
    if (/^4/.test(cardNumber)) return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return 'Mastercard';
    if (/^3[47]/.test(cardNumber)) return 'American Express';
    if (/^35/.test(cardNumber)) return 'JCB';
    return 'Credit Card';
  }

  private createOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-10);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `AD${timestamp}${randomSuffix}`;
  }

  private saveOrder(order: AdPaymentOrder): void {
    if (typeof localStorage === 'undefined') return;

    const orders = this.readOrders();
    const existingIndex = orders.findIndex((item) => item.orderNo === order.orderNo);
    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else {
      orders.unshift(order);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(orders.slice(0, 20)));
  }

  private readOrders(): AdPaymentOrder[] {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? '[]') as AdPaymentOrder[];
    } catch {
      return [];
    }
  }
}

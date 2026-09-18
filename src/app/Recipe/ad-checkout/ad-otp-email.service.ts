import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';

import { AD_EMAILJS_CONFIG } from './ad-email.config';

export interface AdOtpEmailRequest {
  recipientEmail: string;
  recipientName: string;
  otpCode: string;
  orderNo: string;
  productName: string;
  totalAmount: number;
}

@Injectable({ providedIn: 'root' })
export class AdOtpEmailService {
  private readonly http = inject(HttpClient);

  get isConfigured(): boolean {
    return Boolean(
      AD_EMAILJS_CONFIG.serviceId
      && AD_EMAILJS_CONFIG.templateId
      && AD_EMAILJS_CONFIG.publicKey
    );
  }

  sendOtp(request: AdOtpEmailRequest): Observable<void> {
    if (!this.isConfigured) {
      return throwError(() => new Error('EMAIL_SERVICE_NOT_CONFIGURED'));
    }

    return this.http.post(
      AD_EMAILJS_CONFIG.endpoint,
      {
        service_id: AD_EMAILJS_CONFIG.serviceId,
        template_id: AD_EMAILJS_CONFIG.templateId,
        user_id: AD_EMAILJS_CONFIG.publicKey,
        template_params: {
          to_email: request.recipientEmail,
          to_name: request.recipientName,
          otp_code: request.otpCode,
          order_no: request.orderNo,
          product_name: request.productName,
          total_amount: `NT$ ${request.totalAmount}`,
          expires_in: '5 分鐘'
        }
      },
      { responseType: 'text' }
    ).pipe(map(() => undefined));
  }
}

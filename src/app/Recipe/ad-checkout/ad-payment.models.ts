export type AdPaymentStatus =
  | 'created'
  | 'authorizing'
  | 'paid'
  | 'otp-pending'
  | 'completed';

export interface CreateAdPaymentOrderRequest {
  advertiserName: string;
  productName: string;
  placement: string;
  rentalDays: number;
  totalAmount: number;
  contactEmail: string;
}

export interface CardAuthorizationRequest {
  cardholderName: string;
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
}

export interface AdPaymentOrder extends CreateAdPaymentOrderRequest {
  orderNo: string;
  paymentProvider: 'TapPay';
  paymentStatus: AdPaymentStatus;
  createdAt: string;
  paidAt: string | null;
  emailSentAt: string | null;
  emailVerifiedAt: string | null;
  transactionId: string | null;
  authorizationCode: string | null;
  cardBrand: string | null;
  cardLastFour: string | null;
}

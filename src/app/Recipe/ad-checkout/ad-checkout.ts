import { FormsModule } from '@angular/forms';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { AdPaymentOrder } from './ad-payment.models';
import { AdPaymentPresentationService } from './ad-payment.service';
import { AdOtpEmailService } from './ad-otp-email.service';

type CheckoutStage =
  | 'order-review'
  | 'card-entry'
  | 'processing'
  | 'email-sending'
  | 'otp-verification'
  | 'success';

@Component({
  selector: 'app-ad-checkout',
  imports: [FormsModule, ButtonModule, DialogModule],
  templateUrl: './ad-checkout.html',
  styleUrl: './ad-checkout.css'
})
export class AdCheckout implements OnChanges, OnDestroy {
  private readonly paymentService = inject(AdPaymentPresentationService);
  private readonly otpEmailService = inject(AdOtpEmailService);
  private otpCode = '';
  private otpTimer: ReturnType<typeof setInterval> | null = null;

  @Input() visible = false;
  @Input() advertiserName = '';
  @Input() productName = '';
  @Input() placement = '';
  @Input() rentalDays = 7;
  @Input() totalPrice = 0;
  @Input() contactEmail = '';
  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly returnToApplication = new EventEmitter<void>();

  readonly checkoutStage = signal<CheckoutStage>('order-review');
  readonly currentOrder = signal<AdPaymentOrder | null>(null);
  readonly isProcessing = signal(false);
  readonly submitAttempted = signal(false);
  readonly cardholderName = signal('');
  readonly cardNumber = signal('');
  readonly expirationMonth = signal('');
  readonly expirationYear = signal('');
  readonly securityCode = signal('');
  readonly otpInput = signal('');
  readonly otpError = signal('');
  readonly emailError = signal('');
  readonly otpSecondsRemaining = signal(0);
  readonly resendSecondsRemaining = signal(0);

  readonly cardBrand = computed(() => {
    const digits = this.cardNumber().replace(/\D/g, '');
    if (/^4/.test(digits)) return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
    if (/^3[47]/.test(digits)) return 'American Express';
    if (/^35/.test(digits)) return 'JCB';
    return 'TapPay';
  });

  readonly isCardholderNameValid = computed(() => this.cardholderName().trim().length >= 2);
  readonly isCardNumberValid = computed(() => this.isValidCardNumber(this.cardNumber()));
  readonly isExpirationValid = computed(() => this.isValidExpiration());
  readonly isSecurityCodeValid = computed(() => /^\d{3,4}$/.test(this.securityCode()));
  readonly isPaymentFormValid = computed(() =>
    this.isCardholderNameValid()
    && this.isCardNumberValid()
    && this.isExpirationValid()
    && this.isSecurityCodeValid()
  );
  readonly maskedEmail = computed(() => this.maskEmail(this.contactEmail));
  readonly otpCountdown = computed(() => {
    const seconds = this.otpSecondsRemaining();
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.resetCheckout();
    }
  }

  ngOnDestroy(): void {
    this.stopOtpTimer();
  }

  createOrder(): void {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    this.paymentService.createOrder({
      advertiserName: this.advertiserName,
      productName: this.productName,
      placement: this.placement,
      rentalDays: this.rentalDays,
      totalAmount: this.totalPrice,
      contactEmail: this.contactEmail
    }).subscribe({
      next: (order) => {
        this.currentOrder.set(order);
        this.checkoutStage.set('card-entry');
        this.isProcessing.set(false);
      },
      error: () => this.isProcessing.set(false)
    });
  }

  submitPayment(): void {
    this.submitAttempted.set(true);
    const order = this.currentOrder();
    if (!order || !this.isPaymentFormValid() || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.checkoutStage.set('processing');
    this.paymentService.authorizePayment(order, {
      cardholderName: this.cardholderName().trim(),
      cardNumber: this.cardNumber(),
      expirationMonth: this.expirationMonth(),
      expirationYear: this.expirationYear(),
      securityCode: this.securityCode()
    }).subscribe({
      next: (paidOrder) => {
        this.currentOrder.set(paidOrder);
        this.clearSensitiveCardData();
        this.checkoutStage.set('email-sending');
        this.sendOtpEmail(paidOrder);
      },
      error: () => {
        this.checkoutStage.set('card-entry');
        this.isProcessing.set(false);
      }
    });
  }

  updateCardNumber(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    this.cardNumber.set(digits.replace(/(.{4})/g, '$1 ').trim());
  }

  updateExpirationMonth(value: string): void {
    this.expirationMonth.set(value.replace(/\D/g, '').slice(0, 2));
  }

  updateExpirationYear(value: string): void {
    this.expirationYear.set(value.replace(/\D/g, '').slice(0, 2));
  }

  updateSecurityCode(value: string): void {
    this.securityCode.set(value.replace(/\D/g, '').slice(0, 4));
  }

  updateOtp(value: string): void {
    this.otpInput.set(value.replace(/\D/g, '').slice(0, 6));
    this.otpError.set('');
  }

  verifyOtp(): void {
    if (this.otpSecondsRemaining() <= 0) {
      this.otpError.set('驗證碼已逾時，請重新寄送。');
      return;
    }

    if (this.otpInput() !== this.otpCode) {
      this.otpError.set('驗證碼不正確，請重新確認信件內容。');
      return;
    }

    const order = this.currentOrder();
    if (!order) return;

    this.currentOrder.set(this.paymentService.completeEmailVerification(order));
    this.stopOtpTimer();
    this.checkoutStage.set('success');
  }

  resendOtp(): void {
    const order = this.currentOrder();
    if (!order || this.resendSecondsRemaining() > 0 || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.emailError.set('');
    this.sendOtpEmail(order);
  }

  returnToApplicationForm(): void {
    this.visibleChange.emit(false);
    this.returnToApplication.emit();
  }

  closeCheckout(): void {
    this.visibleChange.emit(false);
  }

  private sendOtpEmail(order: AdPaymentOrder): void {
    this.otpCode = this.createOtpCode();
    this.otpInput.set('');
    this.otpError.set('');
    this.emailError.set('');

    this.otpEmailService.sendOtp({
      recipientEmail: order.contactEmail,
      recipientName: order.advertiserName,
      otpCode: this.otpCode,
      orderNo: order.orderNo,
      productName: order.productName,
      totalAmount: order.totalAmount
    }).subscribe({
      next: () => {
        this.currentOrder.set(this.paymentService.markOtpSent(order));
        this.checkoutStage.set('otp-verification');
        this.startOtpTimer();
        this.isProcessing.set(false);
      },
      error: (error: Error) => {
        this.checkoutStage.set('otp-verification');
        this.emailError.set(
          error.message === 'EMAIL_SERVICE_NOT_CONFIGURED'
            ? 'OTP 寄信服務尚未設定，請先填入 EmailJS 公開識別值。'
            : '驗證信寄送失敗，請稍後重新寄送。'
        );
        this.isProcessing.set(false);
      }
    });
  }

  private resetCheckout(): void {
    this.checkoutStage.set('order-review');
    this.currentOrder.set(null);
    this.isProcessing.set(false);
    this.submitAttempted.set(false);
    this.cardholderName.set('');
    this.cardNumber.set('');
    this.expirationMonth.set('');
    this.expirationYear.set('');
    this.securityCode.set('');
    this.otpInput.set('');
    this.otpError.set('');
    this.emailError.set('');
    this.otpSecondsRemaining.set(0);
    this.resendSecondsRemaining.set(0);
    this.otpCode = '';
    this.stopOtpTimer();
  }

  private clearSensitiveCardData(): void {
    this.cardNumber.set('');
    this.expirationMonth.set('');
    this.expirationYear.set('');
    this.securityCode.set('');
  }

  private isValidCardNumber(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    const isSupportedCard = /^4\d{15}$/.test(digits)
      || /^(5[1-5]|2[2-7])\d{14}$/.test(digits)
      || /^3[47]\d{13}$/.test(digits)
      || /^35\d{14,17}$/.test(digits);
    if (!isSupportedCard || /^(\d)\1+$/.test(digits)) return false;

    let sum = 0;
    let shouldDouble = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index]);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  private isValidExpiration(): boolean {
    const month = Number(this.expirationMonth());
    const year = Number(this.expirationYear());
    if (month < 1 || month > 12 || this.expirationYear().length !== 2) return false;

    const now = new Date();
    const fullYear = 2000 + year;
    return fullYear > now.getFullYear()
      || (fullYear === now.getFullYear() && month >= now.getMonth() + 1);
  }

  private maskEmail(email: string): string {
    const [localPart, domain = ''] = email.split('@');
    if (!localPart || !domain) return email;
    const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));
    return `${visiblePrefix}${'*'.repeat(Math.max(3, localPart.length - visiblePrefix.length))}@${domain}`;
  }

  private createOtpCode(): string {
    const randomValues = new Uint32Array(1);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
      return (100000 + (randomValues[0] % 900000)).toString();
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private startOtpTimer(): void {
    this.stopOtpTimer();
    this.otpSecondsRemaining.set(300);
    this.resendSecondsRemaining.set(30);
    this.otpTimer = setInterval(() => {
      this.otpSecondsRemaining.update((seconds) => Math.max(0, seconds - 1));
      this.resendSecondsRemaining.update((seconds) => Math.max(0, seconds - 1));
    }, 1000);
  }

  private stopOtpTimer(): void {
    if (this.otpTimer) {
      clearInterval(this.otpTimer);
      this.otpTimer = null;
    }
  }
}

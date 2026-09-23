import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CheckoutStep {
  step: number;
  label: string;
  subLabel: string;
}

@Component({
  selector: 'app-checkout-steps',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-steps.html',
  styleUrl: './checkout-steps.css'
})
export class CheckoutStepsComponent {
  @Input() currentStep: number = 1;

  steps: CheckoutStep[] = [
    { step: 1, label: '購物清單', subLabel: '' },
    { step: 2, label: '填寫運送與發票', subLabel: '地址・配送時段' },
    { step: 3, label: '確認付款', subLabel: '多元安全支付' },
    { step: 4, label: '訂單完成', subLabel: '食材即刻入庫' },
  ];
}

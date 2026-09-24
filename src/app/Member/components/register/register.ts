import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { UserRegisterDTO } from '../../interfaces/UserRegisterDTO';

// PrimeNG
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { environment } from '../../../../environments/environment.development';
@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    StepperModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    MessageModule,
    CardModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  constructor(private http: HttpClient) {}

  baseURL = environment.apiUrl;

  errorMsg = '';
  isSubmitting = false;

  // Step 1
  termsAccepted = false;

  // Step 2
  registerData = this.fb.nonNullable.group({
    fUserName: ['', Validators.required],

    fPassword: ['', [Validators.required, Validators.minLength(8)]],

    fEmail: ['', [Validators.required, Validators.email]],

    fPhone: ['', [Validators.required, Validators.pattern(/^09[0-9]{8}$/)]],

    fAddress: ['', Validators.required],

    fIdNum: ['', [Validators.required, Validators.pattern(/^[A-Z][1289]\d{8}$/)]],
  });
  goToLogin(): void {
    this.router.navigate(['/login']);
  }
  register(): void {
    if (this.registerData.invalid) {
      this.registerData.markAllAsTouched();
      return;
    }

    const data: UserRegisterDTO = this.registerData.getRawValue();

    this.errorMsg = '';
    this.isSubmitting = true;

    console.log('送出的資料：', data);

    this.http.post(`${this.baseURL}/Users/Register`, data).subscribe({
      next: (response) => {
        console.log('API 回傳：', response);

        this.isSubmitting = false;

        // 註冊成功回登入頁
        this.router.navigate(['/login']);
      },

      error: (error) => {
        console.error('API 錯誤：', error);

        this.errorMsg = error.error?.message ?? '註冊失敗，請稍後再試';

        this.isSubmitting = false;
      },
    });
  }
}

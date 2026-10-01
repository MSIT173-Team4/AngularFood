import { Component, inject, Output, EventEmitter } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../../../../environments/environment.development';

@Component({
  selector: 'app-apply',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './apply.html',
  styleUrl: './apply.css',
})
export class Apply {
  @Output() applySuccess = new EventEmitter<void>();
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  baseURL = environment.apiUrl;

  idCard: File | null = null;
  idCardPreview: string | null = null;

  applyForm = this.fb.nonNullable.group({
    lastName: ['', Validators.required],

    firstName: ['', Validators.required],

    phone: ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],

    idNumber: ['', [Validators.required, Validators.pattern(/^[A-Z][12]\d{8}$/)]],

    storeName: ['', [Validators.required, Validators.maxLength(50)]],

    storeDescription: ['', [Validators.maxLength(500)]],
  });

  onIdCardSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      return;
    }

    this.idCard = file;

    this.idCardPreview = URL.createObjectURL(file);
  }

  submit() {
    if (this.applyForm.invalid || !this.idCard) {
      this.applyForm.markAllAsTouched();
      return;
    }

    const value = this.applyForm.getRawValue();

    const formData = new FormData();

    formData.append('LastName', value.lastName);
    formData.append('FirstName', value.firstName);
    formData.append('Phone', value.phone);
    formData.append('IdNumber', value.idNumber);

    // 商家資料
    formData.append('StoreName', value.storeName);
    formData.append('StoreDescription', value.storeDescription);
    formData.append('idcard', this.idCard, this.idCard.name);
    this.http
      .post(`${this.baseURL}/Users/Apply`, formData, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          console.log('申請成功', res);
          this.applySuccess.emit();
        },

        error: (err) => {
          console.error('status:', err.status);
          console.error('後端訊息:', err.error);
        },
      });
  }
}

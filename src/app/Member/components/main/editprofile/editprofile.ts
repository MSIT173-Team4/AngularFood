import {
  Component,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

import { HttpClient } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

import { environment } from '../../../../../environments/environment.development';
import { UserProfileDTO } from '../../../interfaces/UserProfileDTO';
@Component({
  selector: 'app-edit-profile',
  imports: [ReactiveFormsModule, ImageCropperComponent, DialogModule, ButtonModule],
  templateUrl: './editprofile.html',
  styleUrl: './editprofile.css',
})
export class EditProfile implements OnChanges {
  @Input() userInfo!: UserProfileDTO;
  @Output() updated = new EventEmitter<void>();
  private http = inject(HttpClient);

  baseURL = environment.apiUrl;

  previewUrl: string | null = null;

  selectedImage: File | null = null;

  cropperVisible = false;

  croppedImageUrl: string | null = null;

  croppedBlob: Blob | null = null;

  editForm;

  constructor(private fb: FormBuilder) {
    this.editForm = this.fb.nonNullable.group({
      lastName: ['', Validators.required],

      firstName: ['', Validators.required],

      username: ['', Validators.required],

      phone: ['', [Validators.required, Validators.pattern(/^09[0-9]{8}$/)]],

      address: ['', Validators.required],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInfo'] && this.userInfo) {
      this.editForm.patchValue({
        lastName: this.userInfo.lastname ?? '',
        firstName: this.userInfo.firstname ?? '',
        username: this.userInfo.username ?? '',
        phone: this.userInfo.phone ?? '',
        address: this.userInfo.address ?? '',
      });

      this.previewUrl = this.getUserImage(this.userInfo.image);
    }
  }

  getUserImage(image?: string | null): string | null {
    if (!image) {
      return null;
    }

    return `https://localhost:7164${image}`;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    this.selectedImage = file;
    this.croppedBlob = null;
    this.croppedImageUrl = null;

    const reader = new FileReader();

    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };

    reader.readAsDataURL(file);
    this.cropperVisible = true;
  }

  openCropper() {
    if (!this.selectedImage) {
      return;
    }

    this.cropperVisible = true;
  }

  imageCropped(event: ImageCroppedEvent) {
    if (event.objectUrl) {
      this.croppedImageUrl = event.objectUrl;
    }

    if (event.blob) {
      this.croppedBlob = event.blob;
    }
  }

  confirmCrop() {
    if (!this.croppedImageUrl || !this.croppedBlob) {
      return;
    }

    this.previewUrl = this.croppedImageUrl;
    this.cropperVisible = false;
  }

  cancelCrop() {
    this.cropperVisible = false;
  }

  submit() {
    if (this.editForm.invalid) {
      return;
    }

    const value = this.editForm.getRawValue();

    const formData = new FormData();

    formData.append('LastName', value.lastName);
    formData.append('FirstName', value.firstName);
    formData.append('Username', value.username);
    formData.append('Phone', value.phone);
    formData.append('Address', value.address);

    if (this.croppedBlob) {
      formData.append('img', this.croppedBlob, 'profile.jpg');
    }
    this.http
      .post(`${this.baseURL}/Users/EditProfile`, formData, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          console.log('更新成功', res);
          this.updated.emit();
        },

        error: (err) => {
          console.error('更新失敗', err);
        },
      });
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  SellcenterProductService,
  MarketCategory,
  ProductImage,
} from '../services/sellcenter-product';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

// 畫面上統一用這個結構表示一張圖片
interface DisplayImage {
  imageId: number | null;  // null = 新上傳的，有值 = 舊圖
  previewUrl: string;
  file: File | null;       // null = 舊圖，有值 = 新上傳
  toDelete: boolean;
}

export interface ProductFormData {
  productName: string;
  parentCategoryId: number | null;
  productsCategoryNo: string;
  price: number | null;
  stock: number | null;
  brandOrOrigin: string;
  manufacturingDate: string;
  expirationDate: string;
  description: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    ToastModule,
    DialogModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isEditMode = false;
  editProductId: number | null = null;
  pageLoading = false;

  form: ProductFormData = {
    productName: '',
    parentCategoryId: null,
    productsCategoryNo: '',
    price: null,
    stock: null,
    brandOrOrigin: '',
    manufacturingDate: '',
    expirationDate: '',
    description: '',
  };

  topCategories: MarketCategory[] = [];
  subCategories: MarketCategory[] = [];

  // 統一用 DisplayImage 管理所有圖片
  displayImages: DisplayImage[] = [];
  readonly MAX_IMAGES = 5;

  showPreview = false;
  showImageZoom = false;
  zoomedImage = '';
  submitting = false;

  constructor(
    private productService: SellcenterProductService,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.loadCategories();

    // 判斷是新增還是編輯
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.editProductId = Number(id);
      this.loadProduct(this.editProductId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageTitle(): string {
    return this.isEditMode ? '編輯商品' : '新增商品';
  }

  get activeImages(): DisplayImage[] {
    return this.displayImages.filter(img => !img.toDelete);
  }

  get mainImagePreview(): string {
    return this.activeImages[0]?.previewUrl ?? '';
  }

  // ── 載入分類 ──────────────────────────────────────────
  loadCategories(): void {
    this.productService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories: MarketCategory[]) => {
          this.topCategories = categories;
          // 編輯模式下分類已載入，更新子分類清單
          if (this.isEditMode && this.form.productsCategoryNo) {
            this.syncSubCategories();
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error', summary: '載入失敗', detail: '無法取得商品分類',
          });
        },
      });
  }

  // ── 載入商品（編輯模式）────────────────────────────────
  loadProduct(id: number): void {
    this.pageLoading = true;
    this.productService.getSellerProductDetail(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.form = {
            productName: product.productName,
            parentCategoryId: null,
            productsCategoryNo: product.productsCategoryNo,
            price: product.price,
            stock: product.stock,
            brandOrOrigin: product.brandOrOrigin ?? '',
            manufacturingDate: product.manufacturingDate
              ? product.manufacturingDate.substring(0, 10) : '',
            expirationDate: product.expirationDate
              ? product.expirationDate.substring(0, 10) : '',
            description: product.description ?? '',
          };

          // 把舊圖轉成 DisplayImage
          this.displayImages = product.images.map(img => ({
            imageId: img.imageId,
            previewUrl: img.imageUrl,
            file: null,
            toDelete: false,
          }));

          this.syncSubCategories();
          this.pageLoading = false;
        },
        error: () => {
          this.pageLoading = false;
          this.messageService.add({
            severity: 'error', summary: '載入失敗', detail: '無法取得商品資料',
          });
        },
      });
  }

  // 根據 productsCategoryNo 反查 parentCategoryId，更新子分類清單
  syncSubCategories(): void {
    for (const top of this.topCategories) {
      const matched = top.children.find(
        c => c.categoryNo === this.form.productsCategoryNo
      );
      if (matched) {
        this.form.parentCategoryId = top.categoryId;
        this.subCategories = top.children;
        return;
      }
    }
  }

  onTopCategoryChange(): void {
    this.form.productsCategoryNo = '';
    const selected = this.topCategories.find(
      c => c.categoryId === this.form.parentCategoryId
    );
    this.subCategories = selected?.children ?? [];
  }

  // ── 圖片操作 ──────────────────────────────────────────
  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    const remaining = this.MAX_IMAGES - this.activeImages.length;

    if (remaining <= 0) {
      this.messageService.add({
        severity: 'warn', summary: '已達上限',
        detail: `最多只能上傳 ${this.MAX_IMAGES} 張圖片`,
      });
      input.value = '';
      return;
    }

    if (files.length > remaining) {
      this.messageService.add({
        severity: 'warn', summary: '部分圖片未加入',
        detail: `只能再新增 ${remaining} 張，已自動取前 ${remaining} 張`,
      });
    }

    const toAdd = files.slice(0, remaining);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.displayImages.push({
          imageId: null,
          previewUrl: e.target?.result as string,
          file,
          toDelete: false,
        });
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  removeImage(index: number): void {
    const img = this.activeImages[index];
    if (img.imageId !== null) {
      // 舊圖：標記刪除
      img.toDelete = true;
    } else {
      // 新圖：直接從陣列移除
      const realIndex = this.displayImages.indexOf(img);
      this.displayImages.splice(realIndex, 1);
    }
  }

  dropImage(event: CdkDragDrop<DisplayImage[]>): void {
    moveItemInArray(this.activeImages, event.previousIndex, event.currentIndex);
    // 同步回 displayImages（保留 toDelete 的位置不動）
    const active = this.activeImages;
    const deleted = this.displayImages.filter(img => img.toDelete);
    this.displayImages = [...active, ...deleted];
  }

  // ── 預覽 ──────────────────────────────────────────────
  openPreview(): void { this.showPreview = true; }
  openZoom(src: string): void {
    this.zoomedImage = src;
    this.showImageZoom = true;
  }

  // ── 送出 ──────────────────────────────────────────────
  submit(): void {
    if (!this.validateForm()) return;
    this.isEditMode ? this.doUpdate() : this.doCreate(1);
  }

  saveDraft(): void {
    if (!this.validateForm(true)) return;
    this.isEditMode ? this.doUpdate() : this.doCreate(3);
  }

  private validateForm(isDraft = false): boolean {
    if (!this.form.productName.trim()) {
      this.messageService.add({ severity: 'warn', summary: '請填寫商品名稱' });
      return false;
    }
    if (!isDraft) {
      if (!this.form.productsCategoryNo) {
        this.messageService.add({ severity: 'warn', summary: '請選擇商品分類' });
        return false;
      }
      if (!this.form.price || this.form.price <= 0) {
        this.messageService.add({ severity: 'warn', summary: '請填寫有效售價' });
        return false;
      }
      if (this.form.stock === null || this.form.stock < 0) {
        this.messageService.add({ severity: 'warn', summary: '請填寫庫存數量' });
        return false;
      }
    }
    return true;
  }

  private buildFormData(status?: number): FormData {
    const formData = new FormData();
    formData.append('productName', this.form.productName);
    formData.append('productsCategoryNo', this.form.productsCategoryNo);
    formData.append('price', String(this.form.price ?? 0));
    formData.append('stock', String(this.form.stock ?? 0));
    formData.append('brandOrOrigin', this.form.brandOrOrigin);
    formData.append('description', this.form.description);
    if (this.form.manufacturingDate)
      formData.append('manufacturingDate', this.form.manufacturingDate);
    if (this.form.expirationDate)
      formData.append('expirationDate', this.form.expirationDate);
    if (status !== undefined)
      formData.append('productStatus', String(status));
    return formData;
  }

  private doCreate(status: number): void {
    this.submitting = true;
    const formData = this.buildFormData(status);
    this.activeImages
      .filter(img => img.file)
      .forEach(img => formData.append('images', img.file!));

    this.productService.createProduct(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: status === 1 ? '商品已上架！' : '草稿已儲存！',
          });
          setTimeout(() => this.router.navigate(['/sellcenter/products']), 1500);
        },
        error: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error', summary: '送出失敗', detail: '請稍後再試',
          });
        },
      });
  }

  private doUpdate(): void {
    this.submitting = true;
    const formData = this.buildFormData();

    // 要刪除的舊圖 id
    const deleteIds = this.displayImages
      .filter(img => img.toDelete && img.imageId !== null)
      .map(img => img.imageId!);
    deleteIds.forEach(id => formData.append('deleteImageIds', String(id)));

    // 新上傳的圖片
    this.activeImages
      .filter(img => img.file)
      .forEach(img => formData.append('newImages', img.file!));

    // 最終排序（只傳保留的舊圖 id，依順序）
    const imageOrder = this.activeImages
      .filter(img => img.imageId !== null)
      .map(img => img.imageId!);
    imageOrder.forEach(id => formData.append('imageOrder', String(id)));

    this.productService.updateProduct(this.editProductId!, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success', summary: '更新成功！',
          });
          setTimeout(() => this.router.navigate(['/sellcenter/products']), 1500);
        },
        error: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error', summary: '更新失敗', detail: '請稍後再試',
          });
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/sellcenter/products']);
  }
}

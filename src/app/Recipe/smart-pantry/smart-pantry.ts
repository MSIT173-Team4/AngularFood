import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import {
  AddPantryItemPayload,
  PantryAiDiagnosticDto
} from '../pantry/pantry.models';
import { PantryService } from '../pantry/pantry.service';
import { recipeDemoConfig } from '../api.config';
import { PantryItem, PantryPageData, RecipeRecommendation } from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

type PantryFormField = Exclude<keyof AddPantryItemPayload, 'userId'>;

@Component({
  selector: 'app-smart-pantry',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    ProgressSpinnerModule,
    SelectModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './smart-pantry.html',
  styleUrl: './smart-pantry.css'
})
export class SmartPantry implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly pantryService = inject(PantryService);
  private readonly recipeService = inject(RecipeService);
  private readonly messageService = inject(MessageService);
  private selectedImageFile: File | null = null;

  readonly pantryItems = signal<PantryItem[]>([]);
  readonly dataNotice = signal('');
  readonly dialogVisible = signal(false);
  readonly guideVisible = signal(false);
  readonly isAnalyzing = signal(false);
  readonly isManualEntry = signal(false);
  readonly analysisError = signal('');
  readonly isSaving = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly diagnostic = signal<PantryAiDiagnosticDto | null>(null);
  readonly recommendations = signal<RecipeRecommendation[]>([]);
  readonly isLoadingRecommendations = signal(false);
  readonly selectedCalendarDate = signal<Date>(new Date());
  readonly pantryForm = signal<AddPantryItemPayload>(this.createEmptyForm());
  readonly storageLocations: AddPantryItemPayload['storageLocation'][] = [
    '冷藏',
    '冷凍',
    '常溫'
  ];

  readonly selectedDateItems = computed(() => {
    const selectedDate = this.toLocalDateInput(this.selectedCalendarDate());
    return this.pantryItems()
      .filter((item) => item.expirationDate === selectedDate)
      .sort((left, right) => left.ingredientName.localeCompare(right.ingredientName, 'zh-TW'));
  });

  ngOnInit(): void {
    const pageData = this.route.snapshot.data['pageData'] as PantryPageData;
    this.pantryItems.set(pageData.pantryItems);
    this.dataNotice.set(pageData.notice);
    this.loadRecommendations();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  openCameraDialog(): void {
    this.resetDiagnosticForm();
    this.dialogVisible.set(true);
  }

  openGuideDialog(): void {
    this.guideVisible.set(true);
  }

  closeCameraDialog(): void {
    this.dialogVisible.set(false);
    this.resetDiagnosticForm();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.revokePreviewUrl();
    this.previewUrl.set(URL.createObjectURL(file));
    this.selectedImageFile = file;
    this.diagnostic.set(null);
    this.isManualEntry.set(false);
    this.analysisError.set('');
    this.analyzeSelectedImage();
  }

  retryDiagnosis(): void {
    if (!this.selectedImageFile) {
      this.analysisError.set('請重新選擇一張食材照片。');
      return;
    }

    this.analysisError.set('');
    this.isManualEntry.set(false);
    this.analyzeSelectedImage();
  }

  useManualEntry(): void {
    this.isManualEntry.set(true);
    this.analysisError.set('');
  }

  updateCalendarDate(value: Date | null): void {
    if (value) {
      this.selectedCalendarDate.set(value);
    }
  }

  formatExpirationDate(value: string | null): string {
    if (!value) {
      return '未設定日期';
    }

    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(`${value}T00:00:00`));
  }

  private analyzeSelectedImage(): void {
    const file = this.selectedImageFile;
    if (!file) {
      return;
    }

    this.isAnalyzing.set(true);

    this.pantryService.diagnoseImage(file).subscribe({
      next: (response) => {
        this.isAnalyzing.set(false);
        if (!response.success || !response.data) {
          const message = this.toFriendlyAiError(
            response.message,
            'AI 分析暫時未完成，可重新分析或改為手動入庫。'
          );
          this.analysisError.set(message);
          this.showError(message);
          return;
        }

        this.applyDiagnostic(response.data);
      },
      error: (error: HttpErrorResponse) => {
        this.isAnalyzing.set(false);
        const message = this.readApiError(
          error,
          'AI 服務暫時無法使用，照片已保留，可重試或改為手動入庫。'
        );
        this.analysisError.set(message);
        this.showError(message);
      }
    });
  }

  updateForm<K extends PantryFormField>(field: K, value: AddPantryItemPayload[K]): void {
    this.pantryForm.update((current) => ({ ...current, [field]: value }));
  }

  confirmPantryItem(): void {
    const payload = this.pantryForm();
    if (!payload.ingredientName.trim() || payload.amount <= 0 || !payload.expirationDate) {
      this.showError('請確認食材名稱、數量與過期日。');
      return;
    }

    this.isSaving.set(true);
    this.pantryService.addPantryItem(payload).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (!response.success) {
          this.showError(response.message);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: '入庫成功',
          detail: response.message
        });
        this.dialogVisible.set(false);
        this.resetDiagnosticForm();
        this.reloadPantryItems();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(this.readApiError(error, '食材入庫失敗，請稍後再試。'));
      }
    });
  }

  removeItem(pantryId: number): void {
    if (pantryId <= 0) {
      this.pantryItems.update((items) => items.filter((item) => item.pantryId !== pantryId));
      this.loadRecommendations();
      return;
    }

    this.pantryService.deleteItem(pantryId, recipeDemoConfig.userId).subscribe({
      next: (response) => {
        if (!response.success) {
          this.showError(response.message);
          return;
        }

        this.pantryItems.update((items) => items.filter((item) => item.pantryId !== pantryId));
        this.messageService.add({
          severity: 'success',
          summary: '庫存已更新',
          detail: response.message
        });
        this.loadRecommendations();
      },
      error: (error: HttpErrorResponse) => {
        this.showError(this.readApiError(error, '刪除冰箱食材失敗，請稍後再試。'));
      }
    });
  }

  joinIngredientNames(
    ingredients: RecipeRecommendation['availableIngredients'],
    emptyText: string
  ): string {
    return ingredients.length
      ? ingredients.map((ingredient) => ingredient.name).join('、')
      : emptyText;
  }

  private applyDiagnostic(diagnostic: PantryAiDiagnosticDto): void {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + diagnostic.estimatedDays);

    this.diagnostic.set(diagnostic);
    this.analysisError.set('');
    this.isManualEntry.set(false);
    this.pantryForm.set({
      userId: recipeDemoConfig.userId,
      ingredientName: diagnostic.ingredientName,
      amount: 1,
      unit: '份',
      storageLocation: diagnostic.recommendedLocation,
      expirationDate: this.toLocalDateInput(expirationDate),
      note: diagnostic.storageTip.slice(0, 150)
    });
  }

  private reloadPantryItems(): void {
    this.pantryService.getItems(recipeDemoConfig.userId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.pantryItems.set(response.data);
          this.dataNotice.set('已同步 FriendlyFoodDb 最新冰箱庫存。');
          this.loadRecommendations();
        }
      },
      error: () => {
        this.showError('入庫成功，但重新整理冰箱清單失敗，請重新載入頁面。');
      }
    });
  }

  private loadRecommendations(): void {
    this.isLoadingRecommendations.set(true);
    this.recipeService.getRecommendations(recipeDemoConfig.userId, 6).subscribe({
      next: (response) => {
        this.isLoadingRecommendations.set(false);
        this.recommendations.set(
          response.success && response.data ? response.data : []
        );
      },
      error: () => {
        this.isLoadingRecommendations.set(false);
        this.recommendations.set([]);
      }
    });
  }

  private resetDiagnosticForm(): void {
    this.revokePreviewUrl();
    this.diagnostic.set(null);
    this.selectedImageFile = null;
    this.analysisError.set('');
    this.isManualEntry.set(false);
    this.isAnalyzing.set(false);
    this.isSaving.set(false);
    this.pantryForm.set(this.createEmptyForm());
  }

  private createEmptyForm(): AddPantryItemPayload {
    const defaultExpirationDate = new Date();
    defaultExpirationDate.setDate(defaultExpirationDate.getDate() + 7);

    return {
      userId: recipeDemoConfig.userId,
      ingredientName: '',
      amount: 1,
      unit: '份',
      storageLocation: '冷藏',
      expirationDate: this.toLocalDateInput(defaultExpirationDate),
      note: ''
    };
  }

  toLocalDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private revokePreviewUrl(): void {
    const currentUrl = this.previewUrl();
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      this.previewUrl.set(null);
    }
  }

  private readApiError(error: HttpErrorResponse, fallbackMessage: string): string {
    const apiMessage = typeof error.error?.message === 'string'
      ? error.error.message
      : '';

    return this.toFriendlyAiError(apiMessage, fallbackMessage);
  }

  private toFriendlyAiError(apiMessage: string, fallbackMessage: string): string {
    return apiMessage.includes('SmartBot.Api')
      ? 'AI 服務暫時無法使用，照片已保留，可重新分析或改為手動入庫。'
      : apiMessage || fallbackMessage;
  }

  private showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: '操作失敗', detail: message });
  }
}

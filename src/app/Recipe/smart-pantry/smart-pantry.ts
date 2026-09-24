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
import { forkJoin } from 'rxjs';

import {
  AddPantryItemPayload,
  PantryAiDiagnosticDto,
  UpdatePantryItemPayload
} from '../pantry/pantry.models';
import { PantryService } from '../pantry/pantry.service';
import { recipeDemoConfig } from '../api.config';
import { PantryItem, PantryPageData, RecipeRecommendation } from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

type PantryFormField = Exclude<keyof AddPantryItemPayload, 'userId'>;
type ValidationErrors = Record<string, string>;

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
  private readonly validationTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly pantryItems = signal<PantryItem[]>([]);
  readonly dataNotice = signal('');
  readonly dialogVisible = signal(false);
  readonly guideVisible = signal(false);
  readonly editDialogVisible = signal(false);
  readonly removeDialogVisible = signal(false);
  readonly isAnalyzing = signal(false);
  readonly isManualEntry = signal(false);
  readonly analysisError = signal('');
  readonly isSaving = signal(false);
  readonly isUpdating = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly diagnostics = signal<PantryAiDiagnosticDto[]>([]);
  readonly recommendations = signal<RecipeRecommendation[]>([]);
  readonly selectedRecommendationIndex = signal(0);
  readonly isLoadingRecommendations = signal(false);
  readonly selectedCalendarDate = signal<Date>(new Date());
  readonly pantryForms = signal<AddPantryItemPayload[]>([]);
  readonly editingPantryItem = signal<PantryItem | null>(null);
  readonly pendingRemovalItem = signal<PantryItem | null>(null);
  readonly editForm = signal<UpdatePantryItemPayload | null>(null);
  readonly validationErrors = signal<ValidationErrors>({});
  readonly storageLocations: AddPantryItemPayload['storageLocation'][] = [
    '冷藏',
    '冷凍',
    '常溫'
  ];
  readonly unitOptions = [
    '份',
    '個',
    '顆',
    '根',
    '把',
    '束',
    '支',
    '尾',
    '塊',
    '片',
    '包',
    '盒',
    '瓶',
    '罐',
    '公克',
    '公斤',
    '毫升',
    '公升'
  ];

  readonly selectedDateItems = computed(() => {
    const selectedDate = this.toLocalDateInput(this.selectedCalendarDate());
    return this.pantryItems()
      .filter((item) => item.expirationDate === selectedDate)
      .sort((left, right) => left.ingredientName.localeCompare(right.ingredientName, 'zh-TW'));
  });

  readonly expiringItems = computed(() =>
    [...this.pantryItems()]
      .filter((item) => item.daysLeft <= 3)
      .sort((left, right) => left.daysLeft - right.daysLeft)
  );

  readonly selectedRecommendation = computed(() =>
    this.recommendations()[this.selectedRecommendationIndex()] ?? null
  );

  ngOnInit(): void {
    const pageData = this.route.snapshot.data['pageData'] as PantryPageData;
    this.pantryItems.set(pageData.pantryItems);
    this.dataNotice.set(pageData.notice);
    this.loadRecommendations();
  }

  ngOnDestroy(): void {
    this.clearValidationTimers();
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
    this.diagnostics.set([]);
    this.pantryForms.set([]);
    this.validationErrors.set({});
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
    this.diagnostics.set([]);
    this.pantryForms.set([this.createEmptyForm()]);
  }

  updateCalendarDate(value: Date | null): void {
    if (value) {
      this.selectedCalendarDate.set(value);
    }
  }

  openEditDialog(item: PantryItem): void {
    this.editingPantryItem.set(item);
    this.editForm.set({
      userId: recipeDemoConfig.userId,
      amount: item.amount,
      unit: item.unit,
      storageLocation: this.toStorageLocation(item.storageLocation),
      expirationDate: item.expirationDate ?? this.toLocalDateInput(new Date()),
      note: item.note ?? ''
    });
    this.editDialogVisible.set(true);
  }

  updateEditForm<K extends keyof UpdatePantryItemPayload>(
    field: K,
    value: UpdatePantryItemPayload[K]
  ): void {
    this.editForm.update((form) => form ? { ...form, [field]: value } : form);
  }

  savePantryEdit(): void {
    const item = this.editingPantryItem();
    const payload = this.editForm();
    if (!item || !payload || payload.amount <= 0 || !this.unitOptions.includes(payload.unit)) {
      this.showError('請確認數量大於零，並從選單選擇單位。');
      return;
    }

    this.isUpdating.set(true);
    this.pantryService.updateItem(item.pantryId, payload).subscribe({
      next: (response) => {
        this.isUpdating.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.pantryItems.update((items) => items.map((current) =>
          current.pantryId === response.data!.pantryId ? response.data! : current
        ));
        this.editDialogVisible.set(false);
        this.editingPantryItem.set(null);
        this.editForm.set(null);
        this.messageService.add({
          severity: 'success',
          summary: '庫存已更新',
          detail: response.message
        });
        this.loadRecommendations();
      },
      error: (error: HttpErrorResponse) => {
        this.isUpdating.set(false);
        this.showError(this.readApiError(error, '更新冰箱食材失敗，請稍後再試。'));
      }
    });
  }

  requestRemoveItem(item: PantryItem): void {
    this.pendingRemovalItem.set(item);
    this.removeDialogVisible.set(true);
  }

  confirmRemoveItem(): void {
    const item = this.pendingRemovalItem();
    if (!item) {
      return;
    }

    this.removeDialogVisible.set(false);
    this.pendingRemovalItem.set(null);
    this.removeItem(item.pantryId);
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

        if (!response.data.length) {
          const message = '照片中沒有可確認的食材，請重新拍攝或改為手動入庫。';
          this.analysisError.set(message);
          this.showError(message);
          return;
        }

        this.applyDiagnostics(response.data);
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

  updateForm<K extends PantryFormField>(
    index: number,
    field: K,
    value: AddPantryItemPayload[K]
  ): void {
    this.pantryForms.update((forms) => forms.map((form, formIndex) =>
      formIndex === index ? { ...form, [field]: value } : form
    ));
    this.scheduleValidation(index, field);
  }

  getValidationError(index: number, field: PantryFormField): string {
    return this.validationErrors()[this.validationKey(index, field)] ?? '';
  }

  removeDetectedItem(index: number): void {
    this.diagnostics.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
    this.pantryForms.update((forms) => forms.filter((_, formIndex) => formIndex !== index));
    this.validationErrors.set({});
  }

  confirmPantryItems(): void {
    const payloads = this.pantryForms();
    if (!payloads.length || !this.validateAllForms()) {
      this.showError('請修正欄位下方的紅字提醒後再入庫。');
      return;
    }

    this.isSaving.set(true);
    forkJoin(payloads.map((payload) => this.pantryService.addPantryItem(payload))).subscribe({
      next: (responses) => {
        this.isSaving.set(false);
        const failedResponse = responses.find((response) => !response.success);
        if (failedResponse) {
          this.showError(failedResponse.message);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: '入庫成功',
          detail: `已將 ${responses.length} 項食材放入冰箱。`
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

  showPreviousRecommendation(): void {
    const count = this.recommendations().length;
    if (count > 1) {
      this.selectedRecommendationIndex.update((index) =>
        (index - 1 + count) % count
      );
    }
  }

  showNextRecommendation(): void {
    const count = this.recommendations().length;
    if (count > 1) {
      this.selectedRecommendationIndex.update((index) => (index + 1) % count);
    }
  }

  private applyDiagnostics(diagnostics: PantryAiDiagnosticDto[]): void {
    this.diagnostics.set(diagnostics);
    this.analysisError.set('');
    this.isManualEntry.set(false);
    this.pantryForms.set(diagnostics.map((diagnostic) => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + diagnostic.estimatedDays);

      return {
        userId: recipeDemoConfig.userId,
        ingredientName: diagnostic.ingredientName,
        amount: 1,
        unit: this.unitOptions.includes(diagnostic.suggestedUnit)
          ? diagnostic.suggestedUnit
          : '份',
        storageLocation: diagnostic.recommendedLocation,
        expirationDate: this.toLocalDateInput(expirationDate),
        note: diagnostic.storageTip.slice(0, 150)
      };
    }));
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
        this.selectedRecommendationIndex.set(0);
      },
      error: () => {
        this.isLoadingRecommendations.set(false);
        this.recommendations.set([]);
      }
    });
  }

  private resetDiagnosticForm(): void {
    this.clearValidationTimers();
    this.revokePreviewUrl();
    this.diagnostics.set([]);
    this.pantryForms.set([]);
    this.validationErrors.set({});
    this.selectedImageFile = null;
    this.analysisError.set('');
    this.isManualEntry.set(false);
    this.isAnalyzing.set(false);
    this.isSaving.set(false);
  }

  private scheduleValidation(index: number, field: PantryFormField): void {
    const key = this.validationKey(index, field);
    const activeTimer = this.validationTimers.get(key);
    if (activeTimer) {
      clearTimeout(activeTimer);
    }

    this.validationErrors.update((errors) => {
      const nextErrors = { ...errors };
      delete nextErrors[key];
      return nextErrors;
    });

    const timer = setTimeout(() => {
      this.setValidationError(index, field, this.validateField(index, field));
      this.validationTimers.delete(key);
    }, 1000);
    this.validationTimers.set(key, timer);
  }

  private validateAllForms(): boolean {
    const nextErrors: ValidationErrors = {};
    const fields: PantryFormField[] = [
      'ingredientName',
      'amount',
      'unit',
      'storageLocation',
      'expirationDate'
    ];

    this.pantryForms().forEach((_, index) => {
      fields.forEach((field) => {
        const message = this.validateField(index, field);
        if (message) {
          nextErrors[this.validationKey(index, field)] = message;
        }
      });
    });

    this.validationErrors.set(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  private validateField(index: number, field: PantryFormField): string {
    const form = this.pantryForms()[index];
    if (!form) {
      return '';
    }

    if (field === 'ingredientName' && !form.ingredientName.trim()) {
      return '請輸入食材名稱。';
    }

    if (field === 'amount') {
      const amount = Number(form.amount);
      const hasTooManyDecimals = !Number.isInteger(amount * 100);
      if (!Number.isFinite(amount) || amount < 1 || amount > 99999 || hasTooManyDecimals) {
        return '數量須為 1～99,999，最多保留小數點後 2 位。';
      }
    }

    if (field === 'unit' && !this.unitOptions.includes(form.unit)) {
      return '請從選單選擇固定單位。';
    }

    if (field === 'expirationDate' && !form.expirationDate) {
      return '請選擇建議過期日。';
    }

    return '';
  }

  private setValidationError(index: number, field: PantryFormField, message: string): void {
    const key = this.validationKey(index, field);
    this.validationErrors.update((errors) => {
      const nextErrors = { ...errors };
      if (message) {
        nextErrors[key] = message;
      } else {
        delete nextErrors[key];
      }
      return nextErrors;
    });
  }

  private validationKey(index: number, field: PantryFormField): string {
    return `${index}:${field}`;
  }

  private clearValidationTimers(): void {
    this.validationTimers.forEach((timer) => clearTimeout(timer));
    this.validationTimers.clear();
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

  private toStorageLocation(value: string): UpdatePantryItemPayload['storageLocation'] {
    return this.storageLocations.includes(value as UpdatePantryItemPayload['storageLocation'])
      ? value as UpdatePantryItemPayload['storageLocation']
      : '冷藏';
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

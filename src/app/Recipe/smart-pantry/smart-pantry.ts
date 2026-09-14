import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
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
} from '../../features/pantry/pantry.models';
import { PantryService } from '../../features/pantry/pantry.service';
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

  readonly pantryItems = signal<PantryItem[]>([]);
  readonly dataNotice = signal('');
  readonly dialogVisible = signal(false);
  readonly isAnalyzing = signal(false);
  readonly isSaving = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly diagnostic = signal<PantryAiDiagnosticDto | null>(null);
  readonly recommendations = signal<RecipeRecommendation[]>([]);
  readonly isLoadingRecommendations = signal(false);
  readonly pantryForm = signal<AddPantryItemPayload>(this.createEmptyForm());
  readonly storageLocations: AddPantryItemPayload['storageLocation'][] = [
    '冷藏',
    '冷凍',
    '常溫'
  ];

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
    this.diagnostic.set(null);
    this.isAnalyzing.set(true);

    this.pantryService.diagnoseImage(file).subscribe({
      next: (response) => {
        this.isAnalyzing.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.applyDiagnostic(response.data);
      },
      error: (error: HttpErrorResponse) => {
        this.isAnalyzing.set(false);
        this.showError(this.readApiError(error, 'AI 診斷失敗，請重新拍攝後再試。'));
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

  private toLocalDateInput(date: Date): string {
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
    return typeof error.error?.message === 'string' ? error.error.message : fallbackMessage;
  }

  private showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: '操作失敗', detail: message });
  }
}

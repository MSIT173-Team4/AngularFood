import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { recipeDemoConfig } from '../api.config';
import {
  CreateRecipePayload,
  RecipeCategory,
  RecipeIngredientInput,
  RecipeStepInput,
  RecipeTag
} from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

interface IngredientEditorRow {
  ingredientId: number | null;
  name: string;
  amount: number;
  unit: string;
}

interface RecipeEditorDraft {
  title: string;
  description: string;
  servings: number;
  cookingMinutes: number;
  totalCalories: number;
  ingredients: IngredientEditorRow[];
  instructions: string;
  stepImageUrls: Array<string | null>;
  youTubeUrl: string;
  categoryId: number | null;
  selectedTagIds: number[];
  coverImageUrl: string | null;
  savedAt: string;
}

@Component({
  selector: 'app-create-recipe',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    SelectModule,
    TextareaModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './create-recipe.html',
  styleUrl: './create-recipe.css'
})
export class CreateRecipe implements OnInit, OnDestroy {
  private static readonly DraftStorageKey = `friendlyfood.recipe-draft.${recipeDemoConfig.userId}`;
  private readonly recipeService = inject(RecipeService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  private localPreviewUrl: string | null = null;

  readonly title = signal('');
  readonly description = signal('');
  readonly servings = signal(2);
  readonly cookingMinutes = signal(0);
  readonly totalCalories = signal(0);
  readonly ingredientRows = signal<IngredientEditorRow[]>([
    { ingredientId: null, name: '', amount: 1, unit: '顆' }
  ]);
  readonly instructionDraft = signal('');
  readonly stepImageUrls = signal<Array<string | null>>([]);
  readonly stepPreviewUrls = signal<Record<number, string>>({});
  readonly uploadingStepIndex = signal<number | null>(null);
  readonly youTubeUrl = signal('');
  readonly categories = signal<RecipeCategory[]>([]);
  readonly tags = signal<RecipeTag[]>([]);
  readonly categoryId = signal<number | null>(null);
  readonly selectedTagIds = signal<number[]>([]);
  readonly coverImageUrl = signal<string | null>(null);
  readonly coverPreviewUrl = signal<string | null>(null);
  readonly isUploadingCover = signal(false);
  readonly isParsingWithAi = signal(false);
  readonly isNormalizing = signal(false);
  readonly isSaving = signal(false);
  readonly isAiGenerated = signal(false);
  readonly statusMessage = signal('');
  readonly createdRecipeId = signal<number | null>(null);
  readonly unitOptions = [
    '份', '個', '顆', '根', '把', '束', '支', '尾', '塊', '片', '包', '盒',
    '瓶', '罐', '公克', '公斤', '毫升', '公升', '大匙', '小匙'
  ];

  readonly canSubmit = computed(
    () => this.title().trim().length > 0
      && this.ingredientRows().some((ingredient) => ingredient.name.trim().length > 0)
      && this.instructionDraft().trim().length > 0
      && this.categoryId() !== null
      && !this.isSaving()
  );

  readonly instructionLines = computed(() =>
    this.instructionDraft()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\d+[.、．]\s*/, ''))
  );

  ngOnInit(): void {
    this.loadMetadata();
    this.restoreDraft();
  }

  ngOnDestroy(): void {
    this.revokeLocalPreview();
    this.revokeStepPreviews();
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.revokeLocalPreview();
    this.localPreviewUrl = URL.createObjectURL(file);
    this.coverPreviewUrl.set(this.localPreviewUrl);
    this.isUploadingCover.set(true);

    this.recipeService.uploadCover(file).subscribe({
      next: (response) => {
        this.isUploadingCover.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.coverImageUrl.set(response.data.url);
        this.statusMessage.set(
          `封面已上傳。建議尺寸 ${response.data.recommendedWidth} × ${response.data.recommendedHeight}。`
        );
      },
      error: (error: HttpErrorResponse) => {
        this.isUploadingCover.set(false);
        this.showError(this.readApiError(error, '封面上傳失敗。'));
      }
    });
  }

  onStepImageSelected(stepIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    const currentPreview = this.stepPreviewUrls()[stepIndex];
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    this.stepPreviewUrls.update((previews) => ({
      ...previews,
      [stepIndex]: previewUrl
    }));
    this.uploadingStepIndex.set(stepIndex);

    this.recipeService.uploadStepImage(file).subscribe({
      next: (response) => {
        this.uploadingStepIndex.set(null);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.stepImageUrls.update((urls) => {
          const nextUrls = [...urls];
          nextUrls[stepIndex] = response.data!.url;
          return nextUrls;
        });
        this.statusMessage.set(`步驟 ${stepIndex + 1} 圖片已上傳。`);
      },
      error: (error: HttpErrorResponse) => {
        this.uploadingStepIndex.set(null);
        this.showError(this.readApiError(error, '步驟圖片上傳失敗。'));
      }
    });
  }

  removeStepImage(stepIndex: number): void {
    const previewUrl = this.stepPreviewUrls()[stepIndex];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    this.stepPreviewUrls.update((previews) => {
      const nextPreviews = { ...previews };
      delete nextPreviews[stepIndex];
      return nextPreviews;
    });
    this.stepImageUrls.update((urls) => {
      const nextUrls = [...urls];
      nextUrls[stepIndex] = null;
      return nextUrls;
    });
  }

  parseWithAi(): void {
    const content = [
      this.title(),
      this.description(),
      '食材：',
      ...this.ingredientRows()
        .filter((ingredient) => ingredient.name.trim())
        .map((ingredient) => `${ingredient.name} ${ingredient.amount} ${ingredient.unit}`),
      '步驟：',
      this.instructionDraft()
    ].join('\n');

    this.isParsingWithAi.set(true);
    this.recipeService.parseRecipe(content).subscribe({
      next: (response) => {
        this.isParsingWithAi.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.title.set(response.data.recipeTitle || this.title());
        this.ingredientRows.set(response.data.ingredients.map((item) => ({
          ingredientId: null,
          name: item.name,
          amount: item.amount,
          unit: this.toSupportedUnit(item.unit)
        })));
        this.instructionDraft.set(
          response.data.steps
            .map((step) => `${step.stepNumber}. ${step.description}`)
            .join('\n')
        );
        this.revokeStepPreviews();
        this.stepImageUrls.set([]);
        this.isAiGenerated.set(true);
        this.statusMessage.set('AI 已整理食材與步驟，請確認內容後再送出。');
      },
      error: (error: HttpErrorResponse) => {
        this.isParsingWithAi.set(false);
        this.showError(this.readApiError(error, 'AI 食譜解析失敗。'));
      }
    });
  }

  normalizeIngredients(): void {
    const ingredients = this.parseIngredientRows();
    if (!ingredients.length) {
      this.showError('請先輸入至少一項食材。');
      return;
    }

    this.isNormalizing.set(true);
    forkJoin(
      ingredients.map((ingredient) => this.recipeService.normalizeIngredient(
        ingredient.name,
        ingredient.baseAmount ?? 1,
        ingredient.standardUnit ?? '份'
      ))
    ).subscribe({
      next: (responses) => {
        this.isNormalizing.set(false);
        const normalizedRows = responses.map((response, index): IngredientEditorRow => {
          if (!response.success || !response.data) {
            const original = ingredients[index];
            return {
              ingredientId: original.ingredientId,
              name: original.name,
              amount: original.baseAmount ?? 1,
              unit: original.standardUnit ?? '份'
            };
          }

          return {
            ingredientId: response.data.ingredientId,
            name: response.data.standardIngredientName,
            amount: response.data.standardAmount,
            unit: this.toSupportedUnit(response.data.standardUnit)
          };
        });
        this.ingredientRows.set(normalizedRows);
        this.statusMessage.set('食材名稱與可換算單位已完成標準化。');
      },
      error: (error: HttpErrorResponse) => {
        this.isNormalizing.set(false);
        this.showError(this.readApiError(error, '食材標準化失敗。'));
      }
    });
  }

  submitRecipe(): void {
    const categoryId = this.categoryId();
    const ingredients = this.parseIngredientRows();
    const steps = this.parseInstructionDraft();

    if (!categoryId || !ingredients.length || !steps.length || !this.title().trim()) {
      this.showError('請確認分類、食譜名稱、食材與料理步驟。');
      return;
    }

    const payload: CreateRecipePayload = {
      userId: recipeDemoConfig.userId,
      categoryId,
      title: this.title().trim(),
      description: this.description().trim() || null,
      coverImageUrl: this.coverImageUrl(),
      youTubeVideoId: this.extractYouTubeVideoId(this.youTubeUrl()),
      aiPrepTips: this.isAiGenerated() ? '本食譜曾使用 AI 協助解析，發布前已由使用者確認。' : null,
      isAiGenerated: this.isAiGenerated(),
      defaultServings: this.servings(),
      cookingMinutes: this.cookingMinutes(),
      totalCalories: this.totalCalories(),
      ingredients,
      steps,
      tagIds: this.selectedTagIds()
    };

    this.isSaving.set(true);
    this.recipeService.createRecipe(payload).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.createdRecipeId.set(response.data.recipeId);
        localStorage.removeItem(CreateRecipe.DraftStorageKey);
        this.statusMessage.set(`「${response.data.title}」已成功寫入 FriendlyFoodDb。`);
        this.messageService.add({
          severity: 'success',
          summary: '食譜發布成功',
          detail: response.message
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(this.readApiError(error, '建立食譜失敗。'));
      }
    });
  }

  openCreatedRecipe(): void {
    const recipeId = this.createdRecipeId();
    if (recipeId) {
      void this.router.navigate(['/recipes', recipeId]);
    }
  }

  addIngredientRow(): void {
    this.ingredientRows.update((rows) => [
      ...rows,
      { ingredientId: null, name: '', amount: 1, unit: '顆' }
    ]);
  }

  updateIngredientRow<K extends keyof IngredientEditorRow>(
    index: number,
    field: K,
    value: IngredientEditorRow[K]
  ): void {
    this.ingredientRows.update((rows) => rows.map((row, rowIndex) =>
      rowIndex === index
        ? { ...row, [field]: value, ingredientId: field === 'name' ? null : row.ingredientId }
        : row
    ));
  }

  removeIngredientRow(index: number): void {
    this.ingredientRows.update((rows) => {
      const remainingRows = rows.filter((_, rowIndex) => rowIndex !== index);
      return remainingRows.length
        ? remainingRows
        : [{ ingredientId: null, name: '', amount: 1, unit: '顆' }];
    });
  }

  saveDraft(): void {
    const draft: RecipeEditorDraft = {
      title: this.title(),
      description: this.description(),
      servings: this.servings(),
      cookingMinutes: this.cookingMinutes(),
      totalCalories: this.totalCalories(),
      ingredients: this.ingredientRows(),
      instructions: this.instructionDraft(),
      stepImageUrls: this.stepImageUrls(),
      youTubeUrl: this.youTubeUrl(),
      categoryId: this.categoryId(),
      selectedTagIds: this.selectedTagIds(),
      coverImageUrl: this.coverImageUrl(),
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(CreateRecipe.DraftStorageKey, JSON.stringify(draft));
    this.statusMessage.set('草稿已保存在此瀏覽器，下次回到本頁會自動載入。');
    this.messageService.add({
      severity: 'success',
      summary: '草稿已儲存',
      detail: '尚未公開，也不會出現在食譜首頁。'
    });
  }

  private loadMetadata(): void {
    this.recipeService.getMetadata().subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.categories.set(response.data.categories);
        this.tags.set(response.data.tags);
        const currentCategoryId = this.categoryId();
        if (currentCategoryId !== null &&
            !response.data.categories.some((category) => category.categoryId === currentCategoryId)) {
          this.categoryId.set(null);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.showError(this.readApiError(error, '無法載入食譜分類與標籤。'));
      }
    });
  }

  private parseIngredientRows(): RecipeIngredientInput[] {
    return this.ingredientRows()
      .filter((ingredient) => ingredient.name.trim() && ingredient.amount > 0)
      .map((ingredient, index) => ({
        ingredientId: ingredient.ingredientId,
        name: ingredient.name.trim(),
        displayAmount: `${ingredient.amount} ${ingredient.unit}`,
        baseAmount: ingredient.amount,
        standardUnit: ingredient.unit,
        isMain: index < 3,
        sortOrder: index + 1
      }));
  }

  private restoreDraft(): void {
    const storedDraft = localStorage.getItem(CreateRecipe.DraftStorageKey);
    if (!storedDraft) {
      return;
    }

    try {
      const draft = JSON.parse(storedDraft) as RecipeEditorDraft;
      this.title.set(draft.title ?? '');
      this.description.set(draft.description ?? '');
      this.servings.set(draft.servings ?? 2);
      this.cookingMinutes.set(draft.cookingMinutes ?? 0);
      this.totalCalories.set(draft.totalCalories ?? 0);
      this.ingredientRows.set(draft.ingredients?.length
        ? draft.ingredients
        : [{ ingredientId: null, name: '', amount: 1, unit: '顆' }]);
      this.instructionDraft.set(draft.instructions ?? '');
      this.stepImageUrls.set(draft.stepImageUrls ?? []);
      this.youTubeUrl.set(draft.youTubeUrl ?? '');
      this.categoryId.set(draft.categoryId ?? null);
      this.selectedTagIds.set(draft.selectedTagIds ?? []);
      this.coverImageUrl.set(draft.coverImageUrl ?? null);
      this.statusMessage.set('已載入上次保存在此瀏覽器的食譜草稿。');
    } catch {
      localStorage.removeItem(CreateRecipe.DraftStorageKey);
    }
  }

  private toSupportedUnit(unit: string): string {
    const aliases: Record<string, string> = {
      g: '公克',
      kg: '公斤',
      ml: '毫升',
      l: '公升',
      匙: '大匙'
    };
    const normalizedUnit = aliases[unit.trim().toLocaleLowerCase()] ?? unit.trim();
    return this.unitOptions.includes(normalizedUnit) ? normalizedUnit : '份';
  }

  private parseInstructionDraft(): RecipeStepInput[] {
    return this.instructionDraft()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({
        stepNumber: index + 1,
        instruction: line.replace(/^\d+[.、．]\s*/, ''),
        imageUrl: this.stepImageUrls()[index] ?? null,
        timerSeconds: 0
      }));
  }

  private extractYouTubeVideoId(value: string): string | null {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return null;
    }

    const match = trimmedValue.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
    );
    return match?.[1] ?? (/^[\w-]{11}$/.test(trimmedValue) ? trimmedValue : null);
  }

  private revokeLocalPreview(): void {
    if (this.localPreviewUrl) {
      URL.revokeObjectURL(this.localPreviewUrl);
      this.localPreviewUrl = null;
    }
  }

  private revokeStepPreviews(): void {
    Object.values(this.stepPreviewUrls()).forEach((url) => URL.revokeObjectURL(url));
    this.stepPreviewUrls.set({});
  }

  private readApiError(error: HttpErrorResponse, fallbackMessage: string): string {
    return typeof error.error?.message === 'string' ? error.error.message : fallbackMessage;
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: '操作失敗', detail });
  }
}

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
  private readonly recipeService = inject(RecipeService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  private localPreviewUrl: string | null = null;

  readonly title = signal('番茄嫩豆腐鮮魚煲');
  readonly description = signal('運用冰箱即期食材完成的快速家常料理。');
  readonly servings = signal(2);
  readonly cookingMinutes = signal(20);
  readonly totalCalories = signal(420);
  readonly ingredientDraft = signal('牛番茄 2 顆\n板豆腐 1 盒\n鱸魚片 300 公克');
  readonly instructionDraft = signal(
    '1. 處理所有食材。\n2. 將牛番茄炒出香氣後加入清水。\n3. 放入豆腐與鱸魚片煮熟並調味。'
  );
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

  readonly canSubmit = computed(
    () => this.title().trim().length > 0
      && this.ingredientDraft().trim().length > 0
      && this.instructionDraft().trim().length > 0
      && this.categoryId() !== null
      && !this.isSaving()
  );

  ngOnInit(): void {
    this.loadMetadata();
  }

  ngOnDestroy(): void {
    this.revokeLocalPreview();
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

  parseWithAi(): void {
    const content = [
      this.title(),
      this.description(),
      '食材：',
      this.ingredientDraft(),
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
        this.ingredientDraft.set(
          response.data.ingredients
            .map((item) => `${item.name} ${item.amount} ${item.unit}`)
            .join('\n')
        );
        this.instructionDraft.set(
          response.data.steps
            .map((step) => `${step.stepNumber}. ${step.description}`)
            .join('\n')
        );
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
    const ingredients = this.parseIngredientDraft();
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
        const normalizedLines = responses.map((response, index) => {
          if (!response.success || !response.data) {
            const original = ingredients[index];
            return `${original.name} ${original.displayAmount}`;
          }

          return `${response.data.standardIngredientName} ${response.data.displayAmount}`;
        });
        this.ingredientDraft.set(normalizedLines.join('\n'));
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
    const ingredients = this.parseIngredientDraft();
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

  private loadMetadata(): void {
    this.recipeService.getMetadata().subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.categories.set(response.data.categories);
        this.tags.set(response.data.tags);
        this.categoryId.set(response.data.categories[0]?.categoryId ?? null);
      },
      error: (error: HttpErrorResponse) => {
        this.showError(this.readApiError(error, '無法載入食譜分類與標籤。'));
      }
    });
  }

  private parseIngredientDraft(): RecipeIngredientInput[] {
    return this.ingredientDraft()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(\S+)?$/);
        const name = match?.[1]?.trim() || line;
        const amount = match ? Number(match[2]) : 1;
        const unit = match?.[3]?.trim() || '份';

        return {
          ingredientId: null,
          name,
          displayAmount: `${amount} ${unit}`,
          baseAmount: amount,
          standardUnit: unit,
          isMain: index < 3,
          sortOrder: index + 1
        };
      });
  }

  private parseInstructionDraft(): RecipeStepInput[] {
    return this.instructionDraft()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({
        stepNumber: index + 1,
        instruction: line.replace(/^\d+[.、．]\s*/, ''),
        imageUrl: null,
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

  private readApiError(error: HttpErrorResponse, fallbackMessage: string): string {
    return typeof error.error?.message === 'string' ? error.error.message : fallbackMessage;
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: '操作失敗', detail });
  }
}

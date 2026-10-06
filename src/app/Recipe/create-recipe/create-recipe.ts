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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

import { AuthService } from '../../Member/services/auth-services';
import {
  CreateRecipePayload,
  RecipeCategory,
  RecipeDetail,
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
  stepTimerSeconds: number[];
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
  private static readonly MaximumImageSizeBytes = 5 * 1024 * 1024;
  private static readonly DemoCoverImageUrl =
    'https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop';
  private static readonly DemoPreparationImageUrl =
    'https://images.pexels.com/photos/31399181/pexels-photo-31399181.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop';
  private static readonly AllowedImageTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
  ]);
  private readonly recipeService = inject(RecipeService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
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
  readonly stepTimerSeconds = signal<number[]>([]);
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
  readonly isEstimatingCalories = signal(false);
  readonly isNormalizing = signal(false);
  readonly isSaving = signal(false);
  readonly isLoadingRecipe = signal(false);
  readonly isAiGenerated = signal(false);
  readonly statusMessage = signal('');
  readonly createdRecipeId = signal<number | null>(null);
  readonly editingRecipeId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editingRecipeId() !== null);
  readonly canUseDemoFill = computed(() =>
    !this.isEditMode()
      && this.authService.currentUser()?.userName.trim().toLocaleLowerCase() === 'recipe.demo'
  );
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
    const routeRecipeId = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(routeRecipeId) && routeRecipeId > 0) {
      this.editingRecipeId.set(routeRecipeId);
      this.loadRecipeForEditing(routeRecipeId);
      return;
    }

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

    const validationMessage = this.validateImageFile(file);
    if (validationMessage) {
      this.showError(validationMessage);
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

    const validationMessage = this.validateImageFile(file);
    if (validationMessage) {
      this.showError(validationMessage);
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

  updateStepTimer(stepIndex: number, seconds: number): void {
    this.stepTimerSeconds.update((timers) => {
      const nextTimers = [...timers];
      nextTimers[stepIndex] = Math.max(0, Math.round(seconds));
      return nextTimers;
    });
  }

  getStepTimerSeconds(stepIndex: number): number {
    return this.stepTimerSeconds()[stepIndex] ?? 0;
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
        this.stepTimerSeconds.set([]);
        this.totalCalories.set(response.data.estimatedTotalCalories);
        this.isAiGenerated.set(true);
        this.statusMessage.set('AI 已整理食材、步驟並估算總熱量，請確認內容後再送出。');
      },
      error: (error: HttpErrorResponse) => {
        this.isParsingWithAi.set(false);
        this.showError(this.readApiError(error, 'AI 食譜解析失敗。'));
      }
    });
  }

  estimateCaloriesWithAi(): void {
    const ingredients = this.ingredientRows()
      .filter((ingredient) => ingredient.name.trim())
      .map((ingredient) => `${ingredient.name} ${ingredient.amount} ${ingredient.unit}`);
    if (!ingredients.length) {
      this.showError('請先輸入至少一項食材，再由 AI 估算總熱量。');
      return;
    }

    const content = [
      `食譜名稱：${this.title().trim() || '未命名食譜'}`,
      `基準份量：${this.servings()} 人份`,
      '請依下列完整食材與用量估算整份食譜總熱量：',
      ...ingredients
    ].join('\n');

    this.isEstimatingCalories.set(true);
    this.recipeService.parseRecipe(content).subscribe({
      next: (response) => {
        this.isEstimatingCalories.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.totalCalories.set(response.data.estimatedTotalCalories);
        this.statusMessage.set('AI 已依目前食材與用量估算整份食譜總熱量。');
      },
      error: (error: HttpErrorResponse) => {
        this.isEstimatingCalories.set(false);
        this.showError(this.readApiError(error, 'AI 熱量估算失敗。'));
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
    const editingRecipeId = this.editingRecipeId();
    const saveRequest = editingRecipeId
      ? this.recipeService.updateRecipe(editingRecipeId, payload)
      : this.recipeService.createRecipe(payload);

    saveRequest.subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.createdRecipeId.set(response.data.recipeId);
        localStorage.removeItem(this.draftStorageKey);
        this.statusMessage.set(
          editingRecipeId
            ? `「${response.data.title}」已成功更新。`
            : `「${response.data.title}」已成功寫入 FriendlyFoodDb。`
        );
        this.messageService.add({
          severity: 'success',
          summary: editingRecipeId ? '食譜更新成功' : '食譜發布成功',
          detail: response.message
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showError(this.readApiError(
          error,
          editingRecipeId ? '更新食譜失敗。' : '建立食譜失敗。'
        ));
      }
    });
  }

  openCreatedRecipe(): void {
    const recipeId = this.createdRecipeId();
    if (recipeId) {
      void this.router.navigate(['/recipes', recipeId]);
    }
  }

  fillDemoRecipe(): void {
    if (this.isEditMode()) {
      return;
    }

    const preferredCategory = this.categories().find(
      (category) => category.name === '異國料理'
    ) ?? this.categories()[0];
    const preferredTagNames = new Set(['日式料理', '高蛋白', '新手友善']);
    const preferredTagIds = this.tags()
      .filter((tag) => preferredTagNames.has(tag.name))
      .map((tag) => tag.tagId);

    this.revokeLocalPreview();
    this.revokeStepPreviews();
    this.title.set('味噌蜂蜜烤鮭魚時蔬');
    this.description.set(
      '味噌與蜂蜜調成鹹甜醬汁，搭配鮭魚和時蔬一次烤熟，適合忙碌平日晚餐與便當備餐。'
    );
    this.servings.set(2);
    this.cookingMinutes.set(30);
    this.totalCalories.set(520);
    this.ingredientRows.set([
      { ingredientId: null, name: '大西洋鮭魚排', amount: 320, unit: '公克' },
      { ingredientId: null, name: '味噌', amount: 2, unit: '大匙' },
      { ingredientId: null, name: '蜂蜜', amount: 1, unit: '大匙' },
      { ingredientId: null, name: '醬油', amount: 1, unit: '小匙' },
      { ingredientId: null, name: '青花椰菜', amount: 200, unit: '公克' },
      { ingredientId: null, name: '紅甜椒', amount: 1, unit: '個' }
    ]);
    this.instructionDraft.set([
      '烤箱預熱至 200°C，鮭魚擦乾，青花椰菜切小朵、甜椒切條。',
      '將味噌、蜂蜜與醬油拌勻，均勻抹在鮭魚表面。',
      '鮭魚與蔬菜排入烤盤，蔬菜薄刷食用油後送入烤箱。',
      '烘烤約 15 至 18 分鐘，確認鮭魚中心熟透後即可盛盤。'
    ].join('\n'));
    this.stepImageUrls.set([
      CreateRecipe.DemoPreparationImageUrl,
      null,
      CreateRecipe.DemoCoverImageUrl,
      CreateRecipe.DemoCoverImageUrl
    ]);
    this.stepTimerSeconds.set([300, 180, 900, 180]);
    this.youTubeUrl.set('https://www.youtube.com/watch?v=A72pr5Sdepw');
    this.categoryId.set(preferredCategory?.categoryId ?? null);
    this.selectedTagIds.set(
      preferredTagIds.length
        ? preferredTagIds
        : this.tags().slice(0, 3).map((tag) => tag.tagId)
    );
    this.coverImageUrl.set(CreateRecipe.DemoCoverImageUrl);
    this.coverPreviewUrl.set(CreateRecipe.DemoCoverImageUrl);
    this.isAiGenerated.set(false);
    this.createdRecipeId.set(null);
    this.statusMessage.set('Demo 食譜資料已快速填入，請確認內容後再發布。');
    this.messageService.add({
      severity: 'success',
      summary: 'Demo 資料已填入',
      detail: '已完成基本資料、圖片、食材、步驟、分類與標籤。'
    });
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
      stepTimerSeconds: this.stepTimerSeconds(),
      youTubeUrl: this.youTubeUrl(),
      categoryId: this.categoryId(),
      selectedTagIds: this.selectedTagIds(),
      coverImageUrl: this.coverImageUrl(),
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(this.draftStorageKey, JSON.stringify(draft));
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

  private loadRecipeForEditing(recipeId: number): void {
    this.isLoadingRecipe.set(true);
    forkJoin({
      metadata: this.recipeService.getMetadata(),
      recipe: this.recipeService.getRecipeById(recipeId),
      currentUser: this.authService.getCurrentUser()
    }).subscribe({
      next: ({ metadata, recipe, currentUser }) => {
        this.isLoadingRecipe.set(false);
        if (!metadata.success || !metadata.data) {
          this.showError(metadata.message || '無法載入食譜分類與標籤。');
          return;
        }
        if (!recipe.success || !recipe.data) {
          this.showError(recipe.message || '無法載入要編輯的食譜。');
          return;
        }

        if (currentUser.userId !== recipe.data.userId) {
          this.showError('只有食譜建立者可以修改內容。');
          void this.router.navigate(['/recipes', recipeId]);
          return;
        }

        this.categories.set(metadata.data.categories);
        this.tags.set(metadata.data.tags);
        this.populateEditor(recipe.data);
        if (!this.restoreDraft()) {
          this.statusMessage.set(`已載入「${recipe.data.title}」，儲存後會更新原食譜。`);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingRecipe.set(false);
        this.showError(this.readApiError(error, '無法載入要編輯的食譜。'));
        void this.router.navigate(['/main']);
      }
    });
  }

  private populateEditor(recipe: RecipeDetail): void {
    this.title.set(recipe.title);
    this.description.set(recipe.description ?? '');
    this.servings.set(recipe.defaultServings);
    this.cookingMinutes.set(recipe.cookingMinutes);
    this.totalCalories.set(recipe.totalCalories);
    this.ingredientRows.set(
      [...recipe.ingredients]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
          amount: ingredient.baseAmount ?? 1,
          unit: this.toSupportedUnit(ingredient.unit || '份')
        }))
    );

    const orderedSteps = [...recipe.steps].sort(
      (left, right) => left.stepNumber - right.stepNumber
    );
    this.instructionDraft.set(orderedSteps.map((step) => step.instruction).join('\n'));
    this.stepImageUrls.set(orderedSteps.map((step) => step.imageUrl));
    this.stepTimerSeconds.set(orderedSteps.map((step) => step.timerSeconds));
    this.youTubeUrl.set(
      recipe.youTubeVideoId
        ? `https://www.youtube.com/watch?v=${recipe.youTubeVideoId}`
        : ''
    );
    this.categoryId.set(recipe.categoryId);
    this.selectedTagIds.set(
      this.tags()
        .filter((tag) => recipe.tags.includes(tag.name))
        .map((tag) => tag.tagId)
    );
    this.coverImageUrl.set(recipe.coverImageUrl);
    this.coverPreviewUrl.set(recipe.coverImageUrl);
    this.isAiGenerated.set(recipe.isAiGenerated);
    this.createdRecipeId.set(recipe.recipeId);
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

  private restoreDraft(): boolean {
    const storedDraft = localStorage.getItem(this.draftStorageKey);
    if (!storedDraft) {
      return false;
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
      this.stepTimerSeconds.set(draft.stepTimerSeconds ?? []);
      this.youTubeUrl.set(draft.youTubeUrl ?? '');
      this.categoryId.set(draft.categoryId ?? null);
      this.selectedTagIds.set(draft.selectedTagIds ?? []);
      this.coverImageUrl.set(draft.coverImageUrl ?? null);
      this.coverPreviewUrl.set(draft.coverImageUrl ?? null);
      this.statusMessage.set('已載入上次保存在此瀏覽器的食譜草稿。');
      return true;
    } catch {
      localStorage.removeItem(this.draftStorageKey);
      return false;
    }
  }

  private get draftStorageKey(): string {
    const signedInUserName = this.authService.currentUser()?.userName.trim();
    const ownerKey = signedInUserName
      ? encodeURIComponent(signedInUserName)
      : 'authenticated-user';

    const editingRecipeId = this.editingRecipeId();
    return editingRecipeId
      ? `friendlyfood.recipe-draft.${ownerKey}.edit.${editingRecipeId}`
      : `friendlyfood.recipe-draft.${ownerKey}`;
  }

  private validateImageFile(file: File): string {
    if (!CreateRecipe.AllowedImageTypes.has(file.type)) {
      return '圖片僅支援 JPEG、PNG 或 WebP 格式。';
    }

    return file.size <= CreateRecipe.MaximumImageSizeBytes
      ? ''
      : '圖片不可超過 5 MB。';
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
        timerSeconds: this.stepTimerSeconds()[index] ?? 0
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

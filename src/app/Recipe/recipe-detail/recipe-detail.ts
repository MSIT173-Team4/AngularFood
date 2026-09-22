import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { recipeDemoConfig } from '../api.config';
import {
  RecipeAvailability,
  RecipeDetail as RecipeDetailModel,
  RecipeDetailPageData,
  RecipeShoppingList,
  RecipeShoppingListItem
} from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

interface RecipeAttribution {
  sourceName: string;
  sourceUrl: string;
  safetyNote: string;
}

@Component({
  selector: 'app-recipe-detail',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.css'
})
export class RecipeDetail implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly recipeService = inject(RecipeService);
  private readonly messageService = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);
  private nutritionObserver: IntersectionObserver | null = null;

  @ViewChild('nutritionPanel')
  private nutritionPanel?: ElementRef<HTMLElement>;

  readonly recipe = signal<RecipeDetailModel | null>(null);
  readonly dataNotice = signal('');
  readonly isUsingMockData = signal(false);
  readonly servings = signal(1);
  readonly isLiked = signal(false);
  readonly isFavorite = signal(false);
  readonly isUpdatingEngagement = signal(false);
  readonly likeCount = signal(0);
  readonly favoriteCount = signal(0);
  readonly availability = signal<RecipeAvailability | null>(null);
  readonly isLoadingAvailability = signal(false);
  readonly shoppingList = signal<RecipeShoppingList | null>(null);
  readonly shoppingDraft = signal<RecipeShoppingListItem[]>([]);
  readonly shoppingDialogVisible = signal(false);
  readonly isSavingShoppingList = signal(false);
  readonly nutritionVisible = signal(false);

  readonly recipeAttribution = computed<RecipeAttribution | null>(() => {
    const attributionText = this.recipe()?.aiPrepTips?.trim();
    if (!attributionText) {
      return null;
    }

    const attributionMatch = attributionText.match(
      /^資料來源：(.+?)｜(https?:\/\/[^。\s]+)。?(.*)$/s
    );

    if (!attributionMatch) {
      return {
        sourceName: '食譜補充說明',
        sourceUrl: '',
        safetyNote: attributionText
      };
    }

    return {
      sourceName: attributionMatch[1].trim(),
      sourceUrl: attributionMatch[2].trim(),
      safetyNote: attributionMatch[3].trim()
    };
  });

  readonly youtubeWatchUrl = computed(() => {
    const videoId = this.getValidYouTubeVideoId();
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
  });

  readonly youtubeEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const videoId = this.getValidYouTubeVideoId();
    return videoId
      ? this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube-nocookie.com/embed/${videoId}`
        )
      : null;
  });

  readonly scaledIngredients = computed(() => {
    const recipe = this.recipe();
    if (!recipe) {
      return [];
    }

    const servingRatio = this.servings() / recipe.defaultServings;
    const availabilityByIngredientId = new Map(
      this.availability()?.ingredients.map((item) => [item.ingredientId, item]) ?? []
    );

    return recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      availability: availabilityByIngredientId.get(ingredient.ingredientId) ?? null,
      scaledAmount: ingredient.baseAmount === null
        ? ingredient.displayAmount
        : `${this.formatAmount(ingredient.baseAmount * servingRatio)} ${ingredient.unit}`
    }));
  });

  readonly missingIngredients = computed(() =>
    this.scaledIngredients().filter((ingredient) =>
      ingredient.availability && !ingredient.availability.isSufficient
    )
  );

  readonly pendingShoppingCount = computed(() =>
    this.shoppingList()?.items.filter((item) => !item.isPurchased).length ?? 0
  );

  readonly nutritionProfile = computed(() => {
    const recipe = this.recipe();
    if (!recipe) {
      return { carbohydrates: 45, protein: 25, fat: 30, caloriesPerServing: 0 };
    }

    const labels = [recipe.categoryName ?? '', ...recipe.tags].join('');
    let carbohydrates = 45;
    let protein = 25;
    let fat = 30;
    if (/高蛋白|健身|雞胸|魚/.test(labels)) {
      carbohydrates = 35;
      protein = 40;
      fat = 25;
    } else if (/低醣|低碳|生酮/.test(labels)) {
      carbohydrates = 20;
      protein = 35;
      fat = 45;
    }

    return {
      carbohydrates,
      protein,
      fat,
      caloriesPerServing: Math.round(recipe.totalCalories / Math.max(recipe.defaultServings, 1))
    };
  });

  readonly nutritionGradient = computed(() => {
    const profile = this.nutritionProfile();
    const proteinEnd = profile.carbohydrates + profile.protein;
    return `conic-gradient(#5b8def 0 ${profile.carbohydrates}%, #e4a000 ${profile.carbohydrates}% ${proteinEnd}%, #d94c4c ${proteinEnd}% 100%)`;
  });

  ngOnInit(): void {
    const pageData = this.route.snapshot.data['pageData'] as RecipeDetailPageData;
    this.recipe.set(pageData.recipe);
    this.servings.set(pageData.recipe.defaultServings);
    this.likeCount.set(pageData.recipe.likes);
    this.favoriteCount.set(pageData.recipe.favorites);
    this.dataNotice.set(pageData.notice);
    this.isUsingMockData.set(pageData.source === 'mock');

    if (pageData.source === 'api') {
      this.recordView(pageData.recipe.recipeId);
      this.loadAvailability();
      this.loadShoppingList();
    }

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    }
  }

  ngAfterViewInit(): void {
    const nutritionElement = this.nutritionPanel?.nativeElement;
    if (!nutritionElement || typeof IntersectionObserver === 'undefined') {
      this.nutritionVisible.set(true);
      return;
    }

    this.nutritionObserver = new IntersectionObserver(
      ([entry]) => {
        this.nutritionVisible.set(entry.isIntersecting);
      },
      { threshold: 0.35, rootMargin: '0px 0px -8% 0px' }
    );
    this.nutritionObserver.observe(nutritionElement);
  }

  ngOnDestroy(): void {
    this.nutritionObserver?.disconnect();
  }

  decreaseServings(): void {
    this.servings.update((current) => Math.max(1, current - 1));
    this.loadAvailability();
  }

  increaseServings(): void {
    this.servings.update((current) => Math.min(20, current + 1));
    this.loadAvailability();
  }

  openShoppingList(): void {
    const currentItems = (this.shoppingList()?.items ?? []).map((item) => ({ ...item }));
    const draftByIngredientId = new Map(
      currentItems.map((item) => [item.ingredientId, item])
    );

    this.missingIngredients().forEach((ingredient) => {
      const availability = ingredient.availability!;
      const shortage = Math.max(
        Number((availability.requiredAmount - availability.availableAmount).toFixed(2)),
        0.01
      );
      const existingItem = draftByIngredientId.get(ingredient.ingredientId);
      if (existingItem) {
        existingItem.quantity = Math.max(existingItem.quantity, shortage);
        return;
      }

      const item: RecipeShoppingListItem = {
        shoppingItemId: 0,
        ingredientId: ingredient.ingredientId,
        ingredientName: ingredient.name,
        quantity: shortage,
        unit: availability.unit || ingredient.unit || '份',
        isPurchased: false,
        note: `來自食譜：${this.recipe()?.title ?? ''}`
      };
      currentItems.push(item);
      draftByIngredientId.set(item.ingredientId, item);
    });

    this.shoppingDraft.set(currentItems);
    this.shoppingDialogVisible.set(true);
  }

  updateShoppingItem<K extends keyof RecipeShoppingListItem>(
    index: number,
    field: K,
    value: RecipeShoppingListItem[K]
  ): void {
    this.shoppingDraft.update((items) => items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  }

  removeShoppingItem(index: number): void {
    this.shoppingDraft.update((items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  saveShoppingList(): void {
    const items = this.shoppingDraft();
    if (items.some((item) => item.quantity <= 0 || !item.unit.trim())) {
      this.showError('採購數量必須大於零，且每項食材都要有單位。');
      return;
    }

    this.isSavingShoppingList.set(true);
    this.recipeService.saveShoppingList(recipeDemoConfig.userId, {
      listName: this.shoppingList()?.listName || '我的料理採購清單',
      items: items.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        isPurchased: item.isPurchased,
        note: item.note
      }))
    }).subscribe({
      next: (response) => {
        this.isSavingShoppingList.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.shoppingList.set(response.data);
        this.shoppingDraft.set(response.data.items.map((item) => ({ ...item })));
        this.shoppingDialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: '採購清單已保留',
          detail: response.message
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingShoppingList.set(false);
        this.showError(
          typeof error.error?.message === 'string'
            ? error.error.message
            : '採購清單儲存失敗。'
        );
      }
    });
  }

  toggleLike(): void {
    this.updateEngagement('like');
  }

  toggleFavorite(): void {
    this.updateEngagement('favorite');
  }

  private recordView(recipeId: number): void {
    this.recipeService.recordView(recipeId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.recipe.update((current) => current
            ? { ...current, views: response.data!.viewCount }
            : current);
        }
      }
    });
  }

  private loadAvailability(): void {
    const recipe = this.recipe();
    if (!recipe || this.isUsingMockData()) {
      return;
    }

    this.isLoadingAvailability.set(true);
    this.recipeService.getAvailability(
      recipe.recipeId,
      recipeDemoConfig.userId,
      this.servings()
    ).subscribe({
      next: (response) => {
        this.isLoadingAvailability.set(false);
        this.availability.set(response.success ? response.data : null);
      },
      error: () => {
        this.isLoadingAvailability.set(false);
        this.availability.set(null);
      }
    });
  }

  private loadShoppingList(): void {
    this.recipeService.getShoppingList(recipeDemoConfig.userId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.shoppingList.set(response.data);
        }
      }
    });
  }

  private updateEngagement(action: 'like' | 'favorite'): void {
    const recipe = this.recipe();
    if (!recipe || this.isUsingMockData() || this.isUpdatingEngagement()) {
      return;
    }

    this.isUpdatingEngagement.set(true);
    const request = action === 'like'
      ? this.recipeService.toggleLike(recipe.recipeId, recipeDemoConfig.userId)
      : this.recipeService.toggleFavorite(recipe.recipeId, recipeDemoConfig.userId);

    request.subscribe({
      next: (response) => {
        this.isUpdatingEngagement.set(false);
        if (!response.success || !response.data) {
          this.showError(response.message);
          return;
        }

        this.isLiked.set(response.data.isLiked);
        this.isFavorite.set(response.data.isFavorite);
        this.likeCount.set(response.data.likeCount);
        this.favoriteCount.set(response.data.favoriteCount);
      },
      error: (error: HttpErrorResponse) => {
        this.isUpdatingEngagement.set(false);
        this.showError(
          typeof error.error?.message === 'string'
            ? error.error.message
            : '更新食譜互動狀態失敗。'
        );
      }
    });
  }

  private formatAmount(amount: number): string {
    return Number.isInteger(amount)
      ? amount.toString()
      : amount.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  private getValidYouTubeVideoId(): string {
    const videoId = this.recipe()?.youTubeVideoId?.trim() ?? '';
    return /^[\w-]{11}$/.test(videoId) ? videoId : '';
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: '操作失敗', detail });
  }
}

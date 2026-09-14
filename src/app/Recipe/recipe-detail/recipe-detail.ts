import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { recipeDemoConfig } from '../api.config';
import { RecipeDetail as RecipeDetailModel, RecipeDetailPageData } from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

@Component({
  selector: 'app-recipe-detail',
  imports: [RouterLink, ButtonModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.css'
})
export class RecipeDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly recipeService = inject(RecipeService);
  private readonly messageService = inject(MessageService);

  readonly recipe = signal<RecipeDetailModel | null>(null);
  readonly dataNotice = signal('');
  readonly isUsingMockData = signal(false);
  readonly servings = signal(1);
  readonly isLiked = signal(false);
  readonly isFavorite = signal(false);
  readonly isUpdatingEngagement = signal(false);
  readonly likeCount = signal(0);
  readonly favoriteCount = signal(0);

  readonly scaledIngredients = computed(() => {
    const recipe = this.recipe();
    if (!recipe) {
      return [];
    }

    const servingRatio = this.servings() / recipe.defaultServings;
    return recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      scaledAmount: ingredient.baseAmount === null
        ? ingredient.displayAmount
        : `${this.formatAmount(ingredient.baseAmount * servingRatio)} ${ingredient.unit}`
    }));
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
    }
  }

  decreaseServings(): void {
    this.servings.update((current) => Math.max(1, current - 1));
  }

  increaseServings(): void {
    this.servings.update((current) => Math.min(20, current + 1));
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

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: '操作失敗', detail });
  }
}

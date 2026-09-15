import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { MOCK_RECIPES, getMockRecipeDetail } from './mock-recipe.data';
import {
  PantryPageData,
  RecipeDetailPageData,
  RecipeListPageData
} from './recipe.models';
import { RecipeService } from './service/recipe.service';
import { recipeDemoConfig } from './api.config';

export const recipeListResolver: ResolveFn<RecipeListPageData> = () => {
  const recipeService = inject(RecipeService);

  return recipeService.getRecipes().pipe(
    map((response) => response.success && response.data?.length
      ? { recipes: response.data, source: 'api' as const, notice: response.message }
      : { recipes: MOCK_RECIPES, source: 'mock' as const, notice: 'API 無公開食譜，已載入測試資料。' }),
    catchError(() => of({
      recipes: MOCK_RECIPES,
      source: 'mock' as const,
      notice: 'Web API 尚未連線，已自動切換為 Mock 測試資料。'
    }))
  );
};

export const recipeDetailResolver: ResolveFn<RecipeDetailPageData> = (route: ActivatedRouteSnapshot) => {
  const recipeService = inject(RecipeService);
  const recipeId = Number(route.paramMap.get('id')) || 1;

  return recipeService.getRecipeById(recipeId).pipe(
    map((response) => response.success && response.data
      ? { recipe: response.data, source: 'api' as const, notice: response.message }
      : { recipe: getMockRecipeDetail(recipeId), source: 'mock' as const, notice: '找不到 API 資料，已載入對應測試食譜。' }),
    catchError(() => of({
      recipe: getMockRecipeDetail(recipeId),
      source: 'mock' as const,
      notice: 'Web API 尚未連線，已自動切換為 Mock 食譜詳情。'
    }))
  );
};

export const pantryResolver: ResolveFn<PantryPageData> = () => {
  const recipeService = inject(RecipeService);

  return recipeService.getPantryItems(recipeDemoConfig.userId).pipe(
    map((response) => response.success
      ? {
          pantryItems: response.data ?? [],
          source: 'api' as const,
          notice: response.data?.length
            ? response.message
            : '目前尚未建立冰箱庫存，可拍照或手動新增第一項食材。'
        }
      : {
          pantryItems: [],
          source: 'api' as const,
          notice: response.message || '目前無法讀取冰箱庫存。'
        }),
    catchError(() => of({
      pantryItems: [],
      source: 'api' as const,
      notice: '目前無法連線冰箱服務，請稍後重新整理。'
    }))
  );
};

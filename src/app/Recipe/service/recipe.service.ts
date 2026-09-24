import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiConfig } from '../api.config';
import {
  ApiResponse,
  ChefRecommendation,
  CompleteCookingRequest,
  CookingDeductionResult,
  CreateRecipePayload,
  IngredientLocalization,
  IngredientNormalization,
  PantryItem,
  ParsedRecipe,
  RecipeAsset,
  RecipeAvailability,
  RecipeDetail,
  RecipeEngagement,
  RecipeMetadata,
  RecipeRecommendation,
  RecipeShoppingList,
  RecipeSummary,
  RecipeView,
  SaveRecipeShoppingListPayload,
  TrendingRecipe
} from '../recipe.models';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly http = inject(HttpClient);

  getRecipes(userId?: number): Observable<ApiResponse<RecipeSummary[]>> {
    const params = userId
      ? new HttpParams().set('userId', userId)
      : undefined;

    return this.http.get<ApiResponse<RecipeSummary[]>>(
      apiConfig.recipes.list,
      { params }
    );
  }

  getRecipeById(id: number): Observable<ApiResponse<RecipeDetail>> {
    return this.http.get<ApiResponse<RecipeDetail>>(apiConfig.recipes.detail(id));
  }

  getMetadata(): Observable<ApiResponse<RecipeMetadata>> {
    return this.http.get<ApiResponse<RecipeMetadata>>(apiConfig.recipes.metadata);
  }

  getRecommendations(
    userId: number,
    limit = 12
  ): Observable<ApiResponse<RecipeRecommendation[]>> {
    return this.http.get<ApiResponse<RecipeRecommendation[]>>(
      apiConfig.recipes.recommendations(userId, limit)
    );
  }

  getTrendingRecipes(limit = 8): Observable<ApiResponse<TrendingRecipe[]>> {
    return this.http.get<ApiResponse<TrendingRecipe[]>>(
      apiConfig.recipes.trending(limit)
    );
  }

  getPantryItems(userId: number): Observable<ApiResponse<PantryItem[]>> {
    return this.http.get<ApiResponse<PantryItem[]>>(
      apiConfig.pantry.listByUser(userId)
    );
  }

  completeCooking(payload: CompleteCookingRequest): Observable<ApiResponse<CookingDeductionResult[]>> {
    return this.http.post<ApiResponse<CookingDeductionResult[]>>(
      apiConfig.recipes.completeCooking,
      payload
    );
  }

  recordView(recipeId: number): Observable<ApiResponse<RecipeView>> {
    return this.http.post<ApiResponse<RecipeView>>(
      apiConfig.recipes.view(recipeId),
      {}
    );
  }

  toggleLike(recipeId: number, userId: number): Observable<ApiResponse<RecipeEngagement>> {
    return this.http.post<ApiResponse<RecipeEngagement>>(
      apiConfig.recipes.like(recipeId),
      { userId }
    );
  }

  toggleFavorite(recipeId: number, userId: number): Observable<ApiResponse<RecipeEngagement>> {
    return this.http.post<ApiResponse<RecipeEngagement>>(
      apiConfig.recipes.favorite(recipeId),
      { userId }
    );
  }

  getAvailability(
    recipeId: number,
    userId: number,
    targetServings: number
  ): Observable<ApiResponse<RecipeAvailability>> {
    return this.http.get<ApiResponse<RecipeAvailability>>(
      apiConfig.recipes.availability(recipeId, userId, targetServings)
    );
  }

  getShoppingList(userId: number): Observable<ApiResponse<RecipeShoppingList>> {
    return this.http.get<ApiResponse<RecipeShoppingList>>(
      apiConfig.recipes.shoppingList(userId)
    );
  }

  saveShoppingList(
    userId: number,
    payload: SaveRecipeShoppingListPayload
  ): Observable<ApiResponse<RecipeShoppingList>> {
    return this.http.put<ApiResponse<RecipeShoppingList>>(
      apiConfig.recipes.shoppingList(userId),
      payload
    );
  }

  createRecipe(payload: CreateRecipePayload): Observable<ApiResponse<RecipeDetail>> {
    return this.http.post<ApiResponse<RecipeDetail>>(apiConfig.recipes.create, payload);
  }

  uploadCover(file: File): Observable<ApiResponse<RecipeAsset>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ApiResponse<RecipeAsset>>(
      apiConfig.recipes.uploadCover,
      formData
    );
  }

  uploadStepImage(file: File): Observable<ApiResponse<RecipeAsset>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ApiResponse<RecipeAsset>>(
      apiConfig.recipes.uploadStepImage,
      formData
    );
  }

  normalizeIngredient(
    ingredientName: string,
    amount: number,
    unit: string
  ): Observable<ApiResponse<IngredientNormalization>> {
    return this.http.post<ApiResponse<IngredientNormalization>>(
      apiConfig.recipes.normalizeIngredient,
      { ingredientName, amount, unit }
    );
  }

  localizeIngredient(
    ingredientName: string
  ): Observable<ApiResponse<IngredientLocalization>> {
    return this.http.post<ApiResponse<IngredientLocalization>>(
      apiConfig.recipes.ai.localizeIngredient,
      { ingredientName }
    );
  }

  parseRecipe(content: string): Observable<ApiResponse<ParsedRecipe>> {
    return this.http.post<ApiResponse<ParsedRecipe>>(
      apiConfig.recipes.ai.parseRecipe,
      { content }
    );
  }

  getChefRecommendation(
    ingredientNames: string[]
  ): Observable<ApiResponse<ChefRecommendation>> {
    return this.http.post<ApiResponse<ChefRecommendation>>(
      apiConfig.recipes.ai.chefRecommend,
      { ingredientNames }
    );
  }
}

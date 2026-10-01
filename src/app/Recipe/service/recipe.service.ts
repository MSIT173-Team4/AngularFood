import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getRecipes(): Observable<ApiResponse<RecipeSummary[]>> {
    return this.http.get<ApiResponse<RecipeSummary[]>>(
      apiConfig.recipes.list,
      { withCredentials: true }
    );
  }

  getRecipeById(id: number): Observable<ApiResponse<RecipeDetail>> {
    return this.http.get<ApiResponse<RecipeDetail>>(
      apiConfig.recipes.detail(id),
      { withCredentials: true }
    );
  }

  getMetadata(): Observable<ApiResponse<RecipeMetadata>> {
    return this.http.get<ApiResponse<RecipeMetadata>>(
      apiConfig.recipes.metadata,
      { withCredentials: true }
    );
  }

  getRecommendations(
    limit = 12
  ): Observable<ApiResponse<RecipeRecommendation[]>> {
    return this.http.get<ApiResponse<RecipeRecommendation[]>>(
      apiConfig.recipes.recommendations(limit),
      { withCredentials: true }
    );
  }

  getTrendingRecipes(limit = 8): Observable<ApiResponse<TrendingRecipe[]>> {
    return this.http.get<ApiResponse<TrendingRecipe[]>>(
      apiConfig.recipes.trending(limit),
      { withCredentials: true }
    );
  }

  getPantryItems(): Observable<ApiResponse<PantryItem[]>> {
    return this.http.get<ApiResponse<PantryItem[]>>(
      apiConfig.pantry.list,
      { withCredentials: true }
    );
  }

  completeCooking(payload: CompleteCookingRequest): Observable<ApiResponse<CookingDeductionResult[]>> {
    return this.http.post<ApiResponse<CookingDeductionResult[]>>(
      apiConfig.recipes.completeCooking,
      payload,
      { withCredentials: true }
    );
  }

  recordView(recipeId: number): Observable<ApiResponse<RecipeView>> {
    return this.http.post<ApiResponse<RecipeView>>(
      apiConfig.recipes.view(recipeId),
      {},
      { withCredentials: true }
    );
  }

  toggleLike(recipeId: number): Observable<ApiResponse<RecipeEngagement>> {
    return this.http.post<ApiResponse<RecipeEngagement>>(
      apiConfig.recipes.like(recipeId),
      {},
      { withCredentials: true }
    );
  }

  toggleFavorite(recipeId: number): Observable<ApiResponse<RecipeEngagement>> {
    return this.http.post<ApiResponse<RecipeEngagement>>(
      apiConfig.recipes.favorite(recipeId),
      {},
      { withCredentials: true }
    );
  }

  getAvailability(
    recipeId: number,
    targetServings: number
  ): Observable<ApiResponse<RecipeAvailability>> {
    return this.http.get<ApiResponse<RecipeAvailability>>(
      apiConfig.recipes.availability(recipeId, targetServings),
      { withCredentials: true }
    );
  }

  getShoppingList(): Observable<ApiResponse<RecipeShoppingList>> {
    return this.http.get<ApiResponse<RecipeShoppingList>>(
      apiConfig.recipes.shoppingList,
      { withCredentials: true }
    );
  }

  saveShoppingList(
    payload: SaveRecipeShoppingListPayload
  ): Observable<ApiResponse<RecipeShoppingList>> {
    return this.http.put<ApiResponse<RecipeShoppingList>>(
      apiConfig.recipes.shoppingList,
      payload,
      { withCredentials: true }
    );
  }

  createRecipe(payload: CreateRecipePayload): Observable<ApiResponse<RecipeDetail>> {
    return this.http.post<ApiResponse<RecipeDetail>>(
      apiConfig.recipes.create,
      payload,
      { withCredentials: true }
    );
  }

  uploadCover(file: File): Observable<ApiResponse<RecipeAsset>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ApiResponse<RecipeAsset>>(
      apiConfig.recipes.uploadCover,
      formData,
      { withCredentials: true }
    );
  }

  uploadStepImage(file: File): Observable<ApiResponse<RecipeAsset>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ApiResponse<RecipeAsset>>(
      apiConfig.recipes.uploadStepImage,
      formData,
      { withCredentials: true }
    );
  }

  normalizeIngredient(
    ingredientName: string,
    amount: number,
    unit: string
  ): Observable<ApiResponse<IngredientNormalization>> {
    return this.http.post<ApiResponse<IngredientNormalization>>(
      apiConfig.recipes.normalizeIngredient,
      { ingredientName, amount, unit },
      { withCredentials: true }
    );
  }

  localizeIngredient(
    ingredientName: string
  ): Observable<ApiResponse<IngredientLocalization>> {
    return this.http.post<ApiResponse<IngredientLocalization>>(
      apiConfig.recipes.ai.localizeIngredient,
      { ingredientName },
      { withCredentials: true }
    );
  }

  parseRecipe(content: string): Observable<ApiResponse<ParsedRecipe>> {
    return this.http.post<ApiResponse<ParsedRecipe>>(
      apiConfig.recipes.ai.parseRecipe,
      { content },
      { withCredentials: true }
    );
  }

  getChefRecommendation(
    ingredientNames: string[]
  ): Observable<ApiResponse<ChefRecommendation>> {
    return this.http.post<ApiResponse<ChefRecommendation>>(
      apiConfig.recipes.ai.chefRecommend,
      { ingredientNames },
      { withCredentials: true }
    );
  }
}

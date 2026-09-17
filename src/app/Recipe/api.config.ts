const friendlyFoodApiBaseUrl = 'https://localhost:7164/api';

export const apiConfig = {
  recipes: {
    list: `${friendlyFoodApiBaseUrl}/recipe`,
    detail: (recipeId: number) => `${friendlyFoodApiBaseUrl}/recipe/${recipeId}`,
    metadata: `${friendlyFoodApiBaseUrl}/recipe/metadata`,
    create: `${friendlyFoodApiBaseUrl}/recipe`,
    update: (recipeId: number) => `${friendlyFoodApiBaseUrl}/recipe/${recipeId}`,
    delete: (recipeId: number) => `${friendlyFoodApiBaseUrl}/recipe/${recipeId}`,
    completeCooking: `${friendlyFoodApiBaseUrl}/recipe/complete-cooking`,
    recommendations: (userId: number, limit = 12) =>
      `${friendlyFoodApiBaseUrl}/recipe/recommendations?userId=${userId}&limit=${limit}`,
    trending: (limit = 8) => `${friendlyFoodApiBaseUrl}/recipe/trending?limit=${limit}`,
    view: (recipeId: number) => `${friendlyFoodApiBaseUrl}/recipe/${recipeId}/view`,
    like: (recipeId: number) => `${friendlyFoodApiBaseUrl}/recipe/${recipeId}/like`,
    favorite: (recipeId: number) => `${friendlyFoodApiBaseUrl}/recipe/${recipeId}/favorite`,
    uploadCover: `${friendlyFoodApiBaseUrl}/recipe/assets/cover`,
    normalizeIngredient: `${friendlyFoodApiBaseUrl}/recipe/ingredients/normalize`,
    ai: {
      localizeIngredient: `${friendlyFoodApiBaseUrl}/recipe/ai/localize-ingredient`,
      parseRecipe: `${friendlyFoodApiBaseUrl}/recipe/ai/parse-recipe`,
      chefRecommend: `${friendlyFoodApiBaseUrl}/recipe/ai/chef-recommend`
    }
  },
  pantry: {
    listByUser: (userId: number) => `${friendlyFoodApiBaseUrl}/recipe/pantry/user/${userId}`,
    diagnoseImage: `${friendlyFoodApiBaseUrl}/pantry/diagnose-image`,
    addItem: `${friendlyFoodApiBaseUrl}/pantry/add-item`,
    create: `${friendlyFoodApiBaseUrl}/recipe/pantry`,
    update: (pantryId: number) => `${friendlyFoodApiBaseUrl}/recipe/pantry/${pantryId}`,
    delete: (pantryId: number) => `${friendlyFoodApiBaseUrl}/recipe/pantry/${pantryId}`
  }
} as const;

export const recipeDemoConfig = {
  userId: 2
} as const;

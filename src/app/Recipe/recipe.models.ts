export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
  timestamp: string;
}

export interface RecipeIngredient {
  ingredientId: number;
  name: string;
  displayAmount: string;
  baseAmount: number | null;
  unit: string;
  isMain: boolean;
  sortOrder: number;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  imageUrl: string | null;
  timerSeconds: number;
}

export interface RecipeDetail {
  recipeId: number;
  userId: number;
  categoryId: number | null;
  title: string;
  description: string;
  coverImageUrl: string | null;
  youTubeVideoId: string | null;
  aiPrepTips: string | null;
  isAiGenerated: boolean;
  cookingMinutes: number;
  defaultServings: number;
  totalCalories: number;
  views: number;
  likes: number;
  favorites: number;
  categoryName: string | null;
  authorId?: number;
  authorName: string;
  authorImageUrl?: string | null;
  authorRecipeCount?: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface RecipeSummary {
  recipeId: number;
  title: string;
  description: string;
  coverImageUrl: string | null;
  cookingMinutes: number;
  totalCalories: number;
  defaultServings: number;
  views: number;
  likes: number;
  favorites: number;
  isAiGenerated: boolean;
  categoryName: string | null;
  authorId?: number;
  authorName: string;
  authorImageUrl?: string | null;
  authorRecipeCount?: number;
  tags: string[];
}

export interface PantryItem {
  pantryId: number;
  userId: number;
  ingredientId: number;
  ingredientName: string;
  amount: number;
  unit: string;
  expirationDate: string | null;
  daysLeft: number;
  storageLocation: string;
  note: string | null;
  createdAt: string;
}

export type DataSource = 'api' | 'mock';

export interface RecipeListPageData {
  recipes: RecipeSummary[];
  source: DataSource;
  notice: string;
}

export interface RecipeDetailPageData {
  recipe: RecipeDetail;
  source: DataSource;
  notice: string;
}

export interface PantryPageData {
  pantryItems: PantryItem[];
  source: DataSource;
  notice: string;
}

export interface CompleteCookingRequest {
  userId: number;
  recipeId: number;
  targetServings: number;
}

export interface CookingDeductionResult {
  ingredientId: number;
  ingredientName: string;
  requiredAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  unit: string;
  isExhausted: boolean;
  isInsufficient: boolean;
}

export interface RecipeCategory {
  categoryId: number;
  name: string;
  displayOrder: number;
}

export interface RecipeTag {
  tagId: number;
  type: string;
  name: string;
}

export interface RecipeMetadata {
  categories: RecipeCategory[];
  tags: RecipeTag[];
}

export interface RecipeEngagement {
  recipeId: number;
  userId: number;
  isLiked: boolean;
  isFavorite: boolean;
  likeCount: number;
  favoriteCount: number;
}

export interface RecipeView {
  recipeId: number;
  viewCount: number;
}

export interface RecipeMatchIngredient {
  ingredientId: number;
  name: string;
  daysUntilExpiration: number | null;
}

export interface RecipeRecommendation {
  recipeId: number;
  title: string;
  coverImageUrl: string | null;
  categoryName: string;
  cookingMinutes: number;
  matchPercentage: number;
  matchedIngredientCount: number;
  requiredIngredientCount: number;
  isReadyToCook: boolean;
  availableIngredients: RecipeMatchIngredient[];
  expiringIngredients: RecipeMatchIngredient[];
  missingIngredients: RecipeMatchIngredient[];
  explanation: string;
}

export interface TrendingRecipe {
  recipe: RecipeSummary;
  timeDecayScore: number;
}

export interface RecipeIngredientInput {
  ingredientId: number | null;
  name: string;
  displayAmount: string;
  baseAmount: number | null;
  standardUnit: string | null;
  isMain: boolean;
  sortOrder: number;
}

export interface RecipeStepInput {
  stepNumber: number;
  instruction: string;
  imageUrl: string | null;
  timerSeconds: number;
}

export interface CreateRecipePayload {
  userId: number;
  categoryId: number;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  youTubeVideoId: string | null;
  aiPrepTips: string | null;
  isAiGenerated: boolean;
  defaultServings: number;
  cookingMinutes: number;
  totalCalories: number;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
  tagIds: number[];
}

export interface RecipeAsset {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  recommendedWidth: number;
  recommendedHeight: number;
}

export interface IngredientNormalization {
  ingredientId: number | null;
  rawIngredientName: string;
  standardIngredientName: string;
  originalAmount: number;
  standardAmount: number;
  originalUnit: string;
  standardUnit: string;
  displayAmount: string;
  conversionApplied: boolean;
}

export interface ParsedRecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface ParsedRecipeStep {
  stepNumber: number;
  description: string;
}

export interface ParsedRecipe {
  recipeTitle: string;
  ingredients: ParsedRecipeIngredient[];
  steps: ParsedRecipeStep[];
}

export interface IngredientLocalization {
  rawInput: string;
  standardTaiwaneseName: string | null;
  category: string;
}

export interface ChefRecommendation {
  recommendation: string;
  generatedAt: string;
}

export interface RecipeIngredientAvailability {
  ingredientId: number;
  ingredientName: string;
  requiredAmount: number;
  availableAmount: number;
  unit: string;
  isSufficient: boolean;
}

export interface RecipeAvailability {
  recipeId: number;
  userId: number;
  targetServings: number;
  ingredients: RecipeIngredientAvailability[];
}

export interface RecipeShoppingListItem {
  shoppingItemId: number;
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  isPurchased: boolean;
  note: string | null;
}

export interface RecipeShoppingList {
  shoppingListId: number;
  userId: number;
  listName: string;
  status: string;
  updatedTime: string | null;
  items: RecipeShoppingListItem[];
}

export interface SaveRecipeShoppingListPayload {
  listName: string;
  items: Array<{
    ingredientId: number;
    quantity: number;
    unit: string;
    isPurchased: boolean;
    note: string | null;
  }>;
}

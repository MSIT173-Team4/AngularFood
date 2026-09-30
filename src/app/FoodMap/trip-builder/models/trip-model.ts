// 對應後端 GoogleTravelMode（序列化成數字）
export enum GoogleTravelMode {
  Drive = 0,
  Walk = 1,
  Bicycle = 2,
  TwoWheeler = 3,
  Transit = 4
}

// POST /api/trips/plan/preview、/api/trips/plan 的 body（後端 PlanTripApiRequest）
export interface PlanTripRequest {
  shoppingListId: number;
  originLatitude: number;
  originLongitude: number;
  travelMode: GoogleTravelMode;
  searchRadiusMeters?: number;
}

export interface ShoppingListItemDto {
  fShoppingListItemId: number;
  fIngredientId: number;
  fIngredientName: string;
  fQuantity: number | null;
  fUnit: string | null;
  fIsPurchased: boolean;
}

// 預覽結果裡的一間候選店家（後端 TripCandidateDTO）
export interface TripCandidateDto {
  fPlaceId: number;
  fGooglePlaceId: string | null;
  fName: string;
  fAddress: string;
  fLatitude: number;
  fLongitude: number;
  fPlaceCategoryId: number;
  fGoogleRating: number | null;
  isRecommend: boolean;
  isSuggested: boolean;
  suggestedOrder: number | null;
  matchedItemIds: number[];
  matchedItemNames: string[];
  distanceMeters: number;
}

// 後端 PlanTripPreviewResultDTO（還沒存檔）
export interface PlanTripPreviewResult {
  shoppingListId: number;
  listName: string;
  originLatitude: number;
  originLongitude: number;
  travelMode: GoogleTravelMode;
  searchRadiusMeters: number;
  totalItemCount: number;
  items: ShoppingListItemDto[];
  candidates: TripCandidateDto[];
  finalCoveragePercentage: number;
  uncoveredItemNames: string[];
}

// POST /api/trips/plan/confirm 的 body（後端 ConfirmTripRequestDTO）
export interface ConfirmTripRequest {
  fTripName: string;
  shoppingListId?: number | null;
  travelMode: GoogleTravelMode;
  // fPlaceCategoryId：預覽時找到這家店的分類，後端用來計算跟預覽一致的覆蓋率
  places: { fPlaceID: number; fSortOrder: number; fPlaceCategoryId?: number | null }[];
}

export interface TripPlaceDto {
  fTripPlaceId: number;
  fPlaceId: number;
  fPlaceName: string;
  fAddress: string;
  fLatitude: number;
  fLongitude: number;
  fSortOrder: number;
}

export interface TripRouteDto {
  fFromTripPlaceId: number | null;
  fToTripPlaceId: number | null;
  fDistanceMeters: number | null;
  fDurationSeconds: number | null;
  fPolyline: string | null;
}

export interface TripDto {
  fTripId: number;
  fTripName: string;
  fStatus: string | null;
  fDescription: string | null;
  fCreatedTime: string;
  places: TripPlaceDto[];
  routes: TripRouteDto[];
  totalDistanceMeters: number | null;
  totalDurationSeconds: number | null;
}

export interface PlanTripResult {
  trip: TripDto;
  finalCoveragePercentage: number;
  uncoveredItemNames: string[];
}

// GET /api/trips/planning-context
export interface LocationDto {
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface PlanningContext {
  shoppingListId: number | null;
  listName: string | null;
  pendingItemCount: number;
  memberLocation: LocationDto | null;
}

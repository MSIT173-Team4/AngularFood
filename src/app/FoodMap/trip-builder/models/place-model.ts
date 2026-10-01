// 欄位命名對齊 .NET 預設的 camelCase 序列化：FPlaceId → fPlaceId

// POST /api/places/nearby 的 body
export interface NearbyRequest {
  fLatitude: number;
  fLongitude: number;
  fPlacesCategoryId?: number | null;
  minimumRequests?: number;
  radiusMeters?: number | null;
}

export interface PlaceDto {
  fPlaceId: number; // 0 代表還沒存進 tFoodMapPlace
  fGooglePlaceId?: string | null;
  fPlaceCategoryId?: number | null;
  fName: string;
  fAddress: string;
  fLatitude: number;
  fLongitude: number;
  fPhone?: string | null;
  fGoogleRating?: number | null;
  fGoogleReviewCount?: number | null;
  fBusinessStatus?: string | null;
  fIsRecommend?: boolean | null;
}

export interface NearbyResponse {
  fLatitude: number;
  fLongitude: number;
  searchRadiusKm: number;
  expandedSearch: boolean;
  resultCount: number;
  places: PlaceDto[];
}

// POST /api/places/search 的 body
export interface PlaceSearchRequest {
  query: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
}

// POST /api/places/resolve 的 body（後端 ResolvePlaceRequestDTO，欄位名稱要一致）
export interface ResolvePlaceRequest {
  fGooglePlaceId: string;
  fPlaceCategoryId?: number;
}

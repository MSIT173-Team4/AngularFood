// 欄位命名對齊 .NET 預設 System.Text.Json 的 camelCase 序列化規則：
// FPlaceId → fPlaceId、FGooglePlaceId → fGooglePlaceId ...以此類推。
// 如果後端 Program.cs 另外關掉 camelCase，這裡要改回 PascalCase。

export interface NearbyRequest {
  fLatitude: number;
  fLongitude: number;
  fPlacesCategoryId?: number | null;
  minimumRequests?: number;
}

export interface PlaceDto {
  fPlaceId: number;
  fGooglePlaceId?: string | null;
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

// ⚠️ 假設：/api/places/resolve 吃這個形狀，對照你實際的
// ResolvePlaceRequestDto 調整欄位名稱。
export interface ResolvePlaceRequest {
  googlePlaceId: string;
  categoryId: number;
}

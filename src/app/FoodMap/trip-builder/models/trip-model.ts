export enum GoogleTravelMode {
  Drive = 0,
  Walk = 1,
  Bicycle = 2,
  TwoWheeler = 3,
  Transit = 4
}

// 對應後端 PlanTripApiRequest（Controllers/FoodMap/TripsController.cs）
export interface PlanTripRequest {
  shoppingListId: number;
  originLatitude: number;
  originLongitude: number;
  travelMode: GoogleTravelMode;
  searchRadiusMeters?: number;
}

// 對應後端 TripPlaceDTO —— 已用 Postman 實測驗證過，欄位名稱、大小寫都以實測結果為準
export interface TripPlaceDto {
  fTripPlaceId: number;
  fPlaceId: number;
  fPlaceName: string;
  fAddress: string;
  fLatitude: number;
  fLongitude: number;
  fSortOrder: number;
}

// 對應後端 TripDTO
export interface TripDto {
  fTripId: number;
  fTripName: string;
  places: TripPlaceDto[];
}

// 對應後端 PlanTripResultDTO —— 已用 Postman 實測驗證過
export interface PlanTripResult {
  trip: TripDto;
  finalCoveragePercentage: number;
  uncoveredItemNames: string[];
}

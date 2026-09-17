// ⚠️ 假設：POST /api/trips 吃這個形狀，對照你實際的
// CreateTripDto／TripDto 調整欄位名稱與巢狀結構。

export interface CreateTripPlaceRequest {
  placeId: number;
  sortOrder: number;
}

export interface CreateTripRequest {
  name: string;
  places: CreateTripPlaceRequest[];
}

export interface TripPlaceDto {
  tripPlaceId: number;
  placeId: number;
  placeName: string;
  sortOrder: number;
}

export interface TripDto {
  tripId: number;
  name: string;
  places: TripPlaceDto[];
}

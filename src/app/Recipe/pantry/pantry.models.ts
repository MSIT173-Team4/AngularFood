export interface PantryAiDiagnosticDto {
  ingredientName: string;
  freshnessStatus: string;
  recommendedLocation: '冷藏' | '冷凍' | '常溫';
  storageTip: string;
  estimatedDays: number;
}

export interface AddPantryItemPayload {
  userId: number;
  ingredientName: string;
  amount: number;
  unit: string;
  storageLocation: '冷藏' | '冷凍' | '常溫';
  expirationDate: string;
  note: string;
}

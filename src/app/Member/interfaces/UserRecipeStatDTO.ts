import { UserRecipeDTO } from './UserRecipeDTO';

export interface UserRecipeStatDTO {
  recipes: UserRecipeDTO[];
  totalViews: number;
}

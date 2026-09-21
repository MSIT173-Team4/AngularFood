import { BaseUserProfileDTO } from './BaseUserProfileDTO';
export interface PublicUserProfileDTO extends BaseUserProfileDTO {
  userId: number;
}

import { BaseUserProfileDTO } from './BaseUserProfileDTO';
export interface UserProfileDTO extends BaseUserProfileDTO {
  lastname: string;
  firstname: string;
  email: string;
  phone: string;
  address: string;
}

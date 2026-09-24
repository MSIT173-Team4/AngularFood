import { BaseUserProfileDTO } from './BaseUserProfileDTO';
export interface UserProfileDTO extends BaseUserProfileDTO {
  email: string;
  phone: string;
  address: string;
  idNum: string;
  lastLogin: string;
}

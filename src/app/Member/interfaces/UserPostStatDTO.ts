import { UserPostDTO } from './UserPostDTO';
export interface UserPostStatDTO {
  posts: UserPostDTO[];
  totalLikes: number;
  totalViews: number;
}

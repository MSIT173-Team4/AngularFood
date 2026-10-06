import { UserRecipeStatDTO } from './../../interfaces/UserRecipeStatDTO';
import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { UserProfileDTO } from '../../interfaces/UserProfileDTO';
import { PublicUserProfileDTO } from '../../interfaces/PublicUserProfileDTO';
import { BaseUserProfileDTO } from '../../interfaces/BaseUserProfileDTO';
import { DialogModule } from 'primeng/dialog';
import { EditProfile } from './editprofile/editprofile';
import { Apply } from './apply/apply';
import { AuthService } from '../../services/auth-services';
import { UserPostDTO } from '../../interfaces/UserPostDTO';
import { UserRecipeDTO } from '../../interfaces/UserRecipeDTO';
import { UserPostStatDTO } from '../../interfaces/UserPostStatDTO';
import { ChatService } from '../../services/chat-services';
import { CommonModule } from '@angular/common';
// PrimeNG
import { AvatarModule } from 'primeng/avatar';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    AvatarModule,
    TabsModule,
    CardModule,
    ButtonModule,
    DialogModule,
    EditProfile,
    Apply,
    CommonModule,
    RouterLink,
  ],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main implements OnInit {
  baseURL: string = environment.apiUrl;
  isOwnProfile = true;
  readonly chatService = inject(ChatService);
  private authService = inject(AuthService);
  publicProfileId: number | null = null;
  isSeller = false;
  profile: BaseUserProfileDTO | null = null;
  userInfo: UserProfileDTO | null = null;
  editProfileVisible = false;
  sellerApplyVisible = false;

  posts: UserPostDTO[] = [];

  postTotalLikes = 0;
  postTotalViews = 0;

  recipes: UserRecipeDTO[] = [];
  recipeTotalLikes = 0;
  recipeTotalViews = 0;
  dashboard: any[] = ['0'];
  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    const requestedProfileId = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(requestedProfileId) && requestedProfileId > 0) {
      const signedInUserId = this.authService.currentUser()?.userId;
      if (signedInUserId) {
        this.loadRequestedProfile(requestedProfileId, signedInUserId);
        return;
      }

      this.authService.getCurrentUser().subscribe({
        next: (currentUser) => this.loadRequestedProfile(requestedProfileId, currentUser.userId),
        error: () => this.loadRequestedProfile(requestedProfileId, null),
      });
      return;
    }

    this.loadOwnProfile();
  }

  private loadRequestedProfile(requestedProfileId: number, signedInUserId: number | null): void {
    if (requestedProfileId === signedInUserId) {
      this.loadOwnProfile();
      return;
    }

    this.isOwnProfile = false;
    this.publicProfileId = requestedProfileId;
    this.getUserRecipes(requestedProfileId);
    this.getUserPosts(requestedProfileId);
    this.loadPublicProfile(requestedProfileId);
  }

  private loadOwnProfile(): void {
    this.isOwnProfile = true;
    this.publicProfileId = null;
    this.getMyRecipes();
    this.getMyPosts();
    this.loadingProfile();
    this.checkSeller();
  }
  goToSellCenter() {
    this.router.navigate(['/sellcenter'], {
      replaceUrl: true,
    });
  }
  checkSeller() {
    this.http
      .get<{ isSeller: boolean }>(`${this.baseURL}/Users/CheckSeller`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.isSeller = res.isSeller;
        },

        error: (err) => {
          console.error('取得商家狀態失敗', err);
        },
      });
  }

  loadingProfile(): void {
    this.http
      .get<UserProfileDTO>(`${this.baseURL}/Users/GetUserProfile`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.profile = res;
          this.userInfo = res;
        },
        error: (res) => {
          console.log(res);
        },
      });
  }
  // Keep content-card navigation declarative through RouterLink.

  getMyPosts() {
    this.http
      .get<UserPostStatDTO>(`${environment.apiUrl}/Users/GetPost`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          ((this.posts = res.posts), (this.postTotalViews = res.totalViews),(this.postTotalLikes=res.totalLikes));
        },
        error: (err) => {
          console.log('取得貼文失敗', err);
        },
      });
  }
  getUserPosts(userId: number) {
    this.http
      .get<UserPostStatDTO>(`${environment.apiUrl}/Users/GetUserPost/${userId}`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          ((this.posts = res.posts), (this.postTotalViews = res.totalViews));
        },
        error: (err) => {
          console.log('取得貼文失敗', err);
        },
      });
  }
  getMyRecipes() {
    this.http
      .get<UserRecipeStatDTO>(`${environment.apiUrl}/Users/GetRecipe`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.recipes = res.recipes;
          this.recipeTotalViews = res.totalViews;
          this.recipeTotalLikes = res.totalLike;
        },
        error: (err) => {
          console.error('取得食譜失敗', err);
        },
      });
  }
  getUserRecipes(userId: number) {
    this.http
      .get<UserRecipeStatDTO>(`${environment.apiUrl}/Users/GetUserRecipes/${userId}`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.recipes = res.recipes;
          this.recipeTotalViews = res.totalViews;
        },
        error: (err) => {
          console.error('取得食譜失敗', err);
        },
      });
  }
  loadPublicProfile(id: number): void {
    this.http
      .get<PublicUserProfileDTO>(`${this.baseURL}/Users/GetUserProfile/${id}`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.profile = res;
        },
      });
  }
  startChat() {
    if (!this.publicProfileId) {
      return;
    }
    this.http
      .post<any>(
        `${this.baseURL}/Chat/GetOrCreateRoom/${this.publicProfileId}`,
        {},
        {
          withCredentials: true,
        },
      )
      .subscribe({
        next: (res) => {
          console.log('聊天室建立/取得成功', res);

          this.chatService.openChatList();
        },
        error: (err) => {
          console.error('建立聊天室失敗', err);
        },
      });
  }
  logout(): void {
    this.http
      .post(
        `${this.baseURL}/Users/Logout`,
        {},
        {
          withCredentials: true,
        },
      )
      .subscribe({
        next: (res) => {
          console.log(res);

          this.router.navigate(['/login'], {
            replaceUrl: true,
          });
        },
        error: (err) => {
          console.log(err);
        },
      });
  }
  getImageUrl(image?: string): string {
    if (!image) {
      return '/images/default-avatar.png';
    }

    if (/^https?:\/\//i.test(image)) {
      return image; // 已經是完整網址（Cloudinary、Google 頭像）
    }
    // 本機開發接上 https://localhost:7164；正式環境 apiUrl 是 /api，前綴為空，交給 nginx 轉發
    const backendOrigin = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${backendOrigin}${image.startsWith('/') ? '' : '/'}${image}`;
  }

  viewRecipe(recipeId: number): void {
    void this.router.navigate(['/recipes', recipeId]);
  }

  editRecipe(recipeId: number): void {
    if (!this.isOwnProfile) {
      return;
    }

    void this.router.navigate(['/recipes', recipeId, 'edit']);
  }
  onApplySuccess() {
    this.sellerApplyVisible = false;
    this.isSeller = true;
  }
  onProfileUpdated() {
    this.editProfileVisible = false;
    this.loadingProfile();
    this.authService.getCurrentUser().subscribe();
  }
  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    const fallback = '/images/default-avatar.png';
    if (!img.src.endsWith(fallback)) {
      img.src = fallback;
    }
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment.development';
import { UserProfileDTO } from '../../interfaces/UserProfileDTO';
import { PublicUserProfileDTO } from '../../interfaces/PublicUserProfileDTO';
import { BaseUserProfileDTO } from '../../interfaces/BaseUserProfileDTO';
import { DialogModule } from 'primeng/dialog';
import { EditProfile } from './editprofile/editprofile';
import { Apply } from './apply/apply';
import { AuthService } from '../../services/auth-services';
// PrimeNG
import { AvatarModule } from 'primeng/avatar';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [AvatarModule, TabsModule, CardModule, ButtonModule, DialogModule, EditProfile, Apply],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main implements OnInit {
  baseURL: string = environment.apiUrl;
  isOwnProfile = true;
  private authService = inject(AuthService);
  /*userInfo: UserProfileDTO = {
    username: '',
    email: '',
    phone: '',
    image: '',
    address: '',
    createTime: '',
    idNum: '',
    lastLogin: '',
  };
  publicUserInfo: PublicUserProfileDTO | null = null;
*/
  isSeller = false;
  profile: BaseUserProfileDTO | null = null;
  userInfo: UserProfileDTO | null = null;
  editProfileVisible = false;
  sellerApplyVisible = false;

  posts: any[] = [];

  recipes: any[] = [];
  dashboard: any[] = ['0'];
  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('public profile id:', id);
    if (id) {
      this.isOwnProfile = false;
      this.loadPublicProfile(Number(id));
    } else {
      this.isOwnProfile = true;
      this.loadingProfile();
      this.checkSeller();
    }
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
  //讀取貼文,食譜
  loadPost(id: number) {}
  loadRecipe(id: number) {}
  loadPublicProfile(id: number): void {
    this.http
      .get<PublicUserProfileDTO>(`${this.baseURL}/Users/GetPublicUserProfile/${id}`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.profile = res;
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
      return '/images/default.jpg';
    }

    return `https://localhost:7164${image}`;
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
}

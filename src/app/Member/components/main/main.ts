import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment.development';
import { UserProfileDTO } from '../../interfaces/UserProfileDTO';
import { PublicUserProfileDTO } from '../../interfaces/PublicUserProfileDTO';
import { BaseUserProfileDTO } from '../../interfaces/BaseUserProfileDTO';
// PrimeNG
import { AvatarModule } from 'primeng/avatar';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [AvatarModule, TabsModule, CardModule, ButtonModule],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main implements OnInit {
  baseURL: string = environment.apiUrl;
  isOwnProfile = true;
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

  profile: BaseUserProfileDTO | null = null;
  userInfo: UserProfileDTO | null = null;

  // 之後從 API 取得
  posts: any[] = [];

  // 之後從 API 取得
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
    }
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
}

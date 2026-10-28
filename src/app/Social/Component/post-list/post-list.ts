//Angular元件、表單、路由、TimeAgoPipe、environment、HttpClient、SocialService & User相關
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SocialService, PostList } from '../../service';
import { UserProfileDTO } from '../../../Member/interfaces/UserProfileDTO';
import { BaseUserProfileDTO } from '../../../Member/interfaces/BaseUserProfileDTO';
import { TimeAgoPipe } from '../../Pipes/time-ago-pipe';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [AvatarModule, CommonModule, FormsModule, TimeAgoPipe],
  templateUrl: './post-list.html',
  styleUrls: ['./post-list.css']
})
export class PostListComponent implements OnInit {

  //使用者資料
  profile: BaseUserProfileDTO | null = null;
  userInfo: UserProfileDTO | null = null;

  //個人檔案
  userProfiles: { [userId: number]: UserProfileDTO } = {};

  //API
  baseURL: string = environment.apiUrl;

  //貼文列表
  posts: PostList[] = [];

  //當前頁籤與關鍵字
  activeTab: string = 'latest';
  keyword: string = '';

  //分頁
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  pagesArray: number[] = [];

  //目前登入者
  currentUserId: number = 0;

  constructor(
    private socialService: SocialService,
    private router: Router,
    private http: HttpClient
  ) { }

  //載入貼文
  ngOnInit(): void {
    this.loadPosts();
  }

  //載入貼文: 排序、關鍵字及頁碼
  loadPosts(): void {
    this.socialService
      .getPosts(
        this.activeTab,
        this.keyword,
        this.currentPage,
        this.pageSize
      )
      .subscribe({
        next: (res) => {
          //更新列表，(當前i, i) => i + 1
          this.posts = res.items;
          this.totalPages = res.totalPages;
          this.pagesArray = Array.from(
            { length: this.totalPages },
            (_, i) => i + 1
          );

          //各貼文作者的個人檔案
          this.posts.forEach(post => {
            this.loadingProfile(post.userId);
          });
        },
        error: (err) => console.error('載入失敗', err)
      });
  }

  //切換頁籤，回第一頁
  switchTab(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadPosts();
  }

  //關鍵字搜尋
  onSearch(): void {
    this.currentPage = 1;
    this.loadPosts();
  }

  //貼文發佈
  goToCreate(): void {
    this.router.navigate(['/social/create']);
  }

  //查看貼文
  viewPost(postId: number): void {
    this.router.navigate(['/social/post', postId]);
  }

  //取得貼文作者個人檔案
  loadingProfile(userId: number): void {
    //已載入過的
    if (this.userProfiles[userId]) {
      return;
    }

    this.http
      .get<UserProfileDTO>(
        `${this.baseURL}/Users/GetUserProfile/${userId}`,
        {
          withCredentials: true,
        }
      )
      .subscribe({
        next: (res) => {
          this.userProfiles[userId] = res;
        },
        error: (err) => {
          console.log(`取得 User ${userId} 資料失敗`, err);
        },
      });
  }

  //頭像
  getImageUrl(image?: string): string {
    //預設圖片
    if (!image) {
      return '/images/default-avatar.png';
    }

    //完整網址
    if (/^https?:\/\//i.test(image)) {
      return image;
    }

    const backendOrigin = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${backendOrigin}${image.startsWith('/') ? '' : '/'}${image}`;
  }

  //頭像載入失敗
  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    const fallback = '/images/default-avatar.png';
    if (!img.src.endsWith(fallback)) {
      img.src = fallback;
    }
  }

  //作者資訊頁面
  navigateToUser(userId: number): void {
    this.router.navigate(['/main', userId]);
  }

  //貼文收藏
  toggleBookmark(event: Event, post: PostList): void {
    event.stopPropagation();
    this.socialService.toggleBookmark(post.postId).subscribe({
      next: () => {
        post.isBookmarkedByCurrentUser = !post.isBookmarkedByCurrentUser;
      },
      error: (err) => console.error('操作失敗', err)
    });
  }

  //貼文按讚
  toggleLike(event: Event, post: PostList): void {
    event.stopPropagation();
    this.socialService.togglePostLike(post.postId).subscribe({
      next: () => {
        post.isLikedByCurrentUser = !post.isLikedByCurrentUser;
        post.likes += post.isLikedByCurrentUser ? 1 : -1;
      },
      error: (err) => console.error('操作失敗', err)
    });
  }

  //切換頁碼
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadPosts();
  }
}
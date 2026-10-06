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
import { AuthService } from '../../../Member/services/auth-services';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [AvatarModule, CommonModule, FormsModule, TimeAgoPipe],
  templateUrl: './post-list.html',
  styleUrls: ['./post-list.css']
})
export class PostListComponent implements OnInit {
  profile: BaseUserProfileDTO | null = null;
  userInfo: UserProfileDTO | null = null;
  baseURL: string = environment.apiUrl;
  posts: PostList[] = [];
  activeTab: string = 'latest';
  keyword: string = '';

  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  pagesArray: number[] = [];

  currentUserId: number = 0;

  constructor(
    private socialService: SocialService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.socialService.getPosts(this.activeTab, this.keyword, this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.posts = res.items;
        this.totalPages = res.totalPages;
        this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
      },
      error: (err) => console.error('載入失敗', err)
    });
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadPosts();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadPosts();
  }

  goToCreate(): void {
    this.router.navigate(['/social/create']);
  }

  viewPost(postId: number): void {
    this.router.navigate(['/social/post', postId]);
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

  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    const fallback = '/images/default-avatar.png';
    if (!img.src.endsWith(fallback)) {
      img.src = fallback;
    }
  }

  navigateToUser(userId: number): void {
    this.router.navigate(['/main', userId]);
  }


  toggleBookmark(event: Event, post: PostList): void {
    event.stopPropagation();
    this.socialService.toggleBookmark(post.postId).subscribe({
      next: (res) => {
        post.isBookmarkedByCurrentUser = res.isBookmarked;
      },
      error: (err) => console.error('操作失敗', err)
    });
  }

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

  onEditPost(postId: number): void {
    this.router.navigate(['/social/edit-post', postId]);
  }

  onDeletePost(postId: number): void {
    if (confirm('確定要刪除這篇貼文嗎？')) {
      this.socialService.deletePost(postId).subscribe({
        next: () => {
          this.posts = this.posts.filter(p => p.postId !== postId);
        },
        error: (err) => {
          console.error('刪除失敗', err);
          alert('刪除失敗，請稍後再試。');
        }
      });
    }
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadPosts();
  }
}

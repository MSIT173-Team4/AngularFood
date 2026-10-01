import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialService, PostList } from '../../service';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './post-list.html',
  styleUrls: ['./post-list.css']
})
export class PostListComponent implements OnInit {
  activeTab: 'latest' | 'popular' | 'my' | 'bookmark' = 'latest';
  keyword: string = '';
  posts: PostList[] = [];
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  pagesArray: number[] = [];
  isLoading: boolean = false;

  constructor(
    private socialService: SocialService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.isLoading = true;
    this.socialService.getPosts(this.activeTab, this.keyword, this.currentPage, this.pageSize)
      .subscribe({
        next: (res) => {
          this.posts = res.items;
          this.totalPages = res.totalPages;
          this.updatePagesArray();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('載入失敗', err);
          this.isLoading = false;
        }
      });
  }

  switchTab(tab: 'latest' | 'popular' | 'my' | 'bookmark'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.currentPage = 1;
      this.loadPosts();
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadPosts();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadPosts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  updatePagesArray(): void {
    this.pagesArray = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pagesArray.push(i);
    }
  }

  toggleLike(event: Event, post: PostList): void {
    event.stopPropagation();
    
    this.socialService.togglePostLike(post.postId).subscribe({
      next: (res) => {
        post.isLikedByCurrentUser = res.isLiked;
        
        if (res.isLiked) {
          post.likes++;
        } else {
          post.likes = Math.max(0, post.likes - 1);
        }
      },
      error: (err) => {
        console.error('發生錯誤', err);
      }
    });
  }

  toggleBookmark(event: Event, post: PostList): void {
    event.stopPropagation();
    this.socialService.toggleBookmark(post.postId).subscribe({
      next: (res) => {
        post.isBookmarkedByCurrentUser = res.isBookmarked;
        if (this.activeTab === 'bookmark' && !res.isBookmarked) {
          this.loadPosts();
        }
      },
      error: (err) => {
        console.error('發生錯誤', err);
      }
    });
  }
  viewPost(postId: number): void {
    this.router.navigate(['/social/post', postId]);
  }
  goToCreate(): void {
    this.router.navigate(['/social/create']);
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialService, PostDetail, Comment } from '../../service'; // 請確認相對路徑
import { AuthService } from '../../../Member/services/auth-services'; // 💡 注入你的 AuthService
import { TimeAgoPipe } from '../../Pipes/time-ago-pipe'; // 請確認 TimeAgoPipe 路徑

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe],
  templateUrl: './post-detail.html',
  styleUrls: ['./post-detail.css']
})
export class PostDetailComponent implements OnInit {
  postId!: number;
  post: PostDetail | null = null;
  comments: Comment[] = [];
  newCommentContent: string = '';
  replyToComment: Comment | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socialService: SocialService,
    public authService: AuthService // 💡 注入 AuthService
  ) {}

  ngOnInit(): void {
    // 💡 1. 確保載入當前登入者資料 (如果全域尚未初始化)
    if (!this.authService.currentUser()) {
      this.authService.getCurrentUser().subscribe({
        error: (err) => console.log('未登入或取得使用者失敗', err)
      });
    }

    // 2. 取得網址 postID 並載入貼文與留言
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.postId = Number(id);
        this.loadPostDetail();
        this.loadComments();
      }
    });
  }

// 💡 取得當前登入者的 userName
get currentUserName(): string | null {
  const user = this.authService.currentUser();
  return user ? user.userName : null;
}

// 💡 透過 userName 判斷貼文是否由當前使用者所發佈
get isPostOwner(): boolean {
  return !!(
    this.post && 
    this.currentUserName && 
    this.post.userName === this.currentUserName
  );
}

  // 載入貼文詳細內容
  loadPostDetail(): void {
    this.socialService.getPost(this.postId).subscribe({
      next: (res) => {
        this.post = res;
      },
      error: (err) => console.error('載入貼文失敗:', err)
    });
  }

  // 載入留言列表
  loadComments(): void {
    this.socialService.getComments(this.postId).subscribe({
      next: (res) => {
        this.comments = res;
      },
      error: (err) => console.error('載入留言失敗:', err)
    });
  }

  // 貼文按讚/取消讚
  togglePostLike(): void {
    if (!this.post) return;
    
    const previousState = this.post.isLikedByCurrentUser;
    this.post.isLikedByCurrentUser = !previousState;
    this.post.likes += this.post.isLikedByCurrentUser ? 1 : -1;

    this.socialService.togglePostLike(this.postId).subscribe({
      next: (res) => {
        if (res && typeof res.isLikedByCurrentUser === 'boolean') {
          this.post!.isLikedByCurrentUser = res.isLikedByCurrentUser;
          this.post!.likes = res.likes;
        }
      },
      error: (err) => {
        console.error('按讚失敗:', err);
        this.post!.isLikedByCurrentUser = previousState;
        this.post!.likes += previousState ? 1 : -1;
      }
    });
  }

  // 貼文收藏/取消收藏
  toggleBookmark(event: Event, post: PostDetail): void {
    event.stopPropagation();
    this.socialService.toggleBookmark(post.postId).subscribe({
      next: (res) => {
        post.isBookmarkedByCurrentUser = res.isBookmarked;
      },
      error: (err) => console.error('操作失敗', err)
    });
  }

  // 編輯貼文
  onEditPost(): void {
    if (this.postId) {
      this.router.navigate(['social/edit-post', this.postId]);
    }
  }

  // 刪除貼文
  onDeletePost(): void {
    if (confirm('確定要刪除這篇貼文嗎？刪除後無法復原。')) {
      this.socialService.deletePost(this.postId).subscribe({
        next: () => {
          alert('貼文已成功刪除');
          this.router.navigate(['/posts']);
        },
        error: (err) => {
          console.error('刪除貼文失敗:', err);
          alert('刪除失敗，請稍後再試');
        }
      });
    }
  }

  // 發送留言
  sendComment(): void {
    if (!this.newCommentContent.trim()) return;

    const payload = {
      postId: this.postId,
      replyMessageId: this.replyToComment ? this.replyToComment.messageId : undefined,
      messageContent: this.newCommentContent.trim()
    };

    this.socialService.createComment(payload).subscribe({
      next: () => {
        this.newCommentContent = '';
        this.replyToComment = null;
        this.loadComments();
        if (this.post) this.post.commentCount++;
      },
      error: (err) => console.error('新增留言失敗:', err)
    });
  }

  setReplyTarget(comment: Comment): void {
    this.replyToComment = comment;
  }

  cancelReply(): void {
    this.replyToComment = null;
  }

  // 留言按讚
  toggleCommentLike(comment: Comment): void {
    const previousLiked = comment.isLikedByCurrentUser;
    comment.isLikedByCurrentUser = !previousLiked;
    comment.likes += comment.isLikedByCurrentUser ? 1 : -1;

    this.socialService.toggleCommentLike(comment.messageId).subscribe({
      error: (err) => {
        console.error('留言按讚失敗:', err);
        comment.isLikedByCurrentUser = previousLiked;
        comment.likes += previousLiked ? 1 : -1;
      }
    });
  }

  // 刪除留言
  onDeleteComment(commentId: number): void {
    if (confirm('確定要刪除這條留言嗎？')) {
      this.socialService.deleteComment(commentId).subscribe({
        next: () => {
          this.comments = this.comments.filter(c => c.messageId !== commentId);
          if (this.post && this.post.commentCount > 0) {
            this.post.commentCount--;
          }
        },
        error: (err) => console.error('刪除留言失敗:', err)
      });
    }
  }

  // 跳轉至個人資訊頁面
  navigateToUser(userId: number): void {
    if (userId) {
      this.router.navigate(['/profile', userId]);
    }
  }

  goBack(): void {
    window.history.back();
  }
}
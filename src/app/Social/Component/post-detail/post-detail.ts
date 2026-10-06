import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialService, PostDetail, Comment } from '../../service';
import { AuthService } from '../../../Member/services/auth-services';
import { TimeAgoPipe } from '../../Pipes/time-ago-pipe';
import { HttpClient } from '@angular/common/http';
import { AvatarModule } from 'primeng/avatar';
import { UserProfileDTO } from '../../../Member/interfaces/UserProfileDTO';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe, AvatarModule],
  templateUrl: './post-detail.html',
  styleUrls: ['./post-detail.css']
})
export class PostDetailComponent implements OnInit {
  postId!: number;
  post: PostDetail | null = null;
  comments: Comment[] = [];
  newCommentContent: string = '';
  replyToComment: Comment | null = null;
  editingComment: Comment | null = null;
  userProfiles: { [userId: number]: UserProfileDTO } = {};
  baseURL: string = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socialService: SocialService,
    public authService: AuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      this.authService.getCurrentUser().subscribe({
        error: (err) => console.log('尚未登入', err)
      });
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.postId = Number(id);
        this.loadPostDetail();
        this.loadComments();
      }
    });
  }

  get currentUserName(): string | null {
    const user = this.authService.currentUser();
    return user ? user.userName : null;
  }

  get isPostOwner(): boolean {
    return !!(
      this.post &&
      this.currentUserName &&
      this.post.userName === this.currentUserName
    );
  }
  loadingProfile(userId: number): void {
    // 已經取得過這個使用者的資料，就不要重複呼叫 API
    if (this.userProfiles[userId]) {
      return;
    }

    this.http
      .get<UserProfileDTO>(
        `${this.baseURL}/Users/GetUserProfile/${userId}`,
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (res) => {
          this.userProfiles[userId] = res;
        },
        error: (err) => {
          console.error(`取得 User ${userId} 資料失敗`, err);
        }
      });
  }

  //貼文內容
  loadPostDetail(): void {
    this.socialService.getPost(this.postId).subscribe({
      next: (res) => {
        this.post = res;
        this.loadingProfile(res.userId);
      },
      error: (err) => console.error('載入失敗:', err)
    });
  }

  //留言列表
  loadComments(): void {
    this.socialService.getComments(this.postId).subscribe({
      next: (res) => {
        this.comments = res;
        //載入留言作者Profile
        this.comments.forEach(comment => {
          this.loadingProfile(comment.userId);
        });
      },
      error: (err) => console.error('載入失敗:', err)
    });
  }

  //貼文按讚
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
        console.error('操作失敗', err);
        this.post!.isLikedByCurrentUser = previousState;
        this.post!.likes += previousState ? 1 : -1;
      }
    });
  }

  //貼文收藏
  toggleBookmark(): void {
    if (!this.post) return;

    this.socialService.toggleBookmark(this.postId).subscribe({
      next: (res) => {
        if (this.post) {
          this.post.isBookmarkedByCurrentUser = res.isBookmarked;
        }
      },
      error: (err) => console.error('操作失敗:', err)
    });
  }

  //編輯貼文
  onEditPost(): void {
    if (this.postId) {
      this.router.navigate(['/social/edit-post', this.postId]);
    }
  }

  //刪除貼文
  onDeletePost(): void {
    if (confirm('確定要刪除貼文嗎？')) {
      this.socialService.deletePost(this.postId).subscribe({
        next: () => {
          this.router.navigate(['/social']);
        },
        error: (err) => {
          console.error('刪除失敗:', err);
          alert('刪除失敗，請稍後再試');
        }
      });
    }
  }

  sendComment(): void {
    if (!this.newCommentContent.trim()) return;

    // 編輯留言
    if (this.editingComment) {
      const payload = {
        postId: this.postId,
        replyMessageId: this.editingComment.replyMessageId,
        messageContent: this.newCommentContent.trim()
      };

      const editingCommentId = this.editingComment.messageId;

      this.socialService.updateComment(editingCommentId, payload).subscribe({
        next: () => {
          this.newCommentContent = '';
          this.editingComment = null;
          this.replyToComment = null;
          this.loadComments();
        },
        error: (err) => {
          console.error('編輯留言失敗', err);
        }
      });

      return;
    }

    // 新增 / 回覆留言
    const payload = {
      postId: this.postId,
      replyMessageId: this.replyToComment
        ? this.replyToComment.messageId
        : undefined,
      messageContent: this.newCommentContent.trim()
    };

    this.socialService.createComment(payload).subscribe({
      next: () => {
        this.newCommentContent = '';
        this.replyToComment = null;
        this.loadComments();

        if (this.post) this.post.commentCount++;
      },
      error: (err) => console.error('操作失敗', err)
    });
  }

  setReplyTarget(comment: Comment): void {
    // 回覆留言時取消編輯狀態
    this.editingComment = null;
    this.newCommentContent = '';

    this.replyToComment = comment;
  }
  setEditTarget(comment: Comment): void {
    // 開始編輯時取消回覆狀態
    this.replyToComment = null;

    this.editingComment = comment;
    this.newCommentContent = comment.messageContent;
  }
  cancelReply(): void {
    this.replyToComment = null;
  }
  cancelEdit(): void {
    this.editingComment = null;
    this.newCommentContent = '';
  }

  //留言按讚
  toggleCommentLike(comment: Comment): void {
    const previousLiked = comment.isLikedByCurrentUser;
    comment.isLikedByCurrentUser = !previousLiked;
    comment.likes += comment.isLikedByCurrentUser ? 1 : -1;

    this.socialService.toggleCommentLike(comment.messageId).subscribe({
      error: (err) => {
        console.error('操作失敗', err);
        comment.isLikedByCurrentUser = previousLiked;
        comment.likes += previousLiked ? 1 : -1;
      }
    });
  }

  //刪除留言
  onDeleteComment(commentId: number): void {
    if (confirm('確定要刪除留言嗎？')) {
      this.socialService.deleteComment(commentId).subscribe({
        next: () => {
          this.comments = this.comments.filter(c => c.messageId !== commentId);

          // 如果刪除的正好是正在編輯的留言
          if (this.editingComment?.messageId === commentId) {
            this.editingComment = null;
            this.newCommentContent = '';
          }

          // 如果刪除的是正在回覆的留言
          if (this.replyToComment?.messageId === commentId) {
            this.replyToComment = null;
            this.newCommentContent = '';
          }

          if (this.post && this.post.commentCount > 0) {
            this.post.commentCount--;
          }
        },
        error: (err) => console.error('刪除失敗:', err)
      });
    }
  }

  //資訊頁面及用戶頭像
  navigateToUser(userId: number): void {
    if (userId) {
      this.router.navigate(['/main', userId]);
    }
  }
  getImageUrl(image?: string): string {
    if (!image) {
      return '/images/default-avatar.png';
    }

    if (/^https?:\/\//i.test(image)) {
      return image;
    }

    const backendOrigin = environment.apiUrl.replace(/\/api\/?$/, '');

    return `${backendOrigin}${image.startsWith('/') ? '' : '/'}${image}`;
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const fallback = '/images/default-avatar.png';

    if (!img.src.endsWith(fallback)) {
      img.src = fallback;
    }
  }

  goBack(): void {
    this.router.navigate(['/social']);
  }
}

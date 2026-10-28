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

  //貼文ID、貼文資料、留言列表
  //貼文ID尚未初始化，但使用前會被賦值，加"!"
  postId!: number;
  post: PostDetail | null = null;
  comments: Comment[] = [];

  //留言內容、回覆/編輯目標
  newCommentContent: string = '';
  replyToComment: Comment | null = null;
  editingComment: Comment | null = null;

  //個人檔案、API
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
    //以ID取得貼文內容
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.postId = Number(id);
        this.loadPostDetail();
        this.loadComments();
      }
    });
  }

  //目前登入者
  get currentUserName(): string | null {
    const user = this.authService.currentUser();
    return user ? user.userName : null;
  }

  //目前登入者是否為貼文作者
  get isPostOwner(): boolean {
    return !!(
      this.post &&
      this.currentUserName &&
      this.post.userName === this.currentUserName
    );
  }
  //取得各用戶的個人檔案
  loadingProfile(userId: number): void {
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

  //貼文詳細內容
  loadPostDetail(): void {
    this.socialService.getPost(this.postId).subscribe({
      next: (res) => {
        this.post = res;
        this.loadingProfile(res.userId);
      },
      error: (err) => console.error('載入失敗:', err)
    });
  }

  //留言區
  loadComments(): void {
    this.socialService.getComments(this.postId).subscribe({
      next: (res) => {
        this.comments = res;
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
    //臨時想到的改良:錯誤時回復原本狀態
    const previousState = this.post.isLikedByCurrentUser;
    this.post.isLikedByCurrentUser = !previousState;
    this.post.likes += this.post.isLikedByCurrentUser ? 1 : -1;

    this.socialService.togglePostLike(this.postId).subscribe({
      next: (res) => {
        this.post!.isLikedByCurrentUser = res.isLikedByCurrentUser;
        this.post!.likes = res.likes;
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

  //貼文編輯頁面
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

  //新增/回覆/編輯留言
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
          //清除編輯狀態
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

    //新增&回覆
    const payload = {
      postId: this.postId,
      replyMessageId: this.replyToComment
        ? this.replyToComment.messageId
        : undefined,
      messageContent: this.newCommentContent.trim()
    };

    this.socialService.createComment(payload).subscribe({
      next: () => {
        //取消回覆狀態
        this.newCommentContent = '';
        this.replyToComment = null;
        this.loadComments();

        if (this.post) this.post.commentCount++;
      },
      error: (err) => console.error('操作失敗', err)
    });
  }

  //要回覆的留言
  setReplyTarget(comment: Comment): void {
    //取消編輯狀態
    this.editingComment = null;
    this.newCommentContent = '';

    this.replyToComment = comment;
  }

  //要編輯的留言
  setEditTarget(comment: Comment): void {
    //取消回覆狀態
    this.replyToComment = null;

    this.editingComment = comment;
    this.newCommentContent = comment.messageContent;
  }

  //取消回覆
  cancelReply(): void {
    this.replyToComment = null;
  }

  //取消編輯
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
          //從留言列表移除
          this.comments = this.comments.filter(c => c.messageId !== commentId);

          //清除編輯狀態
          if (this.editingComment?.messageId === commentId) {
            this.editingComment = null;
            this.newCommentContent = '';
          }

          //清除回覆狀態
          if (this.replyToComment?.messageId === commentId) {
            this.replyToComment = null;
            this.newCommentContent = '';
          }

          //更新留言數量
          if (this.post && this.post.commentCount > 0) {
            this.post.commentCount--;
          }
        },
        error: (err) => console.error('刪除失敗:', err)
      });
    }
  }

  //點頭像看資訊
  navigateToUser(userId: number): void {
    if (userId) {
      this.router.navigate(['/main', userId]);
    }
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

  //頭像載入失敗時
  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const fallback = '/images/default-avatar.png';

    if (!img.src.endsWith(fallback)) {
      img.src = fallback;
    }
  }

  //返回
  goBack(): void {
    this.router.navigate(['/social']);
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocialService, PostDetail, Comment } from '../../service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-post-detail',
  templateUrl: './post-detail.html',
  styleUrls: ['./post-detail.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe]
})
export class PostDetailComponent implements OnInit {
  post!: PostDetail;
  comments: Comment[] = [];
  newCommentText: string = '';
  replyingTo: Comment | null = null;
  currentUserId = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socialService: SocialService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPost(id);
    this.loadComments(id);
  }

  loadPost(id: number): void {
    this.socialService.getPost(id).subscribe(data => this.post = data);
  }

  loadComments(id: number): void {
    this.socialService.getComments(id).subscribe(data => this.comments = data);
  }

  togglePostLike(): void {
    this.socialService.togglePostLike(this.post.postId).subscribe(() => {
      this.post.isLikedByCurrentUser = !this.post.isLikedByCurrentUser;
      this.post.likes += this.post.isLikedByCurrentUser ? 1 : -1;
    });
  }

  toggleCommentLike(comment: Comment): void {
    this.socialService.toggleCommentLike(comment.messageId).subscribe(() => {
      comment.isLikedByCurrentUser = !comment.isLikedByCurrentUser;
      comment.likes += comment.isLikedByCurrentUser ? 1 : -1;
    });
  }

  setReply(comment: Comment): void {
    this.replyingTo = comment;
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  submitComment(): void {
    if (!this.newCommentText.trim()) return;

    this.socialService.createComment({
      postId: this.post.postId,
      replyMessageId: this.replyingTo?.messageId,
      messageContent: this.newCommentText
    }).subscribe(() => {
      this.newCommentText = '';
      this.replyingTo = null;
      this.loadComments(this.post.postId);
    });
  }

  deletePost(): void {
    if (confirm('確定要刪除貼文嗎？')) {
      this.socialService.deletePost(this.post.postId).subscribe(() => {
        this.router.navigate(['/posts']);
      });
    }
  }

  deleteComment(commentId: number): void {
    if (confirm('確定要刪除留言嗎？')) {
      this.socialService.deleteComment(commentId).subscribe(() => {
        this.loadComments(this.post.postId);
      });
    }
  }
}
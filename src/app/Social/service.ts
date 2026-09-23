import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PostBlock {
  postBlockId?: number;
  blockType: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  sortOrder?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface PostList {
  postId: number;
  title: string;
  summaryText: string;
  userId: number;
  userName: string;
  userImage?: string;
  likes: number;
  views: number;
  commentCount: number;
  postDate: string;
  isLikedByCurrentUser: boolean;
  isBookmarkedByCurrentUser: boolean;
}

export interface PostDetail extends PostList {
  sortId: number;
  blocks: PostBlock[];
}

export interface Comment {
  messageId: number;
  postId: number;
  userId: number;
  userName: string;
  userImage?: string;
  replyMessageId?: number;
  replyToUserName?: string;
  messageContent: string;
  likes: number;
  messageDate: string;
  isLikedByCurrentUser: boolean;
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  private baseUrl = 'http://localhost:4200/api';

  constructor(private http: HttpClient) {}

  getPosts(
    tab: string = 'latest',
    keyword: string = '',
    page: number = 1,
    pageSize: number = 5
  ): Observable<PagedResult<PostList>> {
    let params = new HttpParams()
      .set('tab', tab)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (keyword && keyword.trim() !== '') {
      params = params.set('keyword', keyword.trim());
    }

    return this.http.get<PagedResult<PostList>>(`${this.baseUrl}/post`, { params });
  }

  getPost(id: number): Observable<PostDetail> {
    return this.http.get<PostDetail>(`${this.baseUrl}/post/${id}`);
  }

  createPost(post: { title: string; sortId: number; blocks: PostBlock[] }): Observable<any> {
    return this.http.post(`${this.baseUrl}/post`, post);
  }

  updatePost(id: number, post: { title: string; sortId: number; blocks: PostBlock[] }): Observable<any> {
    return this.http.put(`${this.baseUrl}/post/${id}`, post);
  }

  deletePost(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/post/${id}`);
  }

  togglePostLike(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/post/${id}/like`, {});
  }

  toggleBookmark(postId: number): Observable<{ postId: number; isBookmarked: boolean }> {
    return this.http.post<{ postId: number; isBookmarked: boolean }>(
      `${this.baseUrl}/post/bookmark`,
      { postId }
    );
  }

  getComments(postId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/comments/post/${postId}`);
  }

  createComment(comment: { postId: number; replyMessageId?: number; messageContent: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/comments`, comment);
  }

  deleteComment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/comments/${id}`);
  }

  toggleCommentLike(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/comments/${id}/like`, {});
  }
}
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

export interface PostList {
  postId: number;
  userId: number;
  userName: string;
  userImage?: string;
  title: string;
  likes: number;
  views: number;
  postDate: string;
  isLikedByCurrentUser: boolean;
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

  getPosts(sortBy: string = 'latest', keyword: string = ''): Observable<PostList[]> {
    let params = new HttpParams().set('sortBy', sortBy);
    if (keyword) params = params.set('keyword', keyword);
    return this.http.get<PostList[]>(`${this.baseUrl}/posts`, { params });
  }

  getPost(id: number): Observable<PostDetail> {
    return this.http.get<PostDetail>(`${this.baseUrl}/posts/${id}`);
  }

  createPost(post: { title: string; sortId: number; blocks: PostBlock[] }): Observable<any> {
    return this.http.post(`${this.baseUrl}/posts`, post);
  }

  updatePost(id: number, post: { title: string; sortId: number; blocks: PostBlock[] }): Observable<any> {
    return this.http.put(`${this.baseUrl}/posts/${id}`, post);
  }

  deletePost(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/posts/${id}`);
  }

  togglePostLike(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/posts/${id}/like`, {});
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
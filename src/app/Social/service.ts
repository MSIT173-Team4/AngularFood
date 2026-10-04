import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  replyMessageId?: number | null;
  replyToUserName?: string | null;
  messageContent: string;
  likes: number;
  messageDate: string;
  isLikedByCurrentUser: boolean;
}

export interface CreateOrUpdateCommentPayload {
  postId: number;
  replyMessageId?: number | null;
  messageContent: string;
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {} 

//貼文列表
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

    return this.http.get<PagedResult<PostList>>(`${this.baseUrl}/post`, { 
      params,
      withCredentials: true 
    });
  }

  //貼文詳細內容
  getPost(id: number): Observable<PostDetail> {
    return this.http.get<PostDetail>(`${this.baseUrl}/post/${id}`, {
      withCredentials: true
    });
  }

  //新增貼文
  createPost(post: { title: string; sortId: number; blocks: PostBlock[] }): Observable<any> {
    return this.http.post(`${this.baseUrl}/post`, post, {
      withCredentials: true
    });
  }

  //修改貼文
  updatePost(id: number, post: { title: string; sortId: number; blocks: PostBlock[] }): Observable<any> {
    return this.http.put(`${this.baseUrl}/post/${id}`, post, {
      withCredentials: true
    });
  }

  //刪除貼文
  deletePost(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/post/${id}`, {
      withCredentials: true
    });
  }

  //貼文按讚
  togglePostLike(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/post/${id}/like`, {}, {
      withCredentials: true
    });
  }

  //貼文收藏
  toggleBookmark(postId: number): Observable<{ postId: number; isBookmarked: boolean }> {
    return this.http.post<{ postId: number; isBookmarked: boolean }>(
      `${this.baseUrl}/post/bookmark`,
      { postId },
      { withCredentials: true }
    );
  }

  //留言列表
  getComments(postId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/comments/post/${postId}`, {
      withCredentials: true
    });
  }

  //新增留言
  createComment(comment: { postId: number; replyMessageId?: number | null; messageContent: string }): Observable<any> {
  return this.http.post(`${this.baseUrl}/comments`, comment, {
    withCredentials: true
  });
}
  updateComment(commentId: number, payload: CreateOrUpdateCommentPayload): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/Comments/${commentId}`, payload, {
      withCredentials: true
    });
  }

  //刪除留言
  deleteComment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/comments/${id}`, {
      withCredentials: true
    });
  }

  //留言按讚
  toggleCommentLike(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/comments/${id}/like`, {}, {
      withCredentials: true
    });
  }
}
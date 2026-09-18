import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SocialService, PostList } from '../../service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.html',
  styleUrls: ['./post-list.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe]
})
export class PostListComponent implements OnInit {
  posts: PostList[] = [];
  sortBy: string = 'latest';
  keyword: string = '';
  currentUserId = 1;

  constructor(private socialService: SocialService, private router: Router) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.socialService.getPosts(this.sortBy, this.keyword).subscribe(data => {
      this.posts = data;
    });
  }

  onSortChange(): void {
    this.loadPosts();
  }

  onSearch(): void {
    this.loadPosts();
  }

  toggleLike(event: Event, post: PostList): void {
    event.stopPropagation();
    this.socialService.togglePostLike(post.postId).subscribe(() => {
      post.isLikedByCurrentUser = !post.isLikedByCurrentUser;
      post.likes += post.isLikedByCurrentUser ? 1 : -1;
    });
  }

  viewPost(id: number): void {
    this.router.navigate(['/post', id]);
  }

  goToCreate(): void {
    this.router.navigate(['/create-post']);
  }
}

export type { PostList };

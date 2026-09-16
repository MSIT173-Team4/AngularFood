import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SocialService, PostBlock } from '../../service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.html',
  styleUrls: ['./create-post.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CreatePostComponent {
  title: string = '';
  sortId: number = 1;
  blocks: PostBlock[] = [{ blockType: 'text', content: '' }];

  constructor(private socialService: SocialService, private router: Router) {}

  addBlock(type: 'text' | 'image' | 'video'): void {
    this.blocks.push({
      blockType: type,
      content: type === 'text' ? '' : undefined,
      mediaUrl: type !== 'text' ? '' : undefined
    });
  }

  removeBlock(index: number): void {
    if (this.blocks.length > 1) {
      this.blocks.splice(index, 1);
    }
  }

  onSubmit(): void {
    if (!this.title.trim()) {
      alert('請輸入文章標題');
      return;
    }

    this.socialService.createPost({
      title: this.title,
      sortId: this.sortId,
      blocks: this.blocks
    }).subscribe(() => {
      this.router.navigate(['/posts']);
    });
  }
}
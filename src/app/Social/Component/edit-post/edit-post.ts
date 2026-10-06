import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import { SocialService } from '../../service';

@Component({
  selector: 'app-edit-post',
  standalone: true,
  imports: [FormsModule, QuillEditorComponent],
  templateUrl: './edit-post.html',
  styleUrls: ['./edit-post.css']
})
export class EditPostComponent implements OnInit {
  postId!: number;
  title: string = '';
  htmlContent: string = '';

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image', 'video']
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private socialService: SocialService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.postId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.postId) {
      this.socialService.getPost(this.postId).subscribe({
        next: (post) => {
          this.title = post.title;
          this.htmlContent = post.blocks?.find(b => b.blockType === 'text')?.content || '';
        },
        error: (err) => {
          alert('讀取失敗');
          this.router.navigate(['/social']);
        }
      });
    }
  }

  onSubmit(): void {
    if (!this.title.trim()) {
      alert('請輸入文章標題');
      return;
    }
    if (!this.htmlContent.trim()) {
      alert('請輸入文章內容');
      return;
    }

    const payload = {
      title: this.title,
      sortId: 1,
      blocks: [
        {
          blockType: 'text' as const,
          content: this.htmlContent,
          sortOrder: 1
        }
      ]
    };

    this.socialService.updatePost(this.postId, payload).subscribe({
      next: () => {
        this.router.navigate(['/social/post', this.postId]);
      },
      error: (err) => {
        console.error('更新失敗：', err);
        alert('更新失敗，請稍後再試。');
      }
    });
  }
}
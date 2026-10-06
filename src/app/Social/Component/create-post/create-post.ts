import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import { SocialService } from '../../service';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [FormsModule, QuillEditorComponent],
  templateUrl: './create-post.html',
  styleUrls: ['./create-post.css']
})
export class CreatePostComponent {
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
    private socialService: SocialService,
    private router: Router
  ) {}

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

    this.socialService.createPost(payload).subscribe({
      next: () => {
        this.router.navigate(['/social']);
      },
      error: (err) => {
        console.error('錯誤物件：', err);
        console.error('後端回傳狀態碼：', err.status);
        console.error('後端回傳錯誤訊息：', err.error);
        alert(`發佈失敗，請稍後再試。`);
      }
    });
  }
}
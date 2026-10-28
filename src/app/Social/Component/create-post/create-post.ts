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

  //富文本編輯器
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

  fillDemoData(): void {
    this.title = '自創料理試吃：味噌蜂蜜烤雞腿';

    this.htmlContent = `
    <p>今天心血來潮亂調醬料，沒想到還挺好吃的!</p>
    <br>
    <p>醬汁是味噌＋蜂蜜＋醬油＋一點米酒，再加蒜末跟薑末。</p>
    <br>
    <p>雞腿肉醃了一個晚上，隔天直接丟進烤箱。</p>
    <br>
    <p>烤到表面微微焦焦的時候整個香到不行 🤤</p>
    <br>
    <p>味噌的鹹香搭蜂蜜的甜，烤過之後還有一點焦糖化的味道，雞皮脆脆的，裡面又很多汁。</p>
    <br>
    <p>把這個醬汁記下來了，以後拿來烤豬肉、鮭魚應該也可以。👍</p>`
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

   this.socialService.createPost(payload).subscribe({
      next: () => {
        this.router.navigate(['/social']);
      },
      error: (err) => {
        console.error('錯誤物件：', err);
        alert(`發佈失敗，請稍後再試。`);
      }
    });
  }
}
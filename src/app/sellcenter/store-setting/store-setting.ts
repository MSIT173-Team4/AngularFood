import { Component } from '@angular/core';

@Component({
  selector: 'app-store-setting',
  standalone: true,
  imports: [],
  template: `
    <div class="placeholder-page">
      <i class="pi pi-cog placeholder-icon"></i>
      <h2>賣場設定</h2>
      <p>此功能開發中</p>
    </div>
  `,
  styles: [`
    .placeholder-page {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 60vh; color: #94A3B8; gap: 1rem;
    }
    .placeholder-icon { font-size: 3rem; }
    h2 { margin: 0; color: #475569; }
    p { margin: 0; }
  `]
})
export class StoreSettingComponent { }

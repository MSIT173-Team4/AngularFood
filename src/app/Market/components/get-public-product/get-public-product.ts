import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../Service/market';

@Component({
  selector: 'app-get-public-product',
  imports: [CommonModule],
  templateUrl: './get-public-product.html',
  styleUrl: './get-public-product.css',
})
export class GetPublicProduct implements OnInit {
  // 改用 signal，資料變動時 Angular 會自動偵測並重新渲染
  products = signal<any[]>([]);

  constructor(private productService: ProductService) { }

  ngOnInit() {
    this.productService.getPublicProducts().subscribe({
      next: (res) => {
        this.products.set(res); // 用 .set() 更新 signal
        console.log('products：', this.products());
      },
      error: (err) => {
        console.error('載入商品失敗', err);
      }
    });
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketService } from '../../Service/market';

@Component({
  selector: 'app-create-product',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-product.html',
  styleUrl: './create-product.css',
})
export class CreateProduct {
  form = {
    productsCategoryNo: '',
    productName: '',
    description: '',
    stock: 0,
    price: 0,
    brandOrOrigin: '',
    manufacturingDate: '',
    expirationDate: '',
  };

  selectedFiles: File[] = [];
  message = '';

  constructor(private marketService: MarketService) { }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  onSubmit() {
    const formData = new FormData();
    formData.append('ProductsCategoryNo', this.form.productsCategoryNo);
    formData.append('ProductName', this.form.productName);
    formData.append('Description', this.form.description);
    formData.append('Stock', this.form.stock.toString());
    formData.append('Price', this.form.price.toString());
    formData.append('BrandOrOrigin', this.form.brandOrOrigin);
    formData.append('ManufacturingDate', this.form.manufacturingDate);
    formData.append('ExpirationDate', this.form.expirationDate);

    for (const file of this.selectedFiles) {
      formData.append('Images', file);
    }

    this.marketService.createProduct(formData).subscribe({
      next: (res: any) => {
        this.message = `新增成功！商品 ID：${res.productId}`;
      },
      error: (err: any) => {
        this.message = `新增失敗：${err.error}`;
      }
    });
  }
}

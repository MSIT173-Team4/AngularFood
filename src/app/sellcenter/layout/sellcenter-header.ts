import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SellerStateService } from '../../Market/Service/seller-state.service';
import { AuthService } from '../../Member/services/auth-services';

@Component({
  selector: 'app-sellcenter-header',
  standalone: true,
  imports: [],
  templateUrl: './sellcenter-header.html',
  styleUrl: './sellcenter-header.css',
})
export class SellcenterHeaderComponent {
  currentPage = '商品管理與營運';

  private pageMap: Record<string, string> = {
    '/sellcenter/products': '商品管理與營運',
    '/sellcenter/orders': '訂單管理',
    '/sellcenter/settings': '賣場設定',
  };

  constructor(
    private router: Router,
    readonly sellerState: SellerStateService,
    readonly authService: AuthService,
  ) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const matched = Object.entries(this.pageMap)
          .find(([path]) => e.urlAfterRedirects.startsWith(path));
        this.currentPage = matched ? matched[1] : '';
      });
  }
}

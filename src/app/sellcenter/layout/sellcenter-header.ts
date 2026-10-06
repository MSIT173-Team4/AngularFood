import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
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

  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    const fallback = '/images/default-avatar.png';
    if (!img.src.endsWith(fallback)) {
      img.src = fallback;
    }
  }
  getUserImage(image?: string | null): string {
    if (!image) {
      return '/images/default-avatar.png';
    }
    if (/^https?:\/\//i.test(image)) {
      return image;
    }

    const backendOrigin = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${backendOrigin}${image.startsWith('/') ? '' : '/'}${image}`;
  }
}

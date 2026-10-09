import { Component, DestroyRef, inject } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SellerStateService } from '../../Market/Service/seller-state.service';
import { AuthService } from '../../Member/services/auth-services';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

@Component({
  selector: 'app-sellcenter-header',
  standalone: true,
  imports: [RouterLink, Menu],
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

  // ===== 使用者下拉選單 =====
  userMenuItems: MenuItem[] = [
    {
      label: '會員中心',
      icon: 'pi pi-user',
      command: () => this.router.navigate(['/main']),
    },
    { separator: true },
    {
      label: '登出',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ];

  constructor(
    private router: Router,
    readonly sellerState: SellerStateService,
    readonly authService: AuthService,
  ) {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),   // 離開賣家中心時自動取消訂閱
      )
      .subscribe((e) => {
        const matched = Object.entries(this.pageMap)
          .find(([path]) => e.urlAfterRedirects.startsWith(path));
        this.currentPage = matched ? matched[1] : '';
      });
  }

  // ===== 登出 =====
  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => console.error('登出失敗', err),
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

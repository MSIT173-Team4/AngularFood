import { Component, DestroyRef, inject, signal, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Button } from 'primeng/button';

import { AuthService } from './Member/services/auth-services';
import { NotificationCenterService } from './layout/notification-center.service';
import { SellerStateService } from './Market/Service/seller-state.service';
import { CartCountService } from './Market/Service/cart-count.service';

type HeaderPanel = 'recipe' | 'market' | 'search' | 'cart' | 'notifications' | 'profile';

@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive, Menu, Button],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  // ===== 注入的服務 =====
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);
  readonly notificationCenter = inject(NotificationCenterService);
  readonly sellerState = inject(SellerStateService);
  readonly cartCount = inject(CartCountService);

  // ===== 畫面狀態（signals） =====
  readonly isMobileNavigationOpen = signal(false);
  readonly hideLayout = signal(false); // 控制 Header / Footer 是否隱藏
  readonly activePanel = signal<HeaderPanel | null>(null);
  readonly quickSearchTerm = signal('');
  readonly isSellerCenter = signal(false);

  // ===== 通知 =====
  readonly notifications = this.notificationCenter.notifications;
  readonly notificationCount = this.notificationCenter.unreadCount;

  // ===== 使用者選單 =====
  userMenuItems: MenuItem[] = [
    {
      label: '登出',
      icon: 'pi pi-sign-out',
      command: () => {
        this.logout();
      },
    },
  ];

  constructor() {
    // 路由切換完成時，統一更新畫面狀態（元件銷毀時自動取消訂閱）
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        const url = event.urlAfterRedirects;

        this.isMobileNavigationOpen.set(false);
        this.activePanel.set(null);
        this.isSellerCenter.set(url.startsWith('/sellcenter'));
        this.hideLayout.set(url.startsWith('/login') || url.startsWith('/register'));
      });
  }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      error: () => {
        this.authService.clearUser();
      },
    });
  }

  private checkLayout(url: string): void {
    const hide = url.startsWith('/login') || url.startsWith('/register');

    this.hideLayout.set(hide);
  }

  toggleMobileNavigation(): void {
    this.isMobileNavigationOpen.update((isOpen) => !isOpen);
  }

  // ===== 登出 =====
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('登出失敗', err);
      },
    });
  }

  // ===== Header 面板 =====
  openPanel(panel: HeaderPanel): void {
    this.activePanel.set(panel);
  }

  togglePanel(panel: HeaderPanel): void {
    this.activePanel.update((current) => (current === panel ? null : panel));
  }

  closePanel(panel?: HeaderPanel): void {
    if (!panel || this.activePanel() === panel) {
      this.activePanel.set(null);
    }
  }

  // ===== 快速搜尋 =====
  submitQuickSearch(): void {
    const keyword = this.quickSearchTerm().trim();
    void this.router.navigate(['/recipes'], {
      queryParams: keyword ? { q: keyword } : {},
    });
  }

  // ===== 通知 =====
  markNotificationAsRead(notificationId: string): void {
    this.notificationCenter.markAsRead(notificationId);
  }

  // 點擊 Header 按鈕 / 面板以外的地方 → 關閉面板
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.activePanel()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.header-action, .navigation-group')) {
      this.closePanel();
    }
  }

  // 按 Esc 也關閉面板
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePanel();
  getUserImage(image?: string | null): string {
    if (!image) {
      return 'assets/default-avatar.png';
    }

    return `https://localhost:7164${image}`;
  }
}

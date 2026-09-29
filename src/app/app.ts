import { Component, OnInit, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './Member/services/auth-services';
import { filter } from 'rxjs';
import { NotificationCenterService } from './layout/notification-center.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Button } from 'primeng/button';
type HeaderPanel = 'recipe' | 'market' | 'search' | 'cart' | 'notifications' | 'profile';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Menu, Button, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  authService = inject(AuthService);
  userMenuItems: MenuItem[] = [
    {
      label: '登出',
      icon: 'pi pi-sign-out',
      command: () => {
        this.logout();
      },
    },
  ];
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);
  readonly notificationCenter = inject(NotificationCenterService);

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
    });
  }
  // 新增：控制 Header / Footer 是否隱藏
  readonly hideLayout = signal(false);

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isMobileNavigationOpen.set(false);

        this.checkLayout(event.urlAfterRedirects);
      });
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const url = event.urlAfterRedirects;

        this.isMobileNavigationOpen.set(false);
        this.activePanel.set(null);
        this.isSellerCenter.set(url.startsWith('/sellcenter'));
        this.hideLayout.set(url.startsWith('/login') || url.startsWith('/register'));
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
  getUserImage(image?: string | null): string {
    if (!image) {
      return 'assets/default-avatar.png';
    }

    return `https://localhost:7164${image}`;
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './Member/services/auth-services';
import { filter } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Button } from 'primeng/button';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Menu, Button],
import { Component, DestroyRef, inject, signal } from '@angular/core';
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

import { NotificationCenterService } from './layout/notification-center.service';

type HeaderPanel = 'recipe' | 'market' | 'search' | 'cart' | 'notifications' | 'profile';


@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive,Menu,Button],
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly notificationCenter = inject(NotificationCenterService);

  readonly isMobileNavigationOpen = signal(false);
  readonly activePanel = signal<HeaderPanel | null>(null);
  readonly quickSearchTerm = signal('');
  readonly notifications = this.notificationCenter.notifications;
  readonly notificationCount = this.notificationCenter.unreadCount;
  readonly isSellerCenter = signal(false);

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      error: () => {
        this.authService.clearUser();
      },
    });
  }
  readonly isMobileNavigationOpen = signal(false);

  // 新增：控制 Header / Footer 是否隱藏
  readonly hideLayout = signal(false);

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isMobileNavigationOpen.set(false);

        this.checkLayout(event.urlAfterRedirects);
      });
  }

  private checkLayout(url: string): void {
    const hide = url.startsWith('/login') || url.startsWith('/register');

    this.hideLayout.set(hide);
  }
  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.isMobileNavigationOpen.set(false);
        this.activePanel.set(null);
        this.isSellerCenter.set(event.urlAfterRedirects.startsWith('/sellcenter'));
      });
  }

  toggleMobileNavigation(): void {
    this.isMobileNavigationOpen.update((isOpen) => !isOpen);
  }
  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('登出失敗', err);
      },
    });
  }

  openPanel(panel: HeaderPanel): void {
    this.activePanel.set(panel);
  }

  togglePanel(panel: HeaderPanel): void {
    this.activePanel.update((current) => current === panel ? null : panel);
  }

  closePanel(panel?: HeaderPanel): void {
    if (!panel || this.activePanel() === panel) {
      this.activePanel.set(null);
    }
  }

  submitQuickSearch(): void {
    const keyword = this.quickSearchTerm().trim();
    void this.router.navigate(['/recipes'], {
      queryParams: keyword ? { q: keyword } : {}
    });
  }

  markNotificationAsRead(notificationId: string): void {
    this.notificationCenter.markAsRead(notificationId);
  }
}

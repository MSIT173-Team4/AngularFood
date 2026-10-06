import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SellerStateService } from '../../Market/Service/seller-state.service';
import { AuthService } from '../../Member/services/auth-services';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  badgeClass?: string;
}

@Component({
  selector: 'app-sellcenter-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sellcenter-sidebar.html',
  styleUrl: './sellcenter-sidebar.css',
})
export class SellcenterSidebarComponent implements OnInit {
  readonly sellerState = inject(SellerStateService);
  readonly authService = inject(AuthService);

  // 數字跟著 summary signal 自動更新
  readonly navItems = computed<NavItem[]>(() => {
    const s = this.sellerState.summary();
    return [
      { label: '商品管理', icon: 'pi pi-box', route: '/sellcenter/products', badge: s?.total },
      { label: '訂單管理', icon: 'pi pi-truck', route: '/sellcenter/orders', badge: s?.pendingOrders, badgeClass: 'badge-urgent' },
      { label: '賣場設定', icon: 'pi pi-cog', route: '/sellcenter/settings' },
    ];
  });

  ngOnInit(): void {
    // 側欄在賣家中心內一直存在，進入後台時載入一次；之後由各頁在資料異動後重新載入
    this.sellerState.loadSummary();
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

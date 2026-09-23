import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

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
export class SellcenterSidebarComponent {
  navItems: NavItem[] = [
    { label: '商品管理', icon: 'pi pi-box', route: '/sellcenter/products', badge: 16 },
    { label: '訂單管理', icon: 'pi pi-truck', route: '/sellcenter/orders', badge: 8, badgeClass: 'badge-urgent' },
    { label: '賣場設定', icon: 'pi pi-cog', route: '/sellcenter/settings' },
  ];
}

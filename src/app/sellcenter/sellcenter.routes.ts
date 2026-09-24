import { Routes } from '@angular/router';

export const SELLCENTER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/sellcenter-layout').then(c => c.SellcenterLayoutComponent),
    children: [
      {
        path: 'products',
        loadComponent: () =>
          import('./product/product-list').then(c => c.ProductListComponent),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./product/product-form').then(c => c.ProductFormComponent),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./product/product-form').then(c => c.ProductFormComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./order/order-list').then(c => c.OrderListComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./store-setting/store-setting').then(c => c.StoreSettingComponent),
      },
      { path: '', redirectTo: 'products', pathMatch: 'full' },
    ],
  },
];

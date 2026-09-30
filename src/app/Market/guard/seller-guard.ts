import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SellerStateService } from '../Service/seller-state.service';

// 賣家中心守衛：有效賣家才能進入；未登入 → 登入頁；非賣家 / 停權 → 商城首頁
export const sellerGuard: CanActivateFn = () => {
  const sellerState = inject(SellerStateService);
  const router = inject(Router);

  return sellerState.fetch().pipe(
    map(info => info.isSeller ? true : router.createUrlTree(['/market/products'])),
    catchError(err => of(
      router.createUrlTree([err.status === 401 ? '/login' : '/market/products'])
    )),
  );
};

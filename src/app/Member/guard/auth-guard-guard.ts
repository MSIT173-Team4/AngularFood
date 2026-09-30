import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth-services';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    // 已登入
    map(() => true),

    // 未登入
    catchError(() => {
      return of(router.createUrlTree(['/login']));
    }),
  );
};

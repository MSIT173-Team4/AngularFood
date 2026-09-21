import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth-services';
export const guestGuardGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    // 已登入
    map(() => {
      return router.createUrlTree(['/main']);
    }),

    // 401 = 未登入
    catchError(() => {
      return of(true);
    }),
  );
};

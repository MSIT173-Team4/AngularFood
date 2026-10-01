import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';

@Component({
  selector: 'app-verifyemail',
  imports: [],
  templateUrl: './verifyemail.html',
  styleUrl: './verifyemail.css',
})
export class VerifyEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  status: 'loading' | 'success' | 'error' = 'loading';
  message = '正在驗證 Email...';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status = 'error';
      this.message = '缺少驗證 Token';
      return;
    }

    this.http
      .get(`${environment.apiUrl}/Users/VerifyEmail/${encodeURIComponent(token)}`)
      .subscribe({
        next: () => {
          this.status = 'success';
          this.message = 'Email 驗證成功';

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },

        error: (err) => {
          this.status = 'error';
          this.message = err.error?.message ?? 'Email 驗證失敗';
        },
      });
  }
}

import { AfterViewInit, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment.development';
import { UserLoginDTO } from '../../interfaces/UserLoginDTO';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../services/auth-services';

declare const google: any;

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit {
  constructor(private http: HttpClient) {}
  private authService = inject(AuthService);
  private router = inject(Router);

  baseURL: string = environment.apiUrl;

  loginData = {
    username: '',
    password: '',
  };

  errorMessage = '';
  ngAfterViewInit(): void {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,

      callback: (response: any) => {
        this.googleLogin(response.credential);
      },
    });

    google.accounts.id.renderButton(document.getElementById('googleButton'), {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
    });
  }
  login(): void {
    const data: UserLoginDTO = {
      Username: this.loginData.username,
      Password: this.loginData.password,
      Email: '',
    };

    this.http
      .post<any>(`${this.baseURL}/Users/Login`, data, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          console.log(res);

          this.authService.getCurrentUser().subscribe({
            next: () => {
              this.router.navigate(['/recipe'], {
                replaceUrl: true,
              });
            },
          });
        },

        error: (err) => {
          console.log('status:', err.status);
          console.log('error:', err.error);

          this.errorMessage = err.error?.message ?? '登入失敗，請稍後再試';
        },
      });
  }
  googleLogin(credential: string): void {
    this.authService.googleLogin(credential).subscribe({
      next: (res) => {
        console.log('後端 Google Login 回傳：', res);
        this.authService.getCurrentUser().subscribe({
          next: () => {
            this.router.navigate(['/recipe'], {
              replaceUrl: true,
            });
          },
        });
      },

      error: (err) => {
        console.error('Google 登入失敗：', err);

        this.errorMessage = err.error?.message ?? 'Google 登入失敗，請稍後再試';
      },
    });
  }
}

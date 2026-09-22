import { CurrentUserDTO } from './../interfaces/CurrentUserDTO';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment.development';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseURL = environment.apiUrl;

  currentUser = signal<CurrentUserDTO | null>(null);
  constructor(private http: HttpClient) {}

  checkAuth() {
    return this.http.get(`${this.baseURL}/Users/CheckAuth`, {
      withCredentials: true,
    });
  }
  getCurrentUser() {
    return this.http
      .get<CurrentUserDTO>(`${this.baseURL}/Users/CurrentUser`, {
        withCredentials: true,
      })
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
        }),
      );
  }

  logout() {
    return this.http
      .post(
        `${this.baseURL}/Users/Logout`,
        {},
        {
          withCredentials: true,
        },
      )
      .pipe(
        tap(() => {
          this.currentUser.set(null);
        }),
      );
  }
  clearUser() {
    this.currentUser.set(null);
  }
  googleLogin(credential: string) {
    return this.http.post(
      `${this.baseURL}/Users/GoogleLogin`,
      { credential },
      { withCredentials: true },
    );
  }
}

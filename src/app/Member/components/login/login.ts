import { Register } from './../register/register';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserLoginDTO } from '../../interfaces/UserLoginDTO';
import { HttpHeaders } from '@angular/common/http';
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(private http: HttpClient) {}
  baseURL: string = 'https://localhost:7164/api';
  loginData = { username: '', password: '' };
  errorMessage = '';
  login() {
    let data: UserLoginDTO = {
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
          this.http
            .get(`${this.baseURL}/Users/test`, {
              withCredentials: true,
            })
            .subscribe({
              next: (res) => {
                console.log(res);
              },
              error: (res) => {
                console.log(res);
              },
            });
        },
        error: (err) => {
          console.log('status:', err.status);
          console.log('error:', err.error);
          console.log('message:', err.error?.message);
          console.log('完整錯誤:', err);
        },
      });
  }
}

import { Component, Inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserProfileDTO } from '../../interfaces/UserProfileDTO';
import { Router } from '@angular/router';
@Component({
  selector: 'app-main',
  imports: [],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  constructor(private http: HttpClient) { }
  private router=Inject(Router)
  baseURL: string = 'https://localhost:7164/api';
  userProfile: any;
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.http
            .get(`${this.baseURL}/Users/GetUserProfile`, {
              withCredentials: true,
            })
            .subscribe({
              next: (res) => {
                this.userProfile = res;
              },
              error: (res) => {
                console.log(res);
              },
            });
  }
  test() {
    console.log(this.userProfile);
  }
  logout() {
    this.http.get(`${this.baseURL}/Users/Logout`, {
      withCredentials:true,
    }).subscribe({
      next: (res) => {
        console.log(res)
        this.router.navigate(['/login']);
      },
      error: (res) => {
        console.log(res);
      }
    })
  }
}

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SellcenterSidebarComponent } from './sellcenter-sidebar';
import { SellcenterHeaderComponent } from './sellcenter-header';

@Component({
  selector: 'app-sellcenter-layout',
  standalone: true,
  imports: [RouterOutlet, SellcenterSidebarComponent, SellcenterHeaderComponent],
  templateUrl: './sellcenter-layout.html',
  styleUrl: './sellcenter-layout.css',
})
export class SellcenterLayoutComponent { }

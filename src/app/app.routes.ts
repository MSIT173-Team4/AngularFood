import { authGuard } from './Member/guard/auth-guard-guard';
import { Routes } from '@angular/router';

import { NearbyPlace } from './FoodMap/nearby-place/nearby-place';
import { CreateProduct } from './Market/components/create-product/create-product';
import {
  pantryResolver,
  recipeDetailResolver,
  recipeListResolver,
} from './Recipe/recipe.resolvers';
import { Login } from './Member/components/login/login';
import { Register } from './Member/components/register/register';
import { Main } from './Member/components/main/main';
import { guestGuardGuard } from './Member/guard/guest-guard-guard';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: '登入',
    canActivate: [guestGuardGuard],
    component: Login,
  },
  {
    path: 'register',
    title: '註冊',
    canActivate: [guestGuardGuard],
    component: Register,
  },
  {
    path: 'main',
    canActivate: [authGuard],
    component: Main,
  },
  {
    path: 'main/:id',
    canActivate: [authGuard],
    component: Main,
  },
  {
    path: 'recipes',
    title: '食譜發現｜友料美食生活平台',
    resolve: { pageData: recipeListResolver },
    loadComponent: () =>
      import('./Recipe/recipe-list/recipe-list').then((module) => module.RecipeList),
  },
  {
    path: 'recipes/:id',
    title: '食譜詳情｜友料美食生活平台',
    resolve: { pageData: recipeDetailResolver },
    loadComponent: () =>
      import('./Recipe/recipe-detail/recipe-detail').then((module) => module.RecipeDetail),
  },
  {
    path: 'pantry',
    title: '智慧清冰箱｜友料美食生活平台',
    resolve: { pageData: pantryResolver },
    loadComponent: () =>
      import('./Recipe/smart-pantry/smart-pantry').then((module) => module.SmartPantry),
  },
  {
    path: 'cooking-mode/:id',
    title: '專注料理模式｜友料美食生活平台',
    resolve: { pageData: recipeDetailResolver },
    loadComponent: () =>
      import('./Recipe/cooking-mode/cooking-mode').then((module) => module.CookingMode),
  },
  {
    path: 'create',
    title: '建立食譜｜友料美食生活平台',
    loadComponent: () =>
      import('./Recipe/create-recipe/create-recipe').then((module) => module.CreateRecipe),
  },
  { path: 'market/create-product', component: CreateProduct },
  { path: 'nearby-place', component: NearbyPlace },
  { path: 'cooking/:id', redirectTo: 'cooking-mode/:id' },
  { path: '**', redirectTo: 'recipes' },
];

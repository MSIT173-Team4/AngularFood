import { authGuard } from './Member/guard/auth-guard-guard';
import { TripBuilder } from './FoodMap/trip-builder/trip-builder';
import { Routes } from '@angular/router';
import {
  pantryResolver,
  recipeDetailResolver,
  recipeListResolver,
} from './Recipe/recipe.resolvers';
import { Login } from './Member/components/login/login';
import { Register } from './Member/components/register/register';
import { Main } from './Member/components/main/main';
import { VerifyEmail } from './Member/components/verifyemail/verifyemail';
import { guestGuardGuard } from './Member/guard/guest-guard-guard';
import { GetPublicProduct } from './Market/components/get-public-product/get-public-product';
import { ProductDetailComponent } from './Market/components/product-detail/product-detail';
import { ShoppingCartComponent } from './Market/components/shopping-cart/shopping-cart';
import { CheckoutShippingComponent } from './Market/components/checkout-shipping/checkout-shipping';
import { OrderCompleteComponent } from './Market/components/order-complete/order-complete';
import { sellerGuard } from './Market/guard/seller-guard';

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
    path: 'verifyemail',
    canActivate: [guestGuardGuard],
    component: VerifyEmail,
  },
  {
    path: 'recipes',
    title: '食譜發現｜友料美食生活平台',
    resolve: { pageData: recipeListResolver },
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Recipe/recipe-list/recipe-list').then((module) => module.RecipeList),
  },
  {
    path: 'recipes/:id',
    title: '食譜詳情｜友料美食生活平台',
    resolve: { pageData: recipeDetailResolver },
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Recipe/recipe-detail/recipe-detail').then((module) => module.RecipeDetail),
  },
  {
    path: 'pantry',
    title: '智慧清冰箱｜友料美食生活平台',
    resolve: { pageData: pantryResolver },
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Recipe/smart-pantry/smart-pantry').then((module) => module.SmartPantry),
  },
  {
    path: 'cooking-mode/:id',
    title: '專注料理模式｜友料美食生活平台',
    resolve: { pageData: recipeDetailResolver },
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Recipe/cooking-mode/cooking-mode').then((module) => module.CookingMode),
  },
  {
    path: 'create',
    title: '建立食譜｜友料美食生活平台',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Recipe/create-recipe/create-recipe').then((module) => module.CreateRecipe),
  },
  {
    path: 'shopping-list',
    title: '料理採購清單｜友料美食生活平台',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Recipe/shopping-list/shopping-list').then((module) => module.ShoppingList),
  },
  {
    path: 'social',
    title: '討論區｜友料美食生活平台',
    loadComponent: () =>
      import('./Social/Component/post-list/post-list').then(
        (module) => module.PostListComponent
      )
  },
  {
    path: 'social/create',
    title: '發佈文章｜友料美食生活平台',
    loadComponent: () =>
      import('./Social/Component/create-post/create-post').then(
        (module) => module.CreatePostComponent
      )
  },
  {
    path: 'social/edit-post/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Social/Component/edit-post/edit-post').then(
        (module) => module.EditPostComponent
      ),
  },
  {
    path: 'social/post/:id',
    title: '討論區｜友料美食生活平台',
    loadComponent: () =>
      import('./Social/Component/post-detail/post-detail').then(
        (module) => module.PostDetailComponent
      )
  },
  {
    path: 'trip-builder',
    title: '美食地圖｜友料美食生活平台',
    loadComponent: () =>
      import('./FoodMap/trip-builder/trip-builder').then((m) => m.TripBuilder)
  },
  { path: 'cooking/:id', redirectTo: 'cooking-mode/:id' },
  { path: 'market/products/:id', component: ProductDetailComponent },
  { path: 'market/products', component: GetPublicProduct },
  { path: 'market/cart', canActivate: [authGuard], component: ShoppingCartComponent },
  { path: 'market/checkout/shipping', canActivate: [authGuard], component: CheckoutShippingComponent },
  { path: 'checkout/complete/:batchId', canActivate: [authGuard], component: OrderCompleteComponent },
  { path: 'sellcenter', canActivate: [sellerGuard], loadChildren: () => import('./sellcenter/sellcenter.routes').then(r => r.SELLCENTER_ROUTES), },
  { path: '**', redirectTo: 'recipes' }
];

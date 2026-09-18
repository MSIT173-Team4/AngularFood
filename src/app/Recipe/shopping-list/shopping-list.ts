import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';

import { recipeDemoConfig } from '../api.config';
import { RecipeShoppingListItem } from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

@Component({
  selector: 'app-shopping-list',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './shopping-list.html',
  styleUrl: './shopping-list.css'
})
export class ShoppingList implements OnInit {
  private readonly recipeService = inject(RecipeService);
  private readonly messageService = inject(MessageService);

  readonly listName = signal('我的料理採購清單');
  readonly items = signal<RecipeShoppingListItem[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadFailed = signal(false);
  readonly unitOptions = ['公克', '公斤', '毫升', '公升', '顆', '個', '根', '片', '份', '包', '盒', '罐'];

  readonly pendingItems = computed(() => this.items().filter((item) => !item.isPurchased));
  readonly purchasedItems = computed(() => this.items().filter((item) => item.isPurchased));
  readonly completionRate = computed(() => {
    const total = this.items().length;
    return total ? Math.round((this.purchasedItems().length / total) * 100) : 0;
  });

  ngOnInit(): void {
    this.loadShoppingList();
  }

  loadShoppingList(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.recipeService.getShoppingList(recipeDemoConfig.userId).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (!response.success || !response.data) {
          this.loadFailed.set(true);
          return;
        }

        this.listName.set(response.data.listName);
        this.items.set(response.data.items.map((item) => ({ ...item })));
      },
      error: () => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  updateItem<K extends keyof RecipeShoppingListItem>(
    index: number,
    field: K,
    value: RecipeShoppingListItem[K]
  ): void {
    this.items.update((items) => items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  }

  removeItem(index: number): void {
    this.items.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  saveShoppingList(): void {
    const items = this.items();
    if (items.some((item) => item.quantity <= 0 || !item.unit.trim())) {
      this.showMessage('error', '資料需要調整', '每項食材的數量須大於零，並選擇採購單位。');
      return;
    }

    this.isSaving.set(true);
    this.recipeService.saveShoppingList(recipeDemoConfig.userId, {
      listName: this.listName().trim() || '我的料理採購清單',
      items: items.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        isPurchased: item.isPurchased,
        note: item.note
      }))
    }).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (!response.success || !response.data) {
          this.showMessage('error', '儲存失敗', response.message);
          return;
        }

        this.listName.set(response.data.listName);
        this.items.set(response.data.items.map((item) => ({ ...item })));
        this.showMessage('success', '採購清單已更新', '清單會保留在會員帳號中。');
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.showMessage(
          'error',
          '儲存失敗',
          typeof error.error?.message === 'string' ? error.error.message : '請稍後再試。'
        );
      }
    });
  }

  private showMessage(severity: 'success' | 'error', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail });
  }
}

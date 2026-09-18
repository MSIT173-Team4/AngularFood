import { Injectable, computed, signal } from '@angular/core';

export type NotificationCategory =
  | 'subscription'
  | 'market'
  | 'recipe'
  | 'forum'
  | 'food-map'
  | 'system';

export interface GlobalNotification {
  id: string;
  source: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  icon: string;
  route?: string;
  isRead: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly notificationState = signal<GlobalNotification[]>([]);

  readonly notifications = computed(() =>
    [...this.notificationState()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    )
  );
  readonly unreadCount = computed(() =>
    this.notificationState().filter((notification) => !notification.isRead).length
  );

  replaceSource(source: string, notifications: GlobalNotification[]): void {
    this.notificationState.update((current) => [
      ...current.filter((notification) => notification.source !== source),
      ...notifications.map((notification) => ({ ...notification, source }))
    ]);
  }

  markAsRead(notificationId: string): void {
    this.notificationState.update((current) => current.map((notification) =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    ));
  }

  markAllAsRead(): void {
    this.notificationState.update((current) => current.map((notification) => ({
      ...notification,
      isRead: true
    })));
  }

  clearSource(source: string): void {
    this.notificationState.update((current) =>
      current.filter((notification) => notification.source !== source)
    );
  }
}

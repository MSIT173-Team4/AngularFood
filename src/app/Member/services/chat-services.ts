import { Injectable, ChangeDetectorRef, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment.development';
import { ChatRoomDTO } from '../interfaces/ChatRoomDTO';
import { ChatMessage } from '../interfaces/ChatMessage';
@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private hubConnection!: signalR.HubConnection;

  async startConnection() {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.url}/chatHub`, {
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .build();

    await this.hubConnection.start();
  }
  chatListVisible = signal(false);
  selectedRoomId = signal<number | null>(null);
  openChatList() {
    this.chatListVisible.set(true);
    console.log('chatListVisible:', this.chatListVisible());
  }
  openChat(roomId: number) {
    this.selectedRoomId.set(roomId);
    this.chatListVisible.set(true);
  }
  closeChatList() {
    this.chatListVisible.set(false);
  }

  joinRoom(roomId: number) {
    return this.hubConnection.invoke('JoinRoom', roomId);
  }
  sendMessage(roomId: number, message: string) {
    return this.hubConnection.invoke('SendMessage', roomId, message);
  }

  onReceiveMessage(callback: (message: ChatMessage) => void) {
    this.hubConnection.on('ReceiveMessage', callback);
  }
}

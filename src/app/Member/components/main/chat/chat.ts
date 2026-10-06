import { ChatService } from './../../../services/chat-services';
import { Component, OnInit, ChangeDetectorRef, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { environment } from '../../../../../environments/environment';
import { ChatRoomDTO } from '../../../interfaces/ChatRoomDTO';
import { ChatMessage } from '../../../interfaces/ChatMessage';
import { AuthService } from '../../../services/auth-services';
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DialogModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit {
  rooms: ChatRoomDTO[] = [];

  chatVisible = false;

  selectedRoom: ChatRoomDTO | null = null;

  messages: ChatMessage[] = [];

  message = '';

  constructor(
    private http: HttpClient,
    public chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    effect(() => {
      const visible = this.chatService.chatListVisible();

      if (visible) {
        this.getRooms();
      }
    });
  }

  async ngOnInit() {
    this.getRooms();

    try {
      await this.chatService.startConnection();

      console.log('SignalR 連線成功');

      this.chatService.onReceiveMessage((message: ChatMessage) => {
        console.log('收到訊息：', message);

        if (this.selectedRoom && message.roomId === this.selectedRoom.roomId) {
          this.messages = [...this.messages, message];
          this.cdr.detectChanges();
        }
      });
    } catch (err) {
      console.error('SignalR 連線失敗', err);
    }
  }
  get currentUserId(): number | null {
    return this.authService.currentUser()?.userId ?? null;
  }

  getRooms() {
    this.http
      .get<ChatRoomDTO[]>(`${environment.apiUrl}/Chat/GetRooms`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.rooms = res;
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  async openRoom(room: ChatRoomDTO) {
    this.selectedRoom = room;
    this.chatService.closeChatList();
    this.chatVisible = true;

    this.messages = [];

    // 先抓歷史訊息
    this.getMessages(room.roomId);

    try {
      await this.chatService.joinRoom(room.roomId);

      console.log(`已加入 room-${room.roomId}`);
    } catch (err) {
      console.error('加入聊天室失敗', err);
    }
  }

  closeRoom() {
    this.chatVisible = false;
    this.selectedRoom = null;
    this.messages = [];
  }
  getChatImageUrl(url: string) {
    return `${environment.apiUrl}${url}`;
  }
  getMessages(roomId: number) {
    this.http
      .get<ChatMessage[]>(`${environment.apiUrl}/Chat/GetMessages/${roomId}`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.messages = res;
        },
        error: (err) => {
          console.error('取得聊天紀錄失敗', err);
        },
      });
  }
  async send() {
    if (!this.message.trim()) return;

    if (!this.selectedRoom) return;

    try {
      await this.chatService.sendMessage(this.selectedRoom.roomId, this.message);

      this.message = '';
    } catch (err) {
      console.error('傳送訊息失敗', err);
    }
  }
}

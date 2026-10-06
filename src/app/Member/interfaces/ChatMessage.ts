export interface ChatMessage {
  roomId: number;
  senderId: number;
  imageUrl: string;
  messageType: number;
  content: string;
  sendTime: string;
}

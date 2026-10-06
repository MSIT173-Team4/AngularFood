export interface ChatMessage {
  [x: string]: any;
  roomId: number;
  senderId: number;
  imageUrl: string;
  messageType: number;
  content: string;
  sendTime: string;
}

import { ChatUser } from './chat-user';
import { Message } from './message';

export interface ChatDetail {
  conversationId: string;
  topic: string;
  members: ChatUser[];
  lastMessageTime: Date;
  theirDisplayName: string;
  messages: Message[];
}

import { ChatUser } from './chat-user';
import { Message } from './message';

export interface ConversationDetail {
  conversationId: string;
  topic: string;
  members: ChatUser[];
  lastMessageTime: Date;
  theirDisplayName: string;
  messages: Message[];
}

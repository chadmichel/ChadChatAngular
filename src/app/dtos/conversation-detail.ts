import { ChatUser } from './chat-user';
import { Message } from './message';

export interface ConversationDetail {
  threadId: string;
  topic: string;
  members: ChatUser[];
  lastMessageTime: Date;
  theirDisplayName: string;
  messages: Message[];
}

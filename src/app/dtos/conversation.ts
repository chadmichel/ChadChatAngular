import { ChatUser } from './chat-user';

export interface Conversation {
  threadId: string;
  group: string;
  topic: string;
  createdTime: Date;
  createdByUserId: string;
  createdByEmail: string;
  invitedUserId: string;
  invitedUserEmail: string;
  members: ChatUser[];
  lastMessageTime: Date;
  lastMessage: string;
  lastMessageSenderUserId: string;
  lastMessageSenderEmail: string;
  profanity: boolean;
}

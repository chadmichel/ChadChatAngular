import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ChatThread } from '../dtos/chat-thread';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent {
  chats: Observable<ChatThread[]> = of([]);
  isLoaded: boolean = false;

  constructor(
    private title: Title,
    private chatService: ChatService,
    private router: Router
  ) {
    this.title.setTitle('Conversation List');
    if (!this.chatService.isReady()) {
      this.router.navigate(['/login']);
    }
  }

  ngOnInit() {
    this.chats = this.chatService.getChats();
    this.chats.subscribe(() => (this.isLoaded = true));
  }

  openChat(chat: ChatThread) {
    this.router.navigate(['/chats', chat.threadId]);
  }
}

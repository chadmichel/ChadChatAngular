import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { Chat } from '../dtos/conversation';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent {
  readonly chats$: Observable<Chat[]>;

  constructor(
    private readonly title: Title,
    private readonly router: Router,
    chatService: ChatService
  ) {
    this.title.setTitle('Conversation List');

    this.chats$ = chatService.chats$.pipe(
      map((chats) => {
        return Object.values(chats).sort((a, b) => {
          return (
            new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime()
          );
        });
      }),
      tap((chats) => {
        console.log('loaded');
        console.log(chats.length);
        console.log('setting title');
        this.title.setTitle('Conversation List (' + chats.length + ')');
      })
    );
  }

  openChat(chat: Chat) {
    this.router.navigate(['/chats', chat.conversationId]);
  }
}

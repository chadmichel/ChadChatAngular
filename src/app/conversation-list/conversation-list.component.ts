import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Conversation } from '../dtos/conversation';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent {
  chats$: Observable<Conversation[]>;
  isLoaded: boolean = false;

  constructor(
    private readonly title: Title,
    private readonly router: Router,
    chatService: ChatService
  ) {
    this.title.setTitle('Conversation List');

    this.chats$ = chatService.chats$.pipe(
      tap((chats) => {
        console.log('loaded');
        console.log(chats.length);
        this.isLoaded = true;
        console.log('setting title');
        this.title.setTitle('Conversation List (' + chats.length + ')');
      })
    );
  }

  openChat(chat: Conversation) {
    this.router.navigate(['/chats', chat.conversationId]);
  }
}

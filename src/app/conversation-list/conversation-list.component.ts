import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Conversation } from '../dtos/conversation';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent {
  chats$: Observable<Conversation[]> = of([]);
  chats: Conversation[] = [];
  isLoaded: boolean = false;

  constructor(
    private title: Title,
    private chatService: ChatService,
    private router: Router
  ) {
    this.title.setTitle('Conversation List');
  }

  ngOnInit() {
    this.chats$ = this.chatService.getChats();
    this.chats$.subscribe((chats) => {
      console.log('loaded');
      console.log(chats.length);
      this.chats = chats;
      this.isLoaded = true;
      console.log('setting title');
      this.title.setTitle('Conversation List (' + chats.length + ')');
    });
  }

  openChat(chat: Conversation) {
    this.router.navigate(['/chats', chat.conversationId]);
  }
}

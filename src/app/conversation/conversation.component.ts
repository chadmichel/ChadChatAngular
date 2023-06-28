import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TimeAgoPipe } from 'time-ago-pipe';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss'],
})
export class ConversationComponent {
  newMessage: string = '';
  id: string = '';
  messages: any[] = [];

  constructor(
    private title: Title,
    private chatService: ChatService,
    private router: Router,
    private activeRoute: ActivatedRoute
  ) {
    this.title.setTitle('Conversation');
  }

  async ngOnInit() {
    this.activeRoute.params.subscribe(async (params) => {
      this.id = params['id'];
      var chat = await this.chatService.getChat(this.id);
      this.messages = chat.messages;
      this.title.setTitle('Chat with ' + chat.theirDisplayName);
    });
  }

  async sendMessage() {
    if (this.newMessage.length > 0) {
      this.chatService.sendMessage(this.id, this.newMessage);
      this.newMessage = '';
    }
  }
}

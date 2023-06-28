import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TimeAgoPipe } from 'time-ago-pipe';
import { BehaviorSubject } from 'rxjs';
import { ChatThreadDetail } from '../dtos/chat-thread-detail';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss'],
})
export class ConversationComponent {
  newMessage: string = '';
  id: string = '';
  messages: any[] = [];

  chatDetail: BehaviorSubject<ChatThreadDetail> =
    new BehaviorSubject<ChatThreadDetail>({
      threadId: '',
      topic: '',
      members: [],
      lastMessageTime: new Date(),
      theirDisplayName: '',
      messages: [],
    });

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
      this.chatDetail = chat;
      this.messages = chat.value.messages;
      this.title.setTitle('Chat with ' + chat.value.theirDisplayName);
    });
  }

  async sendMessage() {
    if (this.newMessage.length > 0) {
      this.chatService.sendMessage(this.id, this.newMessage);
      this.newMessage = '';
    }
  }
}

import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ConversationDetail } from '../dtos/conversation-detail';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss'],
})
export class ConversationComponent {
  newMessage: string = '';
  id: string = '';

  chatDetail: BehaviorSubject<ConversationDetail> =
    new BehaviorSubject<ConversationDetail>({
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
      this.chatDetail = await this.chatService.getChat(this.id);
      this.chatDetail.subscribe((chat) => {
        this.title.setTitle('Chat with ' + chat.theirDisplayName);
        this.scrollToBottom();
      });

      this.scrollToBottom();
    });
  }

  async sendMessage() {
    if (this.newMessage.length > 0) {
      this.chatService.sendMessage(this.id, this.newMessage);
      this.newMessage = '';
    }
  }

  scrollToBottom() {
    var element = document.getElementById('chatmessages');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }
}

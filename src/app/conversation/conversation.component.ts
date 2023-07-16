import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, filter, map, switchMap } from 'rxjs';
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
      conversationId: '',
      topic: '',
      members: [],
      lastMessageTime: new Date(),
      theirDisplayName: '',
      messages: [],
    });

  constructor(
    private readonly title: Title,
    private readonly chatService: ChatService,
    private readonly activeRoute: ActivatedRoute
  ) {
    this.title.setTitle('Conversation');

    this.activeRoute.params
      .pipe(
        filter((params) => params['id']),
        switchMap((params) =>
          this.chatService.chatDetails$.pipe(
            map((details) => details[params['id']])
          )
        )
      )
      .subscribe((chat) => {
        this.id = chat.conversationId;
        this.chatDetail.next(chat);
        this.title.setTitle('Chat with ' + chat.theirDisplayName);
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
    const element = document.getElementById('chatmessages');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from '../chat.service';
import { ActivatedRoute } from '@angular/router';
import { Observable, filter, map } from 'rxjs';
import { Message } from '../dtos/message';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss'],
})
export class ConversationComponent implements OnInit {
  public newMessage: string = '';
  private conversationId!: string;

  public messages$!: Observable<Message[]>;

  constructor(
    private readonly title: Title,
    private readonly chatService: ChatService,
    private readonly activeRoute: ActivatedRoute
  ) {
    this.title.setTitle('Conversation');
  }

  ngOnInit() {
    this.conversationId = this.activeRoute.snapshot.params['id'];

    this.messages$ = this.chatService.chatDetails$.pipe(
      filter((chatDetails) => chatDetails[this.conversationId] !== undefined),
      map((chatDetails) => chatDetails[this.conversationId].messages)
    );

    this.chatService.loadChatDetails(this.conversationId);
  }

  public sendMessage() {
    if (!this.newMessage.trim().length) {
      return;
    }

    this.chatService.sendMessage({
      conversationId: this.conversationId,
      text: this.newMessage,
    });

    this.newMessage = '';
  }
}

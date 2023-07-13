import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChatClient, ChatMessage } from '@azure/communication-chat';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs';
import { Conversation } from './dtos/conversation';
import { Message } from './dtos/message';
import { ConversationDetail } from './dtos/conversation-detail';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  maxMessages: number = 100;
  token: string = '';
  chatEndpoint: string = '';
  email: string = '';
  userId: string = '';
  tokenExpiresOn: Date | undefined;

  chatClient: ChatClient | undefined;

  chats$: BehaviorSubject<Conversation[]> = new BehaviorSubject<Conversation[]>(
    []
  );

  chatDetails$ = new Map<string, BehaviorSubject<ConversationDetail>>();

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();

    if (this.tokenExpiresOn && this.tokenExpiresOn > new Date()) {
      this.createClient();
    }
  }

  private createClient() {
    const tokenCredential = new AzureCommunicationTokenCredential(this.token);
    if (this.chatClient) {
      this.chatClient?.stopRealtimeNotifications();
    }
    this.chatClient = new ChatClient(this.chatEndpoint, tokenCredential);

    this.reloadConversations();

    this.chatClient.startRealtimeNotifications();
    this.chatClient.on('chatMessageReceived', (e) => {
      console.log('notification: ' + JSON.stringify(e));

      const chatDetail = this.chatDetails$.get(e.threadId);
      if (chatDetail) {
        var senderId = (e.sender as any).communicationUserId;
        const mine = senderId == this.userId;
        var message: Message = {
          id: e.id,
          text: e.message,
          senderDisplayName: e.senderDisplayName,
          createdOn: new Date(e.createdOn),
          isMine: mine,
          sequenceId: 1000, // we don't get sequence from event :(
        };
        chatDetail.value.messages.push(message);
        chatDetail.next(chatDetail.value);
      } else {
        console.log('chatDetail not found for ' + e.threadId);
      }

      var chat = this.chats$.value.find((c) => c.threadId == e.threadId);
      if (chat) {
        chat.lastMessageTime = new Date(e.createdOn);
        chat.lastMessage = e.message;
        this.chats$.next(this.chats$.value);
      }
    });

    this.chatClient.on('chatThreadCreated', (e) => {
      this.reloadConversations();
    });
  }

  private reloadConversations() {
    this.httpGet<Conversation[]>('GetChats').subscribe((chats) => {
      console.log('chats: ' + chats.length);
      this.chats$.next(chats);
    });
  }

  async login(email: string) {
    this.chatDetails$.clear();
    var initResponse = (await firstValueFrom(
      this.httpPost('Init', { email: email })
    )) as any;
    console.log(initResponse);
    this.token = initResponse.token;
    this.chatEndpoint = initResponse.endpoint;
    this.email = initResponse.email;
    this.userId = initResponse.userId;
    this.tokenExpiresOn = new Date(initResponse.expiresOn);

    this.createClient();

    this.saveToLocalStorage();
  }

  getChats(): Observable<Conversation[]> {
    return this.chats$;
  }

  getChat(chatId: string): BehaviorSubject<ConversationDetail> {
    // if we already have the chat detail, return it
    let chatDetail$ = this.chatDetails$.get(chatId);

    if (chatDetail$ && chatDetail$.value.threadId == chatId) {
      return chatDetail$;
    }

    // clear the chat detail
    let chatDetail = {
      threadId: chatId,
      topic: '',
      members: [],
      lastMessageTime: new Date(),
      theirDisplayName: '',
      messages: [],
    } as ConversationDetail;
    chatDetail$ = new BehaviorSubject<ConversationDetail>(chatDetail);
    chatDetail$.next(chatDetail);
    this.chatDetails$.set(chatId, chatDetail$);

    // populate the chat detail using cached list of chats
    this.chats$.subscribe((chats) => {
      var chat = chats.find((c) => c.threadId == chatId);
      if (chat && chatDetail.threadId == chat.threadId) {
        chatDetail.topic = chat.topic;
        chatDetail.members = chat.members;
        chatDetail.lastMessageTime = chat.lastMessageTime;
        if (chat.createdByUserId == this.userId) {
          chatDetail.theirDisplayName = chat.invitedUserEmail;
        } else {
          chatDetail.theirDisplayName = chat.createdByEmail;
        }
      }
      chatDetail$?.next(chatDetail);
    });

    // async load the messages
    setTimeout(async () => {
      const messages = this.chatClient
        ?.getChatThreadClient(chatId)
        .listMessages();

      var messagesParsed: Message[] | PromiseLike<Message[]> = [];

      if (messages) {
        for await (const message of messages) {
          console.log(message.id + ' ' + message.content);
          if (
            message.content?.message === undefined ||
            message.content === undefined
          ) {
            continue;
          }
          messagesParsed.push({
            id: message.id,
            text: message.content?.message as string,
            senderDisplayName: chatDetail.theirDisplayName,
            createdOn: message.createdOn,
            isMine: (message.sender as any).communicationUserId === this.userId,
            sequenceId: parseInt(message.sequenceId),
          });

          messagesParsed = messagesParsed.sort(
            (a, b) => a.sequenceId - b.sequenceId
          );

          // only allow 100 messages in UI
          // this maybe could be a larger number
          if (messagesParsed.length > this.maxMessages) {
            messagesParsed = messagesParsed.slice(
              messagesParsed.length - this.maxMessages
            );
          }
        }
      }
      if (chatDetail.threadId == chatId) {
        chatDetail.messages = messagesParsed;
        chatDetail$?.next(chatDetail);
      }
    }, 1);

    return chatDetail$;
  }

  async sendMessage(chatId: string, message: string) {
    var result = (await firstValueFrom(
      this.httpPost('LogMessage', {
        threadId: chatId,
        message: message,
      })
    )) as any;
    console.log(result);
    const chatThread = this.chatClient?.getChatThreadClient(chatId);
    if (chatThread) {
      const sendResult = await chatThread.sendMessage({
        content: result.message,
      });
      console.log(sendResult.id);
    }
  }

  async createConversation(email: string) {
    var response = (await firstValueFrom(
      this.httpPost('CreateChat', {
        inviteEmail: email,
      })
    )) as any;
    console.log(response);
  }

  isReady() {
    return (
      this.chatClient != undefined &&
      this.token != '' &&
      this.token != undefined &&
      this.tokenExpiresOn != undefined &&
      this.tokenExpiresOn! > new Date()
    );
  }

  saveToLocalStorage() {
    localStorage.setItem(
      'chatService',
      JSON.stringify({
        token: this.token,
        chatEndpoint: this.chatEndpoint,
        email: this.email,
        userId: this.userId,
        tokenExpiresOn: this.tokenExpiresOn,
      })
    );
  }

  loadFromLocalStorage() {
    let data = JSON.parse(localStorage.getItem('chatService') || '{}');
    this.token = data.token;
    this.chatEndpoint = data.chatEndpoint;
    this.email = data.email;
    this.userId = data.userId;
    this.tokenExpiresOn = new Date(data.tokenExpiresOn);
  }

  private requestOptions() {
    return {
      headers: new HttpHeaders({
        Token: this.token ?? '',
        userId: this.userId ?? '',
        userEmail: this.email ?? '',
      }),
    };
  }

  getEmail() {
    return this.email;
  }

  // Code for calling Azure Function API
  private code = '';
  getCode() {
    if (this.code == undefined || this.code == '') {
      this.code = localStorage.getItem('code') ?? '';
    }
    return this.code;
  }
  setCode(code: string) {
    this.code = code;
    localStorage.setItem('code', code);
  }

  // URL for calling Azure Function API
  private serviceUrl = '';
  getServiceUrl() {
    if (this.serviceUrl == undefined || this.serviceUrl == '') {
      this.serviceUrl = localStorage.getItem('serviceUrl') ?? '';
    }
    if (this.serviceUrl == undefined || this.serviceUrl == '') {
      this.serviceUrl = 'https://localhost:7071'; // default for local dev
    }
    return this.serviceUrl;
  }
  setServiceUrl(url: string) {
    this.serviceUrl = url;
    localStorage.setItem('serviceUrl', url);
  }

  private httpGet<T>(path: string): Observable<T> {
    return this.http.get<T>(
      `${this.getServiceUrl()}/api/${path}?code=${this.getCode()}`,
      this.requestOptions()
    );
  }

  private httpPost<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(
      `${this.getServiceUrl()}/api/${path}?code=${this.getCode()}`,
      body,
      this.requestOptions()
    );
  }
}

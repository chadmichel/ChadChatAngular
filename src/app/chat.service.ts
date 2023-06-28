import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChatClient, ChatMessage } from '@azure/communication-chat';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs';
import { ChatThread } from './dtos/chat-thread';
import { Message } from './dtos/message';
import { ChatThreadDetail } from './dtos/chat-thread-detail';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  token: string = '';
  chatEndpoint: string = '';
  email: string = '';
  userId: string = '';
  tokenExpiresOn: Date | undefined;

  chatClient: ChatClient | undefined;

  chats$: BehaviorSubject<ChatThread[]> = new BehaviorSubject<ChatThread[]>([]);

  chatDetail$: BehaviorSubject<ChatThreadDetail> =
    new BehaviorSubject<ChatThreadDetail>({
      threadId: '',
      topic: '',
      members: [],
      lastMessageTime: new Date(),
      theirDisplayName: '',
      messages: [],
    });

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();

    if (this.tokenExpiresOn && this.tokenExpiresOn > new Date()) {
      this.createClient();
    }
  }

  private createClient() {
    const tokenCredential = new AzureCommunicationTokenCredential(this.token);
    this.chatClient = new ChatClient(this.chatEndpoint, tokenCredential);

    this.chatClient.startRealtimeNotifications();
    this.chatClient.on('chatMessageReceived', (e) => {
      console.log('notification: ' + e);
    });

    this.httpGet<ChatThread[]>('GetChats').subscribe((chats) => {
      console.log('chats: ' + chats.length);
      this.chats$.next(chats);
    });

    this.chatClient.startRealtimeNotifications();
    this.chatClient.on('chatMessageReceived', (e) => {
      console.log('notification: ' + e);

      if (this.chatDetail$.value.threadId == e.threadId) {
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
        this.chatDetail$.value.messages.push(message);
        this.chatDetail$.next(this.chatDetail$.value);
      }
    });
  }

  async login(email: string) {
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

  getChats(): Observable<ChatThread[]> {
    return this.chats$;
  }

  getChat(chatId: string): BehaviorSubject<ChatThreadDetail> {
    if (this.chatDetail$.value.threadId == chatId) {
      return this.chatDetail$;
    }

    // clear the chat detail
    const chatDetail = {
      threadId: chatId,
      topic: '',
      members: [],
      lastMessageTime: new Date(),
      theirDisplayName: '',
      messages: [],
    } as ChatThreadDetail;
    this.chatDetail$.next(chatDetail);

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
      this.chatDetail$.next(chatDetail);
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
        }
      }
      if (chatDetail.threadId == chatId) {
        chatDetail.messages = messagesParsed;
        this.chatDetail$.next(chatDetail);
      }
    }, 1);

    return this.chatDetail$;
  }

  async sendMessage(chatId: string, message: string) {
    const chatThread = this.chatClient?.getChatThreadClient(chatId);
    if (chatThread) {
      const sendResult = await chatThread.sendMessage({
        content: message,
      });
      console.log(sendResult.id);
    }
  }

  async createConversation(email: string) {
    var response = (await firstValueFrom(
      this.http.post(`${this.getServiceUrl()}/api/CreateChat`, {
        creatorEmail: this.email,
        creatorUserId: this.userId,
        token: this.token,
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

  getServiceUrl() {
    if (location.hostname === 'localhost') {
      return 'http://localhost:7071';
    }
    throw new Error("Can't get service URL");
  }

  private httpGet<T>(path: string): Observable<T> {
    return this.http.get<T>(
      `${this.getServiceUrl()}/api/${path}`,
      this.requestOptions()
    );
  }

  private httpPost<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(
      `${this.getServiceUrl()}/api/${path}`,
      body,
      this.requestOptions()
    );
  }
}

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
  chatClient: ChatClient | undefined;
  tokenExpiresOn: Date | undefined;

  chats: ChatThread[] = [];
  chats$: BehaviorSubject<ChatThread[]> = new BehaviorSubject<ChatThread[]>([]);

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
    if (this.token && this.token !== '') {
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
      this.chats = chats;
      for (var chat of chats) {
        console.log('chat: ' + chat.threadId);
      }
      this.chats$.next(chats);
    });
  }

  async init(email: string) {
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

  async reInit() {
    if (this.tokenExpiresOn && this.tokenExpiresOn > new Date()) {
      this.createClient();
      return true;
    }
    return false;
  }

  getChats(): Observable<ChatThread[]> {
    return this.chats$;
  }

  async getChat(chatId: string): Promise<ChatThreadDetail> {
    const messages = this.chatClient
      ?.getChatThreadClient(chatId)
      .listMessages();

    console.log('chats: ' + this.chats.length);
    var chat = this.chats.filter((c) => c.threadId == chatId)[0];

    if (chat == undefined) {
      console.log('chat not found');

      for (var c of this.chats) {
        console.log('chat: ' + c.threadId);
        if (c.threadId == chatId) {
          chat = c;
          console.log('found chat!!!');
          break;
        }
      }

      throw new Error('chat not found');
    }

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
          senderDisplayName: message.senderDisplayName as string,
          createdOn: message.createdOn,
          isMine: (message.sender as any).communicationUserId === this.userId,
          sequenceId: parseInt(message.sequenceId),
        });

        messagesParsed.sort(
          (a, b) =>
            a.createdOn.getUTCMilliseconds() - b.createdOn.getUTCMilliseconds()
        );
      }
    }

    const theirDisplayName = chat.members.filter(
      (m) => m.userId !== this.userId
    )[0].email;

    return {
      threadId: chatId,
      topic: 'Chat with ' + theirDisplayName,
      members: [],
      lastMessageTime: new Date(),
      theirDisplayName: theirDisplayName,
      messages: messagesParsed,
    };
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
    console.log('isReady ' + this.tokenExpiresOn);
    console.log('chatClient ' + this.chatClient);
    if (this.tokenExpiresOn! < new Date()) {
      console.log('token expired');
    }
    if (this.tokenExpiresOn! >= new Date()) {
      console.log('token not expired');
    }
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
        Token: this.token,
        userId: this.userId,
        userEmail: this.email,
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

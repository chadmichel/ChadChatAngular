import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChatClient, ChatMessage } from '@azure/communication-chat';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { Observable, firstValueFrom } from 'rxjs';
import { ChatThread } from './dtos/chat-thread';
import { Message } from './dtos/message';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  token: string = '';
  chatEndpoint: string = '';
  email: string = '';
  userId: string = '';
  chatClient: ChatClient | undefined;

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
  }

  async init(email: string) {
    var initResponse = (await firstValueFrom(
      this.http.post(`${this.getServiceUrl()}/api/Init`, { email: email })
    )) as any;
    console.log(initResponse);
    this.token = initResponse.token;
    this.chatEndpoint = initResponse.endpoint;
    this.email = initResponse.email;
    this.userId = initResponse.userId;

    this.createClient();

    this.saveToLocalStorage();
  }

  getChats(): Observable<ChatThread[]> {
    return this.httpGet<ChatThread[]>('GetChats');
  }

  getChat(chatId: string): Observable<ChatThread> {
    return this.httpGet<ChatThread>(`GetChat?chatId=${chatId}`);
  }

  async getMessages(chatId: string): Promise<Message[]> {
    const messages = this.chatClient
      ?.getChatThreadClient(chatId)
      .listMessages();

    var response: Message[] | PromiseLike<Message[]> = [];

    if (messages) {
      for await (const message of messages) {
        console.log(message.id + ' ' + message.content);
        response.push({
          id: message.id,
          text: message.content?.message as string,
          senderDisplayName: message.senderDisplayName as string,
          createdOn: message.createdOn,
          isMine: true,
          sequenceId: message.sequenceId,
        });
      }
    }

    return response;
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
    return this.chatClient !== undefined;
  }

  saveToLocalStorage() {
    localStorage.setItem(
      'chatService',
      JSON.stringify({
        token: this.token,
        chatEndpoint: this.chatEndpoint,
        email: this.email,
        userId: this.userId,
      })
    );
  }

  loadFromLocalStorage() {
    let data = JSON.parse(localStorage.getItem('chatService') || '{}');
    this.token = data.token;
    this.chatEndpoint = data.chatEndpoint;
    this.email = data.email;
    this.userId = data.userId;
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

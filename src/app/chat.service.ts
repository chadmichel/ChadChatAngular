import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ChatClient,
  ChatMessageReceivedEvent,
} from '@azure/communication-chat';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import {
  EMPTY,
  Observable,
  filter,
  firstValueFrom,
  map,
  of,
  switchMap,
} from 'rxjs';
import { Conversation } from './dtos/conversation';
import { ConversationDetail } from './dtos/conversation-detail';
import { ComponentStore } from '@ngrx/component-store';

@Injectable({
  providedIn: 'root',
})
export class ChatService extends ComponentStore<ChatState> {
  maxMessages: number = 100;
  chatClient: ChatClient | undefined;

  public readonly chats$ = this.select(({ chats }) => chats);
  public readonly chatDetails$ = this.select(({ chatDetails }) => chatDetails);

  public readonly isReady$ = this.select(
    ({ clientState }) =>
      clientState && new Date(clientState.expiresOn) > new Date()
  );

  constructor(private http: HttpClient) {
    super({ chats: [], chatDetails: {} });

    // changes to clientState will cache the state and create a new client if needed
    this.state$
      .pipe(
        filter(({ clientState }) => clientState !== undefined),
        map(({ clientState }) => clientState!)
      )
      .subscribe((clientState) => {
        this.saveToLocalStorage(clientState);

        if (new Date(clientState.expiresOn) > new Date()) {
          this.createClient(
            clientState.endpoint,
            clientState.token,
            clientState.userId
          );
        }
      });

    // this will patch the state and trigger client creation, if there is state
    // otherwise they'll have to use the public 'login' method to create the client
    this.loadFromLocalStorage();
  }

  private createClient(endpoint: string, token: string, userId: string) {
    const tokenCredential = new AzureCommunicationTokenCredential(token);

    this.chatClient?.stopRealtimeNotifications();
    this.chatClient = new ChatClient(endpoint, tokenCredential);

    this.reloadConversations();

    this.chatClient.startRealtimeNotifications();

    this.chatClient.on(
      'chatMessageReceived',
      (event: ChatMessageReceivedEvent) => {
        console.log('notification: ' + JSON.stringify(event));

        this.addNewChatMessage(event);
      }
    );

    // TODO how use effects?
    this.chatClient.on('chatThreadCreated', (e) => {
      this.reloadConversations();
    });
  }

  readonly addNewChatMessage = this.updater(
    (state, event: ChatMessageReceivedEvent) => {
      const chatDetail = state.chatDetails[event.threadId];

      if (!chatDetail) {
        // TODO should we create a new chatDetail here?
        // Does this mean they received a message from a chat they didn't start?
        console.log('chatDetail not found for ' + event.threadId);
        return state;
      } else {
        const senderId = (event.sender as any).communicationUserId;
        // note that clientId can't be null here... is it weird to need check?
        const isMine = senderId == state.clientState?.userId;

        chatDetail.messages.push({
          id: event.id,
          text: event.message,
          senderDisplayName: event.senderDisplayName,
          createdOn: event.createdOn,
          isMine,
          // TODO what does this mean?
          sequenceId: 1000, // CM: we don't get sequence from event :(
        });
      }

      const chat = state.chats.find((c) => c.conversationId == event.threadId);

      if (chat) {
        chat.lastMessageTime = event.createdOn;
        chat.lastMessage = event.message;
      }

      return state;
    }
  );

  // TODO how to use effects?
  private reloadConversations() {
    this.httpGet<Conversation[]>('GetConversations').subscribe({
      next: (chats) => {
        this.patchState({ chats: chats });
      },
      error: (err) => {
        // TODO: handle error
        console.error(err);
      },
    });
  }

  async login(email: string) {
    const initResponse = (await firstValueFrom(
      this.httpPost('Init', { email: email })
    )) as any;

    console.log(initResponse);

    // TODO should clear earlier than this? on logout? or something?
    // is it necessary at all?
    // this.chatDetails$.clear();
    this.patchState({ clientState: { ...initResponse }, chatDetails: {} });
  }

  getChat(chatId: string): Observable<ConversationDetail> {
    return this.select((state) => state.chatDetails[chatId]).pipe(
      switchMap((chatDetail) => {
        // CM has this check in there but I'm not sure why
        // if (chatDetail$ && chatDetail$.value.conversationId == chatId) {
        if (chatDetail) {
          return of(chatDetail);
        } else {
          // // clear the chat detail
          // let chatDetail = {
          //   conversationId: chatId,
          //   topic: '',
          //   members: [],
          //   lastMessageTime: new Date(),
          //   theirDisplayName: '',
          //   messages: [],
          // } as ConversationDetail;
          // chatDetail$ = new BehaviorSubject<ConversationDetail>(chatDetail);
          // chatDetail$.next(chatDetail);
          // this.chatDetails$.set(chatId, chatDetail$);

          // // populate the chat detail using cached list of chats
          // this.chats$.subscribe((chats) => {
          //   var chat = chats.find((c) => c.conversationId == chatId);
          //   if (chat && chatDetail.conversationId == chat.conversationId) {
          //     chatDetail.topic = chat.topic;
          //     chatDetail.members = chat.members;
          //     chatDetail.lastMessageTime = chat.lastMessageTime;
          //     if (chat.createdByUserId == this.userId) {
          //       chatDetail.theirDisplayName = chat.invitedUserEmail;
          //     } else {
          //       chatDetail.theirDisplayName = chat.createdByEmail;
          //     }
          //   }
          //   chatDetail$?.next(chatDetail);
          // });

          // // async load the messages
          // setTimeout(async () => {
          //   const messages = this.chatClient
          //     ?.getChatThreadClient(chatId)
          //     .listMessages();

          //   var messagesParsed: Message[] | PromiseLike<Message[]> = [];

          //   if (messages) {
          //     for await (const message of messages) {
          //       console.log(message.id + ' ' + message.content);
          //       if (
          //         message.content?.message === undefined ||
          //         message.content === undefined
          //       ) {
          //         continue;
          //       }
          //       messagesParsed.push({
          //         id: message.id,
          //         text: message.content?.message as string,
          //         senderDisplayName: chatDetail.theirDisplayName,
          //         createdOn: message.createdOn,
          //         isMine: (message.sender as any).communicationUserId === this.userId,
          //         sequenceId: parseInt(message.sequenceId),
          //       });

          //       messagesParsed = messagesParsed.sort(
          //         (a, b) => a.sequenceId - b.sequenceId
          //       );

          //       // only allow 100 messages in UI
          //       // this maybe could be a larger number
          //       if (messagesParsed.length > this.maxMessages) {
          //         messagesParsed = messagesParsed.slice(
          //           messagesParsed.length - this.maxMessages
          //         );
          //       }
          //     }
          //   }
          //   if (chatDetail.conversationId == chatId) {
          //     chatDetail.messages = messagesParsed;
          //     chatDetail$?.next(chatDetail);
          //   }
          // }, 1);

          return EMPTY;
        }
      })
    );
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
      this.httpPost('CreateConversation', {
        inviteEmail: email,
      })
    )) as any;
    console.log(response);
  }

  saveToLocalStorage({
    token,
    endpoint,
    expiresOn,
    userId,
    email,
  }: ClientState) {
    localStorage.setItem(
      'chatService',
      JSON.stringify({
        token,
        endpoint,
        email,
        userId,
        expiresOn,
      })
    );
  }

  loadFromLocalStorage() {
    const jsonCache = localStorage.getItem('chatService');

    if (jsonCache == undefined) {
      return;
    }

    this.patchState({ clientState: JSON.parse(jsonCache) });
  }

  private requestOptions() {
    return this.get(({ clientState }) => {
      return {
        headers: new HttpHeaders({
          Token: clientState?.token ?? '',
          userId: clientState?.userId ?? '',
          userEmail: clientState?.email ?? '',
        }),
      };
    });
  }

  getEmail() {
    return this.get(({ clientState }) => clientState?.email);
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
      this.serviceUrl = 'https://localhost:7072'; // default for local dev
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

export interface ChatState {
  chats: Conversation[];
  chatDetails: ConversationDetails;
  clientState?: ClientState;
}

export interface ConversationDetails {
  [threadId: string]: ConversationDetail;
}

export interface ClientState {
  token: string;
  endpoint: string;
  email: string;
  userId: string;
  expiresOn: Date;
}

// TODO first get stuff working with Chad's DTOs, then refactor to these
// export interface ChatSummary {
//   id: string;
//   createdAt: Date;
//   lastMessageAt: Date; // <-- derive from chat messages if we have them?
//   lastMessageText: string; // <-- derive from chat messages if we have them?
//   participants: ParticipantSummary[];
// }

// export interface ParticipantSummary {
//   id: string;
//   name: string;
//   accountType: 'Student' | 'Teacher';
//   profilePictureUrl: string;
// }

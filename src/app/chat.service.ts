import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ChatClient,
  ChatMessage,
  ChatMessageReceivedEvent,
} from '@azure/communication-chat';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import {
  EMPTY,
  Observable,
  combineLatest,
  combineLatestWith,
  concatWith,
  exhaustMap,
  filter,
  from,
  map,
  of,
  reduce,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { Chat } from './dtos/conversation';
import { ChatDetail } from './dtos/conversation-detail';
import { ComponentStore, tapResponse } from '@ngrx/component-store';
import { Message, NewMessage } from './dtos/message';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService extends ComponentStore<ChatState> {
  private readonly maxMessages: number = 100;

  public readonly chats$ = this.select(({ chats }) => chats).pipe(
    filter((chats) => chats !== undefined),
    map((chats) => chats!)
  );

  public readonly chatDetails$ = this.select(({ chatDetails }) => chatDetails);

  private chatClient: ChatClient | undefined;

  public readonly isReady$ = this.select(
    ({ clientState }) =>
      clientState && new Date(clientState.expiresOn) > new Date()
  );

  constructor(
    private readonly http: HttpClient,
    private readonly storageService: StorageService
  ) {
    super({ chatDetails: {} });

    const email = this.storageService.getCache('email');

    if (email) {
      this.login(email);
    }
  }

  public readonly login = this.effect((email$: Observable<string>) => {
    return email$.pipe(
      switchMap((email) => {
        const cachedState = this.storageService.getCache('chatClientState');

        const clientState$ =
          cachedState && new Date(cachedState.expiresOn) > new Date()
            ? of(cachedState)
            : this.httpPost<ClientState>('Init', { email: email });

        return clientState$.pipe(
          tapResponse(
            (clientState) => {
              this.storageService.cache('chatClientState', clientState);
              this.patchState({ clientState });
              this.createClient(clientState.endpoint, clientState.token);
            },
            (err) => console.error(err)
          )
        );
      })
    );
  });

  public readonly logout = this.effect<void>(($) =>
    $.pipe(
      tap(() => {
        this.storageService.clearCache('chatClientState');
        this.chatClient?.stopRealtimeNotifications();
        this.chatClient = undefined;
      })
    )
  );

  private createClient(endpoint: string, token: string) {
    const tokenCredential = new AzureCommunicationTokenCredential(token);

    this.chatClient = new ChatClient(endpoint, tokenCredential);
    this.chatClient.startRealtimeNotifications();
    this.chatClient.on('chatMessageReceived', (e) => this.addMessage(e));
    this.chatClient.on('chatThreadCreated', () => this.reloadChats());

    this.reloadChats();
  }

  private readonly addMessage = this.updater(
    (state, event: ChatMessageReceivedEvent) => {
      const chat = state.chats![event.threadId];
      const chatDetail = state.chatDetails[event.threadId];

      // TODO what does it mean if these are null? how did we get here?
      // TODO previously 'chat' was not checked for null...meaning...?
      if (!chatDetail) {
        console.log('chatDetail not found for ' + event.threadId);
        return state;
      } else if (!chat) {
        console.log('chat not found for ' + event.threadId);
        return state;
      }

      // is it possible for clientState to be null? throw error?
      const senderId = (event.sender as any).communicationUserId;
      const isMine = senderId == state.clientState?.userId;

      chatDetail.messages = [
        {
          id: event.id,
          text: event.message,
          senderDisplayName: event.senderDisplayName,
          createdOn: event.createdOn,
          isMine,
          // TODO what does this mean? just give it a high number to put it at the end?
          sequenceId: 1000, // CM: we don't get sequence from event :(
        },
        ...chatDetail.messages,
      ];

      chat.lastMessageTime = event.createdOn;
      chat.lastMessage = event.message;

      console.log('new chat message added');

      return {
        ...state,
        chatDetails: {
          ...state.chatDetails,
          [event.threadId]: chatDetail,
        },
      };
    }
  );

  private readonly reloadChats = this.effect<void>(($) =>
    $.pipe(
      exhaustMap(() =>
        this.httpGet<Chat[]>('GetConversations').pipe(
          tapResponse(
            (chats) => this.setChats(chats),
            (err) => console.error(err)
          )
        )
      )
    )
  );

  private readonly setChats = this.updater(
    (state, chats: Chat[]): ChatState => {
      const chatsDict = chats.reduce((acc, chat) => {
        acc[chat.conversationId] = chat;
        return acc;
      }, {} as { [id: string]: Chat });

      return { ...state, chats: chatsDict };
    }
  );

  public readonly loadChatDetails = this.effect(
    (conversationId$: Observable<string>) => {
      return conversationId$.pipe(
        // Wait for chats before initializing chat details
        combineLatestWith(this.chats$),
        tap(([conversationId]) =>
          console.log('initializing chat details for ' + conversationId)
        ),
        switchMap(([conversationId, chats]) => {
          const details = this.get(
            (state) => state.chatDetails[conversationId]
          );

          // this chat was already initialized
          if (details) {
            return EMPTY;
          }

          // TODO userId must exist...so why do we need to bang it?
          // should we mergeMap instead?
          const userId = this.get((state) => state.clientState!.userId);

          // 'listMessages' returns messages one by one, so we need to build our own array

          // TODO how to we stop grabbing messages at 100? takeUntil?
          // CM: only allow 100 messages in UI
          // this maybe could be a larger number
          // if (messagesParsed.length > this.maxMessages) {
          //   messagesParsed = messagesParsed.slice(
          //     messagesParsed.length - this.maxMessages
          //   );
          // }
          return from(
            this.chatClient!.getChatThreadClient(conversationId).listMessages()
          ).pipe(
            filter((message) => message.content?.message !== undefined),
            reduce<ChatMessage, Message[]>((acc, message) => {
              const messageParsed: Message = {
                id: message.id,
                text: message.content!.message!,
                senderDisplayName: '', //chatDetail.theirDisplayName,
                createdOn: message.createdOn,
                isMine: (message.sender as any).communicationUserId === userId,
                sequenceId: parseInt(message.sequenceId),
              };

              acc.push(messageParsed);
              return acc;
            }, []),
            map((messages) =>
              messages.sort((a, b) => b.sequenceId - a.sequenceId)
            ),
            map((messages): ChatDetail => {
              const chat = chats[conversationId];

              return {
                conversationId: conversationId,
                messages,
                topic: chat.topic ?? '',
                members: chat.members ?? [],
                lastMessageTime: chat.lastMessageTime ?? new Date(),
                theirDisplayName:
                  chat.createdByUserId === userId
                    ? chat.invitedUserEmail ?? ''
                    : chat.createdByEmail ?? '',
              };
            }),
            tapResponse(
              (detail) => this.addChatDetail(detail),
              (error) => console.error(error)
            )
          );
        })
      );
    }
  );

  private readonly addChatDetail = this.updater(
    (state, chatDetail: ChatDetail) => {
      console.log('adding chat detail for ' + chatDetail.conversationId);

      return {
        ...state,
        chatDetails: {
          ...state.chatDetails,
          [chatDetail.conversationId]: chatDetail,
        },
      };
    }
  );

  public readonly sendMessage = this.effect(
    (message$: Observable<NewMessage>) => {
      return message$.pipe(
        switchMap((message) =>
          this.httpPost('LogMessage', {
            threadId: message.conversationId,
            message: message.text,
          }).pipe(map((result: any) => ({ message, result })))
        ),
        switchMap(({ message, result }) => {
          return from(
            this.chatClient!.getChatThreadClient(
              message.conversationId
            ).sendMessage({
              content: result.message,
            })
          ).pipe(
            tapResponse(
              // No action necessary with response
              (response) => console.log('Message sent :' + response.id),
              (err) => console.error(err)
            )
          );
        })
      );
    }
  );

  public readonly createChat = this.effect((email$: Observable<string>) => {
    return email$.pipe(
      switchMap((email) => {
        return this.httpPost('CreateConversation', {
          inviteEmail: email,
        }).pipe(
          tapResponse(
            // No action necessary with response
            (response) => console.log(response),
            (err) => console.error(err)
          )
        );
      })
    );
  });

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

  private requestOptions() {
    return this.get(({ clientState }) => {
      return {
        headers: new HttpHeaders({
          Token: clientState!.token,
          userId: clientState!.userId,
          userEmail: clientState!.email,
        }),
      };
    });
  }
}

export interface ChatState {
  chats?: Chats;
  chatDetails: ChatDetails;
  clientState?: ClientState;
}

export interface Chats {
  [threadId: string]: Chat;
}

export interface ChatDetails {
  [threadId: string]: ChatDetail;
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

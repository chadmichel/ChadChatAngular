# ChadChatAngular

## Project Overview

This is the front end component that goes with the backend component. Combined these create a very simple chat application. Both of these can be ran together on your machine to give you a simple chat application.

## Project Tech Overview

Project was built using Angualr 15.2.6 and Angular Material. Backend is an Azure Function application.

Frontend makes calls to an Azure function backend for some services. And uses Azure Chat service for sending and receiving messages.

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

To run this application successfully you will also need to run the backend application.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Azure Function Backend

Link: https://github.com/chadmichel/ChadChatBackend

The Azure Function Backend provides a few methods used by this application.

### Backend API

All calls but Init assume Token (azure chat), userId, and userEmail are passed through headers.

```TypeScript
private requestOptions() {
return {
    headers: new HttpHeaders({
    Token: this.token ?? '',
    userId: this.userId ?? '',
    userEmail: this.email ?? '',
    }),
};
}
```

- Init
  - POST /api/Init
- CreateConversation
  - POST /api/CreateConversation
- GetConversations
  - GET /api/GetConversation
- LogMessage
  - POST /api/LogMessage

Calls to the backend API are all done in ChatService.ts.

```TypeScript
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
```

## Companion Backend

Link: https://github.com/chadmichel/ChadChatBackend

The Azure Function Backend provides a few methods used by this application.

## Chat Sequence Diagrams

1. Init

```mermaid
sequenceDiagram
    Frontend ChatService->>+Function Backend: 'Init'
    Function Backend->>+Azure Chat: Get User Token
    Function Backend->>+Table Storage: Store User
    Function Backend->>+Frontend ChatService: Return User Token
```

2. Create Conversation

```mermaid
sequenceDiagram
    Frontend ChatService->>+Function Backend: 'CreateConversation'
    Function Backend->>+Azure Chat: Create Conversation
    Function Backend->>+Table Storage: Store Conversation
    Function Backend->>+Frontend ChatService: Return Conversation Id
```

3. Get Chat

```mermaid
sequenceDiagram
    Frontend ChatService->>+Function Backend: 'GetConversations'
    Function Backend->>+Azure Chat: listChatThreads
    Function Backend->>+Table Storage: getConversations
    Function Backend->>+Function Backend: filter list
    Function Backend->>+Frontend ChatService: List of Conversations
```

4. Send Messages

```mermaid
sequenceDiagram
    Frontend ChatService->>+Function Backend: LogMessage
    Function Backend->>+BadWords: Clean Message
    BadWords->>+Function Backend: Cleaned Message
    Function Backend->>+Table Storage: Log Message
    Frontend ChatService->>+Azure Chat: sendMessage
```

5. Receive Messages

```mermaid
sequenceDiagram
    Azure Chat->>+Frontend ChatService: onMessageReceived
```

## Related Blog Post Series

[Part 1 - Angular Setup](https://dontpaniclabs.com/blog/post/2023/04/27/building-a-chat-system-part-1/)

[Part 2 - Azure Chat](https://dontpaniclabs.com/blog/post/2023/05/09/building-a-chat-system-part-2/)

[Part 3 - Chat Storage](https://dontpaniclabs.com/blog/post/2023/07/05/building-a-chat-system-part-3/)

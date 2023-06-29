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
- CreateChat
  - POST /api/CreateChat
- GetChats
  - GET /api/GetChats
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

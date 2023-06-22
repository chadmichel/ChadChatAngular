import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  token: string = '';
  chatEndpoint: string = '';
  email: string = '';
  userId: string = '';

  constructor(private http: HttpClient) {}

  async init(email: string) {
    var initResponse = (await firstValueFrom(
      this.http.post(`${this.getServiceUrl()}/api/Init`, { email: email })
    )) as any;
    console.log(initResponse);
    this.token = initResponse.token;
    this.chatEndpoint = initResponse.endpoint;
  }

  getServiceUrl() {
    if (location.hostname === 'localhost') {
      return 'http://localhost:7071';
    }
    throw new Error("Can't get service URL");
  }
}

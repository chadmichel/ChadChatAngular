import { Component } from '@angular/core';
import { ChatService } from '../chat.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email: string = '';
  code: string = '';
  apiUri: string = '';

  constructor(private chatService: ChatService, private router: Router) {
    this.email = chatService.getEmail();
    this.apiUri = chatService.getServiceUrl();
    this.code = chatService.getCode();
  }

  async login() {
    this.chatService.setCode(this.code);
    this.chatService.setServiceUrl(this.apiUri);
    await this.chatService.login(this.email);
    this.router.navigate(['/chats']);
  }
}

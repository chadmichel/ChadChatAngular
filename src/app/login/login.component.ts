import { Component } from '@angular/core';
import { ChatService } from '../chat.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email: string = '';

  constructor(private chatService: ChatService) {}

  async login() {
    await this.chatService.init(this.email);
  }
}

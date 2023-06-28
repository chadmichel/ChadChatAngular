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

  constructor(private chatService: ChatService, private router: Router) {}

  async login() {
    await this.chatService.login(this.email);
    this.router.navigate(['/chats']);
  }
}

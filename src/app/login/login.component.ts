import { Component } from '@angular/core';
import { ChatService } from '../chat.service';
import { Router } from '@angular/router';
import { StorageService } from '../storage.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email: string;
  code: string = '';
  apiUri: string = '';

  constructor(
    private readonly chatService: ChatService,
    private readonly storageService: StorageService,
    private router: Router
  ) {
    this.apiUri = chatService.getServiceUrl();
    this.code = chatService.getCode();
    this.email = this.storageService.getCache('email') || '';
  }

  login() {
    this.storageService.cache('email', this.email);

    this.chatService.setCode(this.code);
    this.chatService.setServiceUrl(this.apiUri);
    this.chatService.login(this.email);

    // TODO login was previously awaited but now it's not async
    // so is there something in the service we should subscribe on?
    this.chatService.isReady$.subscribe((ready) => {
      if (ready) {
        this.router.navigate(['/chats']);
      } else {
        console.log('LoginComponent: isnot ready');
      }
    });
  }

  logout() {
    this.storageService.clearCache('email');
    this.chatService.logout();
  }
}

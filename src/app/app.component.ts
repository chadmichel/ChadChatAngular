import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { EmailDialogComponent } from './email-dialog/email-dialog.component';
import { ChatService } from './chat.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  pageTitle = 'Chat App';

  constructor(
    private router: Router,
    private title: Title,
    private dialog: MatDialog,
    private chatService: ChatService
  ) {}

  async ngOnInit() {}

  newConversation(): void {
    const dialogRef = this.dialog.open(EmailDialogComponent, {
      width: '250px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        console.log('Email address:', result);
        await this.chatService.createConversation(result);
      }
    });
  }

  gotoHome(): void {
    this.router.navigate(['chats']);
  }

  gotoLogin(): void {
    this.router.navigate(['login']);
  }
}

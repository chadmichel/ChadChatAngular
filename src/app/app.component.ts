import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { EmailDialogComponent } from './email-dialog/email-dialog.component';
import { ChatService } from './chat.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  pageTitle = 'Chat App';

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private chatService: ChatService
  ) {}

  newConversation(): void {
    const dialogRef = this.dialog.open(EmailDialogComponent, {
      width: '250px',
    });

    dialogRef
      .afterClosed()
      .pipe(filter((email) => !!email))
      .subscribe((result) => {
        console.log('Email address:', result);
        this.chatService.createConversation(result);
      });
  }

  gotoHome(): void {
    this.router.navigate(['chats']);
  }

  gotoLogin(): void {
    this.router.navigate(['login']);
  }
}

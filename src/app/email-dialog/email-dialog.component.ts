import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-email-dialog',
  templateUrl: './email-dialog.component.html',
  styleUrls: ['./email-dialog.component.scss'],
})
export class EmailDialogComponent {
  email: string = '';

  constructor(public dialogRef: MatDialogRef<EmailDialogComponent>) {}

  cancel() {
    this.dialogRef.close();
  }

  createConversation() {
    this.dialogRef.close(this.email);
  }
}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConversationComponent } from './conversation/conversation.component';
import { ConversationListComponent } from './conversation-list/conversation-list.component';

const routes: Routes = [
  { path: 'chats/:id', component: ConversationComponent },
  { path: 'chats', component: ConversationListComponent },
  { path: '', redirectTo: '/chats', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

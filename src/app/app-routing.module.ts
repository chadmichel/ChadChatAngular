import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConversationComponent } from './conversation/conversation.component';
import { ConversationListComponent } from './conversation-list/conversation-list.component';
import { LoginComponent } from './login/login.component';

const routes: Routes = [
  { path: 'chats/:id', component: ConversationComponent },
  { path: 'chats', component: ConversationListComponent },
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

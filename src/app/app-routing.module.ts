import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {MainContainerComponent} from './components/main-container/main-container.component';
import {ChatRoomComponent} from './components/main-container/chat-area/chat-room/chat-room.component';
import {ChatDefaultPageComponent} from './components/main-container/chat-area/chat-default-page/chat-default-page.component';
import {LoginComponent} from './components/login/login.component';
import {ChatGuard} from './guards/chat.guard';
import {DashboardComponent} from './components/dashboard/dashboard.component';
import {SignUpComponent} from './components/sign-up/sign-up.component';
import {ForgotPasswordComponent} from './components/forgot-password/forgot-password.component';
import {VerifyEmailComponent} from './components/verify-email/verify-email.component';
import {AuthGuard} from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/sign-in', pathMatch: 'full' },
  { path: 'sign-in', component: LoginComponent },
  { path: 'register-user', component: SignUpComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]},
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-email-address', component: VerifyEmailComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

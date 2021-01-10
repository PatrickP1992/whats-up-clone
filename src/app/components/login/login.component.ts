import { Component, OnInit } from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {CommonService} from '../../services/common.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  constructor(private authService: AuthService,
              private commonService: CommonService) { }

  ngOnInit(): void {
  }

  loginGoogle(): void {
    this.authService.GoogleAuth();
  }

  login(email: string, password: string): void {
    this.authService.SignIn(email, password);
  }
}

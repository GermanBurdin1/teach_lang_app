import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const mockUser = {
        id: '123',
        email: this.loginForm.value.email,
        roles: ['student', 'teacher'], // имитируем пользователя с двумя ролями
      };

      this.authService.setUser(mockUser);

      if (mockUser.roles.length === 1) {
        this.authService.setActiveRole(mockUser.roles[0]);
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/select-role']);
      }
    }
  }
}

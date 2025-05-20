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
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      console.log('[LoginComponent] Attempting login with', email);

      this.authService.login(email, password).subscribe({
        next: (user) => {
          console.log('[LoginComponent] Login successful:', user);
          this.authService.setUser(user);

          if (user.roles.length === 1) {
            this.authService.setActiveRole(user.roles[0]);
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/select-role']);
          }
        },
        error: (err) => {
          console.error('[LoginComponent] Login failed:', err);
          alert(err.error?.message || 'Identifiants incorrects');
        }
      });
    }
  }


}

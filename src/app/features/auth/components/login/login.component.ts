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
  availableRoles: string[] = [];
  emailChecked = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      selectedRole: [null, Validators.required]
    });

    // 👉 Если админ вводит логин, сразу задаём роль и снимаем валидацию
    this.loginForm.get('email')?.valueChanges.subscribe(email => {
      if (email === 'admin@admin.net') {
        this.loginForm.get('selectedRole')?.setValidators([]); // убираем required
        this.loginForm.get('selectedRole')?.setValue('admin');
        this.loginForm.get('selectedRole')?.updateValueAndValidity();
      } else {
        this.loginForm.get('selectedRole')?.setValidators([Validators.required]); // восстанавливаем
        this.loginForm.get('selectedRole')?.setValue(null);
        this.loginForm.get('selectedRole')?.updateValueAndValidity();
      }
    });
  }

  onEmailBlur(): void {
    const email = this.loginForm.get('email')?.value;
    if (email) {
      this.authService.checkEmailExists(email).subscribe({
        next: (res) => {
          this.emailChecked = true;
          this.availableRoles = res.roles || [];

          if (this.availableRoles.length === 1) {
            this.loginForm.get('selectedRole')?.setValue(this.availableRoles[0]); // 💥 Автоустановка
          } else {
            this.loginForm.get('selectedRole')?.reset(); // сбросить, чтобы не блокировать кнопку
          }
        },
        error: (err) => {
          console.error('Erreur lors de la vérification de l\'email', err);
        }
      });
    }
  }


  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password, selectedRole } = this.loginForm.value;
      console.log('Trying login with', this.loginForm.value);
      this.authService.login(email, password).subscribe({
        next: (user) => {
          this.authService.setUser(user);
          this.authService.setActiveRole(selectedRole);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          alert(err.error?.message || 'Identifiants incorrects');
        }
      });
    }
  }

}

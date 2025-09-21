import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../services/notification.service';
import { environment } from '../../../../../../environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  availableRoles: string[] = [];
  emailChecked = false;
  showPassword = false;
  isDarkTheme = false;

  email = '';
  password = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    // Проверяем сохранённую тему
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme === 'dark';
    this.applyTheme();

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      selectedRole: [null, Validators.required],
      rememberMe: [false]
    });

    // Загружаем сохраненные данные
    this.loadSavedCredentials();

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

  onPasswordFocus(): void {
    // Если email введен, но еще не проверен, проверяем его автоматически
    const email = this.loginForm.get('email')?.value;
    if (email && !this.emailChecked) {
      this.onEmailBlur();
    }
  }

  onEmailBlur(): void {
    const email = this.loginForm.get('email')?.value;
    if (email) {
      this.authService.checkEmailExists(email).subscribe({
        next: (res) => {
          this.emailChecked = true;
          this.availableRoles = res.roles || [];

          if (this.availableRoles.length === 1) {
            // Для пользователей с одной ролью: убираем валидацию и автоустанавливаем роль
            this.loginForm.get('selectedRole')?.setValidators([]);
            this.loginForm.get('selectedRole')?.setValue(this.availableRoles[0]);
            this.loginForm.get('selectedRole')?.updateValueAndValidity();
          } else if (this.availableRoles.length > 1) {
            // Для пользователей с несколькими ролями: восстанавливаем валидацию
            this.loginForm.get('selectedRole')?.setValidators([Validators.required]);
            this.loginForm.get('selectedRole')?.reset();
            this.loginForm.get('selectedRole')?.updateValueAndValidity();
          } else {
            // Для новых пользователей: восстанавливаем валидацию
            this.loginForm.get('selectedRole')?.setValidators([Validators.required]);
            this.loginForm.get('selectedRole')?.reset();
            this.loginForm.get('selectedRole')?.updateValueAndValidity();
          }
        },
        error: (err) => {
          if (!environment.production) {
            console.error('Erreur lors de la vérification de l\'email', err);
          }
        }
      });
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password, selectedRole } = this.loginForm.value;
      
      // Сохраняем данные если "Запомнить меня" включено
      this.saveCredentials();
      
      if (!environment.production) {
        console.log('Trying login with', this.loginForm.value);
      }
      this.authService.login(email, password).subscribe({
        next: (jwtResponse) => {
          // Сохраняем токены и пользователя
          this.authService.setTokens(jwtResponse);
          this.authService.setActiveRole(selectedRole);
          
          if (!environment.production) {
            console.log('[LoginComponent] JWT tokens received and saved');
          }
          
          if (selectedRole === 'student') {
            this.router.navigate(['/student/home']);
          } else if (selectedRole === 'teacher') {
            this.router.navigate(['/teacher/home']);
          } else if (selectedRole === 'admin') {
            this.router.navigate(['/admin/home']);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.notificationService.error(err.error?.message || 'Identifiants incorrects');
        }
      });
    }
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }

  private loadSavedCredentials(): void {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    const savedRole = localStorage.getItem('rememberedRole');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    if (savedEmail && rememberMe) {
      this.loginForm.patchValue({
        email: savedEmail,
        password: savedPassword || '',
        selectedRole: savedRole || null,
        rememberMe: rememberMe
      });
      
      // Проверяем роль для загруженного email
      if (savedEmail) {
        this.onEmailBlur();
      }
    }
  }

  private saveCredentials(): void {
    const formValue = this.loginForm.value;
    
    if (formValue.rememberMe) {
      localStorage.setItem('rememberedEmail', formValue.email);
      localStorage.setItem('rememberedPassword', formValue.password);
      localStorage.setItem('rememberedRole', formValue.selectedRole);
      localStorage.setItem('rememberMe', 'true');
    } else {
      // Очищаем сохраненные данные если "Запомнить меня" отключен
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      localStorage.removeItem('rememberedRole');
      localStorage.removeItem('rememberMe');
    }
  }

  getHintStyles(): any {
    if (this.isDarkTheme) {
      return {
        'color': '#4ecdc4',
        'text-shadow': '0 0 6px rgba(78, 205, 196, 0.6)',
        'font-weight': '600',
        'font-size': '10px'
      };
    }
    return {};
  }

  private applyTheme(): void {
    if (this.isDarkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}

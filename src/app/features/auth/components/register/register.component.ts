import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../services/notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../../../environment';
import { AnalyticsService } from '../../../../services/analytics.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  existingRoles: string[] = [];
  emailChecked: boolean = false;
  email = '';
  name = '';
  surname = '';
  password = '';
  role = '';
  showPassword = false;
  isDarkTheme = false;

  constructor(private fb: FormBuilder,
    private authService: AuthService,
    private api: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private analyticsService: AnalyticsService) { }

  ngOnInit(): void {
    // Проверяем сохранённую тему
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme === 'dark';
    this.applyTheme();

    this.registerForm = this.fb.group(
      {
        name: ['', Validators.required],
        surname: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required],
        isStudent: [false],
        isTeacher: [false]
      },
      {
        validators: [this.passwordsMatchValidator, this.exclusiveRoleValidator]
      }
    );
  }

  private updatePasswordValidators(): void {
    const passwordCtrl = this.registerForm.get('password');
    const confirmPasswordCtrl = this.registerForm.get('confirmPassword');
    if (this.emailChecked && this.existingRoles.length > 0) {
      passwordCtrl?.clearValidators();
      confirmPasswordCtrl?.clearValidators();
    } else {
      passwordCtrl?.setValidators(Validators.required);
      confirmPasswordCtrl?.setValidators(Validators.required);
    }
    passwordCtrl?.updateValueAndValidity();
    confirmPasswordCtrl?.updateValueAndValidity();
  }

  exclusiveRoleValidator(form: FormGroup) {
    const isStudent = form.get('isStudent')?.value;
    const isTeacher = form.get('isTeacher')?.value;

    const selectedRoles = [isStudent, isTeacher].filter(Boolean).length;
    return selectedRoles === 1 ? null : { roleSelectionInvalid: true };
  }


  passwordsMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  }


  onSubmit(): void {
    if (this.registerForm.valid) {
      const { email, password, isStudent, isTeacher, name, surname } = this.registerForm.value;

      const roles: string[] = [];
      if (isStudent) roles.push('student');
      if (isTeacher) roles.push('teacher');

      if (!environment.production) {
        console.log('[RegisterComponent] Sending registration request:', { email, roles });
      }

      this.api.register(email, password, roles, name, surname).subscribe({
        next: (jwtResponse) => {
          // Сохраняем токены
          this.api.setTokens(jwtResponse);
          
          // 🔑 GA4: Track registration event
          const primaryRole = roles[0] || 'student';
          this.analyticsService.trackRegistration('email', primaryRole as 'student' | 'teacher');
          
          if (jwtResponse.user.roles && jwtResponse.user.roles.length > 1) {
            const lastRole = roles.find(r => jwtResponse.user.roles.includes(r));
            const roleText = lastRole === 'teacher'
              ? 'enseignant sur la plateforme'
              : 'étudiant sur la plateforme';
            this.snackBar.open(`Vous êtes maintenant aussi ${roleText} ! Vous pouvez maintenant saisir vos identifiants et vous connecter.`, 'OK', {
              duration: 4000,
              panelClass: ['snackbar-success']
            });
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 4000);
            return;
          }
          this.snackBar.open('Veuillez vérifier votre boîte mail pour confirmer votre inscription.', 'Fermer', {
            duration: 6000,
            panelClass: ['snackbar-info']
          });
          this.router.navigate(['/register']);
        },
        error: (err) => {
          if (!environment.production) {
            console.error('[RegisterComponent] Registration failed:', err);
          }
          if (err.error?.message && err.error.message.includes('уже зарегистрированы с этой ролью')) {
            this.snackBar.open('Vous êtes déjà inscrit avec ce rôle.', 'OK', {
              duration: 6000,
              panelClass: ['snackbar-warning']
            });
          } else {
            this.notificationService.error(err.error?.message || 'Erreur lors de la création du compte');
          }
        }
      });
    } else {
      if (!environment.production) {
        console.warn('[RegisterComponent] Form is invalid:', this.registerForm.errors);
      }
    }
  }

  onEmailBlur(): void {
    const email = this.registerForm.get('email')?.value;
    if (!email || !this.registerForm.get('email')?.valid) return;

    this.authService.checkEmailExists(email).subscribe({
      next: (res) => {
        this.emailChecked = true;
        this.existingRoles = res.roles || [];
        this.updatePasswordValidators();

        // Отключаем выбор уже существующей роли
        if (this.existingRoles.includes('student')) {
          this.registerForm.get('isStudent')?.disable();
          this.registerForm.get('isTeacher')?.enable();
        } else if (this.existingRoles.includes('teacher')) {
          this.registerForm.get('isTeacher')?.disable();
          this.registerForm.get('isStudent')?.enable();
        } else {
          this.registerForm.get('isStudent')?.enable();
          this.registerForm.get('isTeacher')?.enable();
        }
      },
      error: (err) => {
        if (!environment.production) {
          console.warn('[RegisterComponent] Email check failed', err);
        }
        this.existingRoles = [];
      }
    });
  }

  loginWithProvider(provider: string) {
    window.location.href = `http://localhost:3001/auth/oauth/${provider}`;
  }

  showPasswordFields(): boolean {
    // Показываем поля для пароля только если email не найден в базе
    return !this.emailChecked || (this.emailChecked && this.existingRoles.length === 0);
  }

  toggleTheme(): void {
    if (!environment.production) {
      console.log('isDarkTheme:', this.isDarkTheme);
      console.log('body classes:', document.body.className);
    }
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }

  private applyTheme(): void {
    if (this.isDarkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}

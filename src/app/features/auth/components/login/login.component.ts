import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../services/notification.service';

// TODO : ajouter authentification à deux facteurs
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
    // on vérifie le thème sauvegardé
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme === 'dark';
    this.applyTheme();

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      selectedRole: [null, Validators.required]
    });

    // si l'admin entre son login, on définit directement le rôle et on supprime la validation
    this.loginForm.get('email')?.valueChanges.subscribe(email => {
      if (email === 'admin@admin.net') {
        this.loginForm.get('selectedRole')?.setValidators([]); // on supprime required
        this.loginForm.get('selectedRole')?.setValue('admin');
        this.loginForm.get('selectedRole')?.updateValueAndValidity();
      } else {
        this.loginForm.get('selectedRole')?.setValidators([Validators.required]); // on remet
        this.loginForm.get('selectedRole')?.setValue(null);
        this.loginForm.get('selectedRole')?.updateValueAndValidity();
      }
    });
  }

  // TODO : optimiser la vérification d'email avec debounce
  checkEmail(): void {
    if (!this.email || !this.email.includes('@')) {
      return;
    }

    this.authService.checkEmailExists(this.email).subscribe({
      next: (res: any) => {
        this.emailChecked = true;
        this.availableRoles = res.roles || [];
        this.loginForm.get('selectedRole')?.setValue(this.availableRoles[0]); // auto-définition
      },
      error: (err: any) => {
        this.loginForm.get('selectedRole')?.reset(); // on reset pour ne pas bloquer le bouton
        this.emailChecked = true;
        this.availableRoles = [];
        console.error('[LoginComponent] Erreur vérification email:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password, selectedRole } = this.loginForm.value;
      
      this.authService.login(email, password).subscribe({
        next: (user: any) => {
          this.authService.setUser(user);
          this.authService.setActiveRole(selectedRole);
          this.notificationService.success('Connexion réussie !');
          this.router.navigate(['/dashboard']);
        },
        error: (err: any) => {
          console.error('[LoginComponent] Erreur de connexion:', err);
          this.notificationService.error(err.error?.message || 'Erreur de connexion');
        }
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // TODO : synchroniser le thème avec les autres composants
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }

  // TODO : ajouter fonctionnalité "se souvenir de moi"
  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}

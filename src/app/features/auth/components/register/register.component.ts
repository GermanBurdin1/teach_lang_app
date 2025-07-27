import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../services/notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';

// TODO : ajouter validation en temps réel des mots de passe
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
    private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    // on vérifie le thème sauvegardé
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

  // TODO : améliorer la validation des rôles exclusifs
  exclusiveRoleValidator(form: FormGroup) {
    const isStudent = form.get('isStudent')?.value;
    const isTeacher = form.get('isTeacher')?.value;
    
    if (!isStudent && !isTeacher) {
      return { roleRequired: true };
    }
    
    if (isStudent && isTeacher) {
      return { exclusiveRole: true };
    }
    
    return null;
  }

  passwordsMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const formData = this.registerForm.value;
      const roles = [];
      
      if (formData.isStudent) roles.push('student');
      if (formData.isTeacher) roles.push('teacher');

      this.authService.register(formData.email, formData.password, roles, formData.name, formData.surname).subscribe({
        next: (response: any) => {
          this.notificationService.success('Inscription réussie ! Vérifiez votre email.');
          this.router.navigate(['/auth/verify-email']);
        },
        error: (err: any) => {
          console.error('[RegisterComponent] Erreur d\'inscription:', err);
          
          if (err.error?.message && err.error.message.includes('déjà inscrit avec ce rôle')) {
            this.notificationService.error('Vous êtes déjà inscrit avec ce rôle. Connectez-vous à la place.');
          } else {
            this.notificationService.error(err.error?.message || 'Erreur lors de l\'inscription');
          }
        }
      });
    }
  }

  // TODO : optimiser la vérification d'email avec debounce
  checkEmail(): void {
    if (!this.email || !this.email.includes('@')) {
      return;
    }

    this.authService.checkEmailExists(this.email).subscribe({
      next: (response: any) => {
        this.emailChecked = true;
        this.existingRoles = response.roles || [];
        this.updateFormValidation();
      },
      error: (err: any) => {
        console.error('[RegisterComponent] Erreur vérification email:', err);
        this.emailChecked = true;
        this.existingRoles = [];
        this.updateFormValidation();
      }
    });
  }

  private updateFormValidation(): void {
    // on désactive la sélection des rôles déjà existants
    if (this.existingRoles.includes('student')) {
      this.registerForm.get('isStudent')?.disable();
    }
    if (this.existingRoles.includes('teacher')) {
      this.registerForm.get('isTeacher')?.disable();
    }
  }

  get isPasswordFieldsVisible(): boolean {
    // on affiche les champs de mot de passe seulement si l'email n'est pas trouvé en base
    return this.emailChecked && this.existingRoles.length === 0;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // TODO : ajouter plus de thèmes disponibles
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }
}

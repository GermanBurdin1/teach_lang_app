import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { User } from '../../models/user.model';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test',
    surname: 'User',
    roles: ['student'],
  };

  const mockJwtResponse = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    user: mockUser,
    expires_in: 3600
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'register', 'checkEmailExists', 'setTokens'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['error']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      declarations: [RegisterComponent],
      imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCheckboxModule,
        MatSnackBarModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue('light');
    spyOn(localStorage, 'setItem');
    spyOn(document.body.classList, 'add');
    spyOn(document.body.classList, 'remove');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with validators', () => {
    component.ngOnInit();
    
    expect(component.registerForm).toBeDefined();
    expect(component.registerForm.get('name')?.hasError('required')).toBeTruthy();
    expect(component.registerForm.get('surname')?.hasError('required')).toBeTruthy();
    expect(component.registerForm.get('email')?.hasError('required')).toBeTruthy();
    expect(component.registerForm.get('password')?.hasError('required')).toBeTruthy();
    expect(component.registerForm.get('confirmPassword')?.hasError('required')).toBeTruthy();
  });

  it('should validate email format', () => {
    component.ngOnInit();
    const emailControl = component.registerForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should validate password confirmation match', () => {
    component.ngOnInit();
    const passwordControl = component.registerForm.get('password');
    const confirmPasswordControl = component.registerForm.get('confirmPassword');
    
    passwordControl?.setValue('password123');
    confirmPasswordControl?.setValue('password456');
    
    expect(component.registerForm.hasError('passwordsMismatch')).toBeTruthy();
    
    confirmPasswordControl?.setValue('password123');
    expect(component.registerForm.hasError('passwordsMismatch')).toBeFalsy();
  });

  it('should validate exclusive role selection', () => {
    component.ngOnInit();
    const isStudentControl = component.registerForm.get('isStudent');
    const isTeacherControl = component.registerForm.get('isTeacher');
    
    // No role selected
    isStudentControl?.setValue(false);
    isTeacherControl?.setValue(false);
    expect(component.registerForm.hasError('roleSelectionInvalid')).toBeTruthy();
    
    // Both roles selected
    isStudentControl?.setValue(true);
    isTeacherControl?.setValue(true);
    expect(component.registerForm.hasError('roleSelectionInvalid')).toBeTruthy();
    
    // One role selected
    isStudentControl?.setValue(true);
    isTeacherControl?.setValue(false);
    expect(component.registerForm.hasError('roleSelectionInvalid')).toBeFalsy();
  });

  it('should check email existence on blur', fakeAsync(() => {
    const mockResponse = { exists: true, roles: ['student'] };
    authService.checkEmailExists.and.returnValue(of(mockResponse));
    
    component.ngOnInit();
    component.registerForm.get('email')?.setValue('test@example.com');
    component.onEmailBlur();
    tick();
    
    expect(authService.checkEmailExists).toHaveBeenCalledWith('test@example.com');
    expect(component.emailChecked).toBeTruthy();
    expect(component.existingRoles).toEqual(['student']);
  }));

  it('should disable student role if already exists', fakeAsync(() => {
    const mockResponse = { exists: true, roles: ['student'] };
    authService.checkEmailExists.and.returnValue(of(mockResponse));
    
    component.ngOnInit();
    component.registerForm.get('email')?.setValue('test@example.com');
    component.onEmailBlur();
    tick();
    
    expect(component.registerForm.get('isStudent')?.disabled).toBeTruthy();
    expect(component.registerForm.get('isTeacher')?.disabled).toBeFalsy();
  }));

  it('should disable teacher role if already exists', fakeAsync(() => {
    const mockResponse = { exists: true, roles: ['teacher'] };
    authService.checkEmailExists.and.returnValue(of(mockResponse));
    
    component.ngOnInit();
    component.registerForm.get('email')?.setValue('test@example.com');
    component.onEmailBlur();
    tick();
    
    expect(component.registerForm.get('isTeacher')?.disabled).toBeTruthy();
    expect(component.registerForm.get('isStudent')?.disabled).toBeFalsy();
  }));

  it('should handle successful registration for new user', fakeAsync(() => {
    authService.register.and.returnValue(of(mockJwtResponse));
    
    component.ngOnInit();
    component.registerForm.patchValue({
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      isStudent: true,
      isTeacher: false
    });
    
    component.onSubmit();
    tick();
    
    expect(authService.register).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      ['student'],
      'Test',
      'User'
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      'Veuillez vérifier votre boîte mail pour confirmer votre inscription.',
      'Fermer',
      jasmine.any(Object)
    );
    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  }));

  it('should handle registration for existing user with new role', fakeAsync(() => {
    const userWithMultipleRoles = { ...mockUser, roles: ['student', 'teacher'] };
    const jwtResponseWithMultipleRoles = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      user: userWithMultipleRoles,
      expires_in: 3600
    };
    authService.register.and.returnValue(of(jwtResponseWithMultipleRoles));
    
    component.ngOnInit();
    component.registerForm.patchValue({
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      isStudent: false,
      isTeacher: true
    });
    
    component.onSubmit();
    tick(); // Дождемся первого асинхронного вызова
    
    expect(snackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('Vous êtes maintenant aussi enseignant'),
      'OK',
      jasmine.any(Object)
    );
    
    tick(4000); // Дождемся setTimeout(4000)
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('should handle registration error for existing role', fakeAsync(() => {
    const errorResponse = { 
      error: { message: 'уже зарегистрированы с этой ролью' } 
    };
    authService.register.and.returnValue(throwError(() => errorResponse));
    
    component.ngOnInit();
    component.registerForm.patchValue({
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      isStudent: true,
      isTeacher: false
    });
    
    component.onSubmit();
    tick();
    
    expect(snackBar.open).toHaveBeenCalledWith(
      'Vous êtes déjà inscrit avec ce rôle.',
      'OK',
      jasmine.any(Object)
    );
  }));

  it('should handle general registration error', fakeAsync(() => {
    const errorResponse = { error: { message: 'Server error' } };
    authService.register.and.returnValue(throwError(() => errorResponse));
    
    component.ngOnInit();
    component.registerForm.patchValue({
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      isStudent: true,
      isTeacher: false
    });
    
    component.onSubmit();
    tick();
    
    expect(notificationService.error).toHaveBeenCalledWith('Server error');
  }));

  it('should not submit when form is invalid', () => {
    component.ngOnInit();
    component.registerForm.patchValue({
      name: '',
      surname: '',
      email: 'invalid-email',
      password: 'password123',
      confirmPassword: 'different',
      isStudent: false,
      isTeacher: false
    });
    
    spyOn(console, 'warn');
    component.onSubmit();
    
    expect(authService.register).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('should show password fields for new email', () => {
    component.ngOnInit();
    component.emailChecked = false;
    component.existingRoles = [];
    
    expect(component.showPasswordFields()).toBeTruthy();
  });

  it('should hide password fields for existing email with roles', () => {
    component.ngOnInit();
    component.emailChecked = true;
    component.existingRoles = ['student'];
    
    expect(component.showPasswordFields()).toBeFalsy();
  });

  it('should show password fields for existing email without roles', () => {
    component.ngOnInit();
    component.emailChecked = true;
    component.existingRoles = [];
    
    expect(component.showPasswordFields()).toBeTruthy();
  });

  it('should toggle theme correctly', () => {
    component.ngOnInit();
    expect(component.isDarkTheme).toBeFalsy();
    
    component.toggleTheme();
    expect(component.isDarkTheme).toBeTruthy();
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(document.body.classList.add).toHaveBeenCalledWith('dark-theme');
    
    component.toggleTheme();
    expect(component.isDarkTheme).toBeFalsy();
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    expect(document.body.classList.remove).toHaveBeenCalledWith('dark-theme');
  });

  it('should apply dark theme on init if saved', () => {
    // Reset the spy and set new return value
    (window.localStorage.getItem as jasmine.Spy).and.returnValue('dark');
    
    // Create new component instance to trigger ngOnInit with new localStorage value
    const newFixture = TestBed.createComponent(RegisterComponent);
    const newComponent = newFixture.componentInstance;
    
    newComponent.ngOnInit();
    
    expect(newComponent.isDarkTheme).toBeTruthy();
    expect(document.body.classList.add).toHaveBeenCalledWith('dark-theme');
  });

  it('should handle email check error gracefully', fakeAsync(() => {
    authService.checkEmailExists.and.returnValue(throwError(() => new Error('Network error')));
    spyOn(console, 'warn');
    
    component.ngOnInit();
    component.registerForm.get('email')?.setValue('test@example.com');
    component.onEmailBlur();
    tick();
    
    expect(console.warn).toHaveBeenCalled();
    expect(component.existingRoles).toEqual([]);
  }));

  it('should not check email if email is invalid', () => {
    component.ngOnInit();
    component.registerForm.get('email')?.setValue('invalid-email');
    
    component.onEmailBlur();
    
    expect(authService.checkEmailExists).not.toHaveBeenCalled();
  });

  it('should not check email if email is empty', () => {
    component.ngOnInit();
    component.registerForm.get('email')?.setValue('');
    
    component.onEmailBlur();
    
    expect(authService.checkEmailExists).not.toHaveBeenCalled();
  });
}); 
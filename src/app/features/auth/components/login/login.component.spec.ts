import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { User } from '../../models/user.model';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test',
    surname: 'User',
    roles: ['student', 'teacher'],
  };

  const mockJwtResponse = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    user: mockUser,
    expires_in: 3600
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login', 'checkEmailExists', 'setUser', 'setActiveRole', 'setTokens'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['error']);

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatIconModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;

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
    
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.get('email')?.hasError('required')).toBeTruthy();
    expect(component.loginForm.get('password')?.hasError('required')).toBeTruthy();
    expect(component.loginForm.get('selectedRole')?.hasError('required')).toBeTruthy();
  });

  it('should validate email format', () => {
    component.ngOnInit();
    const emailControl = component.loginForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should handle admin email auto-role assignment', () => {
    component.ngOnInit();
    const emailControl = component.loginForm.get('email');
    const roleControl = component.loginForm.get('selectedRole');
    
    emailControl?.setValue('admin@admin.net');
    
    expect(roleControl?.value).toBe('admin');
    expect(roleControl?.hasError('required')).toBeFalsy();
  });

  it('should check email existence on blur', fakeAsync(() => {
    const mockResponse = { exists: true, roles: ['student', 'teacher'] };
    authService.checkEmailExists.and.returnValue(of(mockResponse));
    
    component.ngOnInit();
    component.loginForm.get('email')?.setValue('test@example.com');
    component.onEmailBlur();
    tick();
    
    expect(authService.checkEmailExists).toHaveBeenCalledWith('test@example.com');
    expect(component.emailChecked).toBeTruthy();
    expect(component.availableRoles).toEqual(['student', 'teacher']);
  }));

  it('should auto-select role when only one available', fakeAsync(() => {
    const mockResponse = { exists: true, roles: ['student'] };
    authService.checkEmailExists.and.returnValue(of(mockResponse));
    
    component.ngOnInit();
    component.loginForm.get('email')?.setValue('test@example.com');
    component.onEmailBlur();
    tick();
    
    expect(component.loginForm.get('selectedRole')?.value).toBe('student');
  }));

  it('should handle successful login for student', fakeAsync(() => {
    authService.login.and.returnValue(of(mockJwtResponse));
    
    component.ngOnInit();
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      selectedRole: 'student'
    });
    
    component.onSubmit();
    tick();
    
    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(authService.setTokens).toHaveBeenCalledWith(mockJwtResponse);
    expect(authService.setActiveRole).toHaveBeenCalledWith('student');
    expect(router.navigate).toHaveBeenCalledWith(['/student/home']);
  }));

  it('should handle successful login for teacher', fakeAsync(() => {
    authService.login.and.returnValue(of(mockJwtResponse));
    
    component.ngOnInit();
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      selectedRole: 'teacher'
    });
    
    component.onSubmit();
    tick();
    
    expect(router.navigate).toHaveBeenCalledWith(['/teacher/home']);
  }));

  it('should handle successful login for admin', fakeAsync(() => {
    authService.login.and.returnValue(of(mockJwtResponse));
    
    component.ngOnInit();
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
      selectedRole: 'admin'
    });
    
    component.onSubmit();
    tick();
    
    expect(router.navigate).toHaveBeenCalledWith(['/admin/home']);
  }));

  it('should handle login error', fakeAsync(() => {
    const errorResponse = { error: { message: 'Invalid credentials' } };
    authService.login.and.returnValue(throwError(() => errorResponse));
    
    component.ngOnInit();
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'wrongpassword',
      selectedRole: 'student'
    });
    
    component.onSubmit();
    tick();
    
    expect(notificationService.error).toHaveBeenCalledWith('Invalid credentials');
  }));

  it('should not submit when form is invalid', () => {
    component.ngOnInit();
    component.loginForm.patchValue({
      email: 'invalid-email',
      password: '',
      selectedRole: null
    });
    
    component.onSubmit();
    
    expect(authService.login).not.toHaveBeenCalled();
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
    (localStorage.getItem as jasmine.Spy).and.returnValue('dark');
    
    // Create new component instance to trigger ngOnInit with new localStorage value
    const newFixture = TestBed.createComponent(LoginComponent);
    const newComponent = newFixture.componentInstance;
    
    newComponent.ngOnInit();
    
    expect(newComponent.isDarkTheme).toBeTruthy();
  });

  it('should handle email check error gracefully', fakeAsync(() => {
    authService.checkEmailExists.and.returnValue(throwError(() => new Error('Network error')));
    spyOn(console, 'error');
    
    component.ngOnInit();
    component.loginForm.get('email')?.setValue('test@example.com');
    component.onEmailBlur();
    tick();
    
    expect(console.error).toHaveBeenCalled();
  }));
}); 
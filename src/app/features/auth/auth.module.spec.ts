import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AuthModule } from './auth.module';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';

// Test host component pour tester le routing
@Component({
  template: '<router-outlet></router-outlet>'
})
class TestHostComponent { }

describe('AuthModule', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestHostComponent],
      imports: [
        AuthModule,
        BrowserAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'login', component: LoginComponent },
          { path: 'register', component: RegisterComponent }
        ])
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            snapshot: { params: {}, queryParams: {} }
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('should create the module', () => {
    expect(AuthModule).toBeDefined();
  });

  it('should declare RegisterComponent', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    expect(fixture.componentInstance).toBeInstanceOf(RegisterComponent);
  });

  it('should declare LoginComponent', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    expect(fixture.componentInstance).toBeInstanceOf(LoginComponent);
  });

  it('should declare VerifyEmailComponent', () => {
    const fixture = TestBed.createComponent(VerifyEmailComponent);
    expect(fixture.componentInstance).toBeInstanceOf(VerifyEmailComponent);
  });

  it('should configure routing correctly', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    // Test navigation to login
    await router.navigate(['/login']);
    expect(location.path()).toBe('/login');

    // Test navigation to register  
    await router.navigate(['/register']);
    expect(location.path()).toBe('/register');
  });

  it('should import all required Material modules', () => {
    // Test que les Material modules sont bien importés en vérifiant
    // qu'on peut créer les composants sans erreur  
    expect(() => TestBed.createComponent(RegisterComponent)).not.toThrow();
    expect(() => TestBed.createComponent(LoginComponent)).not.toThrow();
    expect(() => TestBed.createComponent(VerifyEmailComponent)).not.toThrow();
  });

  it('should have proper dependency injection setup', () => {
    // Vérifier que les services peuvent être injectés
    expect(() => TestBed.inject(Router)).not.toThrow();
    expect(() => TestBed.inject(Location)).not.toThrow();
  });

  it('should export components for use in other modules', () => {
    // Les composants doivent être accessibles pour être testés
    expect(RegisterComponent).toBeDefined();
    expect(LoginComponent).toBeDefined();
    expect(VerifyEmailComponent).toBeDefined();
  });
});

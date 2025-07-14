import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { User } from '../features/auth/models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test',
    surname: 'User',
    roles: ['student', 'teacher'],
    currentRole: 'student'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Mock localStorage methods
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login user successfully', () => {
    const loginData = { email: 'test@example.com', password: 'password123' };
    
    service.login(loginData.email, loginData.password).subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne('http://localhost:3001/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(loginData);
    req.flush(mockUser);
  });

  it('should register user successfully', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      roles: ['student'],
      name: 'Test',
      surname: 'User'
    };
    
    service.register(
      registerData.email, 
      registerData.password, 
      registerData.roles, 
      registerData.name, 
      registerData.surname
    ).subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne('http://localhost:3001/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(registerData);
    req.flush(mockUser);
  });

  it('should check email existence', () => {
    const email = 'test@example.com';
    const mockResponse = { exists: true, roles: ['student'] };
    
    service.checkEmailExists(email).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`http://localhost:3001/auth/check-email?email=${email}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should set user and manage current role', () => {
    service.setUser(mockUser);
    
    expect(service.user).toEqual(mockUser);
    expect(service.currentRole).toBe('student');
    expect(localStorage.setItem).toHaveBeenCalledWith('currentUser', JSON.stringify(mockUser));
  });

  it('should set active role if user has that role', () => {
    service.setUser(mockUser);
    
    service.setActiveRole('teacher');
    
    expect(service.currentRole).toBe('teacher');
  });

  it('should logout user and clear localStorage', () => {
    service.setUser(mockUser);
    
    service.logout();
    
    expect(service.user).toBeNull();
    expect(service.currentRole).toBeNull();
  });

  it('should get user initial from email', () => {
    service.setUser(mockUser);
    
    const initial = service.getUserInitial();
    
    expect(initial).toBe('T'); // First letter of 'test' from test@example.com
  });
}); 
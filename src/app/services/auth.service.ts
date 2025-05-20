import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../features/auth/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  get user(): User | null {
    return this.userSubject.value;
  }

  get currentRole(): string | null {
    return this.user?.currentRole || null;
  }

  setUser(user: User): void {
    this.userSubject.next(user);
  }

  setActiveRole(role: string): void {
    const user = this.user;
    if (user && user.roles.includes(role)) {
      user.currentRole = role;
      this.userSubject.next({ ...user });
    }
  }

}

import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../models/user.model';

@Component({
  selector: 'app-role-select',
  templateUrl: './role-select.component.html'
})
export class RoleSelectComponent implements OnInit {
  user: User | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.authService.user;
  }

  choose(role: string): void {
    this.authService.setActiveRole(role);
    this.router.navigate(['/dashboard']);
  }
}

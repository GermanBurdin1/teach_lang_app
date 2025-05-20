import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;

  constructor(private fb: FormBuilder,
    private authService: AuthService,
    private router: Router) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
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
      const { email, password, isStudent, isTeacher } = this.registerForm.value;

      const roles: string[] = [];
      if (isStudent) roles.push('student');
      if (isTeacher) roles.push('teacher');

      const registrationData = { id: 'mock-id', email, password, roles };

      // Мокаем вход сразу
      this.authService.setUser(registrationData);

      if (roles.length === 1) {
        this.authService.setActiveRole(roles[0]);
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/select-role']);
      }
    }
  }


}

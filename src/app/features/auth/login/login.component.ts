import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  allowedRoles: string[] = ['student', 'school']; // Допустимые роли

  constructor() {}

  // Функция обработки логина
  login(role: string): void {
    if (role === 'student') {
      console.log('Логин как студент');
      // Обработка для студента
    } else if (role === 'school') {
      console.log('Логин как онлайн-школа');
      // Обработка для онлайн-школы
    }
  }

  // Функция для обработки формы
  onSubmit(): void {
    console.log(`Пользователь: ${this.email}, Пароль: ${this.password}`);
    // Логика для отправки данных формы
  }
}

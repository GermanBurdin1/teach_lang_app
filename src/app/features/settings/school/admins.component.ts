import { Component } from '@angular/core';

@Component({
  selector: 'app-admins',
  templateUrl: './admins.component.html',
  styleUrls: ['./admins.component.css']
})
export class AdminsComponent {
  showModal: boolean = false;
  newEmployee = { name: '', email: '' };
  permissions = [
    { name: 'Показатели', description: 'Доступ к странице «Показатели»', value: false },
    { name: 'Сообщения', description: 'Доступ к странице «Сообщения»', value: false },
    { name: 'Пользователи', description: 'Доступ к странице «Пользователи»', value: false },
    { name: 'Материалы', description: 'Доступ к странице «Материалы»', value: false },
    { name: 'Уроки', description: 'Доступ к странице «Уроки»', value: false },
    { name: 'Марафоны', description: 'Доступ к странице «Марафоны»', value: false },
    { name: 'Сквозной вход', description: 'Вход в аккаунты учителей', value: false },
    { name: 'История оплат', description: 'Доступ к странице «История оплат»', value: false }
  ];

  openAddEmployeeModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  addEmployee() {
    console.log('Employee added:', this.newEmployee, this.permissions);
    this.closeModal();
  }
}

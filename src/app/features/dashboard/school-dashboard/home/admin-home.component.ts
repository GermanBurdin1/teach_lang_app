import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationGuardService } from '../../../../services/navigation-guard.service';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent implements OnInit, OnDestroy {
  payments = [
    { user: 'Claire Martin', amount: 60, date: '2025-05-21' },
    { user: 'Thomas Moreau', amount: 90, date: '2025-05-20' }
  ];

  alerts = [
    '❗ Signalement: contenu inapproprié par un étudiant.',
    '💬 Message: demande de remboursement (M. Lefevre).'
  ];

  platformStats = {
    newStudents: 34,
    newTeachers: 7,
    lessonsHeld: 142
  };

  constructor(private navigationGuard: NavigationGuardService) {}

  ngOnInit(): void {
    // Активируем защиту навигации для личного кабинета
    this.navigationGuard.enableNavigationGuard();
  }

  ngOnDestroy(): void {
    // Отключаем защиту навигации при уходе с компонента
    this.navigationGuard.disableNavigationGuard();
  }
}

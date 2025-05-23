import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent implements OnInit {
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

  ngOnInit(): void {}
}

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.scss']
})
export class LessonManagementComponent implements OnInit {
  filter = 'future'; // 'past' | 'future' | 'requested'
  selectedTeacher: string | null = null;

  constructor() {}

  ngOnInit(): void {}
}

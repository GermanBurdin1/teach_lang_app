import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { ConstructorTypeSelectorComponent } from './constructor-type-selector/constructor-type-selector.component';
import { StudentMindmapComponent } from './student-mindmap/student-mindmap.component';

@Component({
  selector: 'app-mindmap-router',
  standalone: true,
  imports: [CommonModule, ConstructorTypeSelectorComponent, StudentMindmapComponent],
  template: `
    <app-constructor-type-selector *ngIf="isTeacher"></app-constructor-type-selector>
    <app-student-mindmap *ngIf="isStudent"></app-student-mindmap>
  `
})
export class MindmapRouterComponent implements OnInit {
  isTeacher = false;
  isStudent = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Проверяем путь - если это /mindmap, то студент, если /constructeurs - преподаватель
    const url = this.router.url;
    console.log('🔍 MindmapRouterComponent - URL:', url);
    
    if (url.includes('/constructeurs')) {
      // Это путь для преподавателей
      console.log('✅ Определен как преподаватель по URL');
      this.isTeacher = true;
    } else if (url.includes('/mindmap') && !url.includes('/constructeurs')) {
      // Это путь для студентов
      console.log('✅ Определен как студент по URL');
      this.isStudent = true;
    } else {
      // Fallback - проверяем роль пользователя
      const user = this.authService.getCurrentUser();
      const currentRole = this.authService.currentRole;
      console.log('🔍 Fallback - роль пользователя:', currentRole, 'user:', user);

      if (currentRole === 'student' || user?.roles?.includes('student')) {
        console.log('✅ Определен как студент по роли');
        this.isStudent = true;
      } else if (currentRole === 'teacher' || user?.roles?.includes('teacher')) {
        console.log('✅ Определен как преподаватель по роли');
        this.isTeacher = true;
      } else {
        // Default to teacher
        console.log('⚠️ Роль не определена, по умолчанию преподаватель');
        this.isTeacher = true;
      }
    }
    
    console.log('📊 Результат:', { isTeacher: this.isTeacher, isStudent: this.isStudent });
  }
}



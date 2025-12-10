import { Component, OnInit } from '@angular/core';
import { CourseService, Course } from '../../../services/course.service';
import { MatDialog } from '@angular/material/dialog';
import { CourseDetailsModalComponent, CourseDetailsModalData } from './course-details-modal/course-details-modal.component';
import { TeacherService } from '../../../services/teacher.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

interface CourseWithTeacher extends Course {
  teacherName?: string;
}

@Component({
  selector: 'app-student-courses',
  templateUrl: './student-courses.component.html',
  styleUrls: ['./student-courses.component.css']
})
export class StudentCoursesComponent implements OnInit {
  courses: CourseWithTeacher[] = [];
  courseSearchTerm = '';
  loading = false;

  constructor(
    private courseService: CourseService,
    private dialog: MatDialog,
    private teacherService: TeacherService
  ) { }

  ngOnInit(): void {
    this.loadAllCourses();
  }

  // Загрузка всех опубликованных курсов для студента
  loadAllCourses(): void {
    this.loading = true;
    this.courseService.getCoursesByTeacher().subscribe({
      next: (courses) => {
        // Фильтруем только опубликованные курсы
        const publishedCourses = courses.filter(course => course.isPublished);
        
        // Загружаем информацию о преподавателях для каждого курса
        this.loadTeacherNames(publishedCourses);
      },
      error: (error) => {
        console.error('Ошибка загрузки всех курсов:', error);
        this.courses = [];
        this.loading = false;
      }
    });
  }

  // Загрузка имен преподавателей для курсов
  loadTeacherNames(courses: Course[]): void {
    if (courses.length === 0) {
      this.courses = [];
      this.loading = false;
      return;
    }

    // Получаем уникальные teacherId
    const uniqueTeacherIds = [...new Set(courses.map(course => course.teacherId))];
    
    // Загружаем информацию о всех преподавателях параллельно
    const teacherRequests = uniqueTeacherIds.map(teacherId => 
      this.teacherService.getTeacherById(teacherId).pipe(
        map(teacher => ({
          id: teacherId,
          name: `${teacher.name} ${teacher.surname}`.trim() || 'Professeur'
        }))
      )
    );

    forkJoin(teacherRequests).subscribe({
      next: (teachers) => {
        // Создаем мапу teacherId -> teacherName
        const teacherMap = new Map<string, string>();
        teachers.forEach(teacher => {
          teacherMap.set(teacher.id, teacher.name);
        });

        // Добавляем имена преподавателей к курсам
        this.courses = courses.map(course => ({
          ...course,
          teacherName: teacherMap.get(course.teacherId) || 'Professeur'
        }));

        console.log('📚 Загружены все опубликованные курсы с именами преподавателей:', this.courses);
        this.loading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки имен преподавателей:', error);
        // В случае ошибки просто добавляем курсы без имен преподавателей
        this.courses = courses.map(course => ({
          ...course,
          teacherName: 'Professeur'
        }));
        this.loading = false;
      }
    });
  }

  // Получить отфильтрованные курсы по поисковому запросу
  get filteredCourses(): CourseWithTeacher[] {
    if (!this.courseSearchTerm) {
      return this.courses;
    }
    
    const searchLower = this.courseSearchTerm.toLowerCase();
    return this.courses.filter(course => {
      const titleMatch = course.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = course.description?.toLowerCase().includes(searchLower);
      const levelMatch = course.level?.toLowerCase().includes(searchLower);
      const teacherMatch = course.teacherName?.toLowerCase().includes(searchLower);
      return titleMatch || descriptionMatch || levelMatch || teacherMatch;
    });
  }

  // Просмотр деталей курса
  viewCourseDetails(courseId: number): void {
    console.log('📚 Загрузка деталей курса:', courseId);
    
    // Загружаем полную информацию о курсе
    this.courseService.getCourseById(courseId).subscribe({
      next: (course) => {
        console.log('📚 Загружен курс для просмотра:', course);
        
        // Открываем модальное окно с деталями курса
        const dialogRef = this.dialog.open(CourseDetailsModalComponent, {
          width: '900px',
          maxWidth: '90vw',
          data: { course } as CourseDetailsModalData,
          panelClass: 'course-details-dialog'
        });
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки деталей курса:', error);
        // TODO: Показать сообщение об ошибке пользователю
      }
    });
  }
}


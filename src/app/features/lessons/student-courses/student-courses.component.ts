import { Component, OnInit } from '@angular/core';
import { CourseService, Course } from '../../../services/course.service';
import { MatDialog } from '@angular/material/dialog';
import { CourseDetailsModalComponent, CourseDetailsModalData } from './course-details-modal/course-details-modal.component';

@Component({
  selector: 'app-student-courses',
  templateUrl: './student-courses.component.html',
  styleUrls: ['./student-courses.component.css']
})
export class StudentCoursesComponent implements OnInit {
  courses: Course[] = [];
  courseSearchTerm = '';
  loading = false;

  constructor(
    private courseService: CourseService,
    private dialog: MatDialog
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
        this.courses = courses.filter(course => course.isPublished);
        console.log('📚 Загружены все опубликованные курсы:', this.courses);
        this.loading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки всех курсов:', error);
        this.courses = [];
        this.loading = false;
      }
    });
  }

  // Получить отфильтрованные курсы по поисковому запросу
  get filteredCourses(): Course[] {
    if (!this.courseSearchTerm) {
      return this.courses;
    }
    
    const searchLower = this.courseSearchTerm.toLowerCase();
    return this.courses.filter(course => {
      const titleMatch = course.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = course.description?.toLowerCase().includes(searchLower);
      const levelMatch = course.level?.toLowerCase().includes(searchLower);
      return titleMatch || descriptionMatch || levelMatch;
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


import { Component, OnInit } from '@angular/core';
import { CourseService, Course } from '../../../services/course.service';

@Component({
  selector: 'app-student-courses',
  templateUrl: './student-courses.component.html',
  styleUrls: ['./student-courses.component.css']
})
export class StudentCoursesComponent implements OnInit {
  courses: Course[] = [];
  courseSearchTerm = '';
  loading = false;

  constructor(private courseService: CourseService) { }

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
    // Можно открыть модальное окно или перейти на страницу курса
    console.log('📚 Просмотр деталей курса:', courseId);
    // TODO: Реализовать просмотр деталей курса
    // Например, можно открыть модальное окно или перейти на страницу курса
  }
}


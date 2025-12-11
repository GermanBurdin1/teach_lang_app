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
  
  // Фильтры по цене
  maxPrice: number = 1000; // Максимальная цена по умолчанию для слайдера
  priceFilter: number = 1000; // Текущее значение фильтра (может быть любым)
  courseTypeFilter: 'all' | 'free' | 'paid' = 'all'; // Фильтр типа курсов: все, только бесплатные, только платные
  
  // Пагинация
  coursesPerPage: number = 3; // Количество курсов на странице (для теста)
  displayedCoursesCount: number = 3; // Количество отображаемых курсов (для теста)

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

        // Определяем максимальную цену для слайдера (только платные курсы)
        const prices = this.courses
          .map(course => {
            const coursePrice = course.price || 0;
            const isFree = course.isFree === true || (course.isFree === undefined && coursePrice === 0);
            return isFree ? 0 : coursePrice;
          })
          .filter(price => price > 0);
        if (prices.length > 0) {
          this.maxPrice = Math.max(...prices);
          this.priceFilter = this.maxPrice;
        } else {
          this.maxPrice = 1000;
          this.priceFilter = 1000;
        }
        
        console.log('💰 Максимальная цена для фильтра:', this.maxPrice);
        console.log('💰 Курсы с ценами:', this.courses.map(c => ({ title: c.title, price: c.price, isFree: c.isFree })));

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

  // Получить отфильтрованные курсы по поисковому запросу и цене
  get filteredCourses(): CourseWithTeacher[] {
    let filtered = this.courses;

    // Фильтр по поисковому запросу
    if (this.courseSearchTerm) {
      const searchLower = this.courseSearchTerm.toLowerCase();
      filtered = filtered.filter(course => {
        const titleMatch = course.title?.toLowerCase().includes(searchLower);
        const descriptionMatch = course.description?.toLowerCase().includes(searchLower);
        const levelMatch = course.level?.toLowerCase().includes(searchLower);
        const teacherMatch = course.teacherName?.toLowerCase().includes(searchLower);
        return titleMatch || descriptionMatch || levelMatch || teacherMatch;
      });
    }

    // Фильтр по типу курсов и цене
    filtered = filtered.filter(course => {
      const coursePrice = course.price || 0;
      const isFree = this.isCourseFree(course);
      
      // Фильтр по типу курсов
      if (this.courseTypeFilter === 'free') {
        // Показываем ТОЛЬКО бесплатные курсы
        return isFree;
      } else if (this.courseTypeFilter === 'paid') {
        // Показываем ТОЛЬКО платные курсы
        if (isFree) {
          return false;
        }
        // Фильтруем платные курсы по максимальной цене
        return coursePrice > 0 && coursePrice <= this.priceFilter;
      } else {
        // Показываем все курсы (и бесплатные, и платные)
        if (isFree) {
          return true; // Бесплатные курсы всегда показываем
        }
        // Платные курсы фильтруем по максимальной цене
        return coursePrice > 0 && coursePrice <= this.priceFilter;
      }
    });

    return filtered;
  }

  // Получить курсы для отображения (с учетом пагинации)
  get displayedCourses(): CourseWithTeacher[] {
    return this.filteredCourses.slice(0, this.displayedCoursesCount);
  }

  // Проверить, есть ли еще курсы для загрузки
  get hasMoreCourses(): boolean {
    return this.displayedCoursesCount < this.filteredCourses.length;
  }

  // Загрузить еще курсы
  loadMoreCourses(): void {
    this.displayedCoursesCount += this.coursesPerPage;
  }

  // Сбросить пагинацию при изменении фильтров
  resetPagination(): void {
    this.displayedCoursesCount = this.coursesPerPage;
  }

  // Получить цену курса для отображения
  getCoursePrice(course: CourseWithTeacher): string {
    const coursePrice = course.price || 0;
    const isFree = course.isFree || coursePrice === 0;
    
    if (isFree) {
      return 'Gratuit';
    }
    
    return `${coursePrice} ${course.currency || 'EUR'}`;
  }

  // Проверить, бесплатный ли курс
  isCourseFree(course: CourseWithTeacher): boolean {
    // Проверяем явный флаг isFree
    if (course.isFree === true) {
      return true;
    }
    // Если isFree явно false, курс платный
    if (course.isFree === false) {
      return false;
    }
    // Если флаг не установлен, проверяем цену
    const coursePrice = course.price || 0;
    return coursePrice === 0;
  }

  // Форматирование метки для слайдера цены
  formatPriceLabel(value: number): string {
    return `${value}`;
  }

  // Обработка изменения фильтра цены через поле ввода
  onPriceFilterChange(): void {
    // Валидация: цена не может быть отрицательной
    if (this.priceFilter < 0) {
      this.priceFilter = 0;
    }
    // Если цена больше максимальной среди курсов, обновляем maxPrice для слайдера
    if (this.priceFilter > this.maxPrice) {
      this.maxPrice = Math.ceil(this.priceFilter / 100) * 100; // Округляем до сотен
    }
    this.resetPagination();
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


import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Teacher } from './teacher.model';
import { TeacherService } from '../../services/teacher.service';
import { PageEvent } from '@angular/material/paginator';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-teacher-list',
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.css']
})
export class TeacherListComponent implements OnInit, OnDestroy {
  allTeachers: Teacher[] = [];
  experienceMin: number | null = null;
  experienceMax: number | null = null;
  priceMin: number | null = null;
  priceMax: number | null = null;
  selectedLanguage: string = '';
  availableLanguages: string[] = [];
  reviewMin: number | null = null;
  // Фильтры
  searchQuery = '';
  selectedSpecialization = '';
  sortOption = '';
  page = 1;
  limit = 10; // Показываем по 10 преподавателей на странице

  availableSpecializations: string[] = [];
  total = 0;
  isLoading = false;

  myTeachers: Teacher[] = [];
  showMyTeachers = false;

  // RxJS для оптимизации поиска
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private teacherService: TeacherService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('[TeacherListComponent] ngOnInit');
    this.initializeSearch();
    this.route.queryParams.subscribe(params => {
      console.log('[TeacherListComponent] queryParams', params);
      this.searchQuery = params['search'] || '';
      this.selectedSpecialization = params['specialization'] || '';
      this.sortOption = params['sort'] || '';
      this.page = +params['page'] || 1;
      this.priceMin = params['priceMin'] ? +params['priceMin'] : null;
      this.priceMax = params['priceMax'] ? +params['priceMax'] : null;
      this.experienceMin = params['experienceMin'] ? +params['experienceMin'] : null;
      this.experienceMax = params['experienceMax'] ? +params['experienceMax'] : null;
      this.selectedLanguage = params['language'] || '';
      this.reviewMin = params['reviewMin'] ? +params['reviewMin'] : null;

      this.loadTeachers();
      this.loadMyTeachers();
    });
  }

  private initializeSearch(): void {
    // Оптимизированный поиск с debounceTime для улучшения INP
    this.searchSubject$.pipe(
      debounceTime(500), // Ждем 500ms после последнего ввода
      distinctUntilChanged(), // Игнорируем повторяющиеся значения
      takeUntil(this.destroy$) // Отписываемся при уничтожении компонента
    ).subscribe(searchTerm => {
      this.searchQuery = searchTerm;
      this.page = 1; // Сбрасываем на первую страницу при поиске
      this.loadTeachers();
    });
  }

  ngOnDestroy(): void {
    // Отписываемся от всех подписок для предотвращения memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTeachers() {
    this.isLoading = true;
    console.log('[TeacherListComponent] loadTeachers called');
    const filters = {
      search: this.searchQuery,
      specialization: this.selectedSpecialization,
      priceMin: this.priceMin ?? undefined,
      priceMax: this.priceMax ?? undefined,
      experienceMin: this.experienceMin ?? undefined,
      experienceMax: this.experienceMax ?? undefined,
      language: this.selectedLanguage
    };
    console.log('[TeacherListComponent] loadTeachers filters', filters);
    // Загружаем всех преподавателей сразу
    this.teacherService.getTeachers(1, 9999, filters).subscribe(response => {
      console.log('[TeacherListComponent] Полученные преподаватели:', response.data);
      let teachers = response.data;
      if (this.sortOption === 'price') {
        teachers = teachers.slice().sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      }
      this.allTeachers = teachers;
      this.total = teachers.length; // Используем реальное количество преподавателей
      this.updateSpecializationOptions();
      this.isLoading = false;
    });
  }

  onSearchChange(): void {
    // Отправляем запрос в Subject для debounced обработки
    this.searchSubject$.next(this.searchQuery);
  }

  onFilterChange() {
    this.page = 1; // Сброс на первую страницу при изменении фильтров
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery || null,
        specialization: this.selectedSpecialization || null,
        sort: this.sortOption || null,
        page: 1,
        priceMin: this.priceMin ?? null,
        priceMax: this.priceMax ?? null,
        experienceMin: this.experienceMin ?? null,
        experienceMax: this.experienceMax ?? null,
        language: this.selectedLanguage || null,
      },
      queryParamsHandling: 'merge'
    });
  }

  updateSpecializationOptions() {
    const specs = new Set<string>();
    this.allTeachers.forEach(t => t.specializations.forEach(s => specs.add(s)));
    this.availableSpecializations = Array.from(specs);
  }

  onPageChange(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { 
        page: this.page,
        limit: this.limit
      },
      queryParamsHandling: 'merge'
    });
  }

  nextPage() {
    if (this.page < this.maxPage) {
      this.page++;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { page: this.page },
        queryParamsHandling: 'merge'
      });
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { page: this.page },
        queryParamsHandling: 'merge'
      });
    }
  }

  get maxPage(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  // Получаем преподавателей для текущей страницы
  get pagedTeachers(): Teacher[] {
    const start = (this.page - 1) * this.limit;
    const end = start + this.limit;
    return this.allTeachers.slice(start, end);
  }

  loadMyTeachers() {
    console.log('[TeacherListComponent] loadMyTeachers called');
    this.teacherService.getMyTeachersFromLessonService().subscribe(teachers => {
      console.log('[TeacherListComponent] Получены мои преподаватели:', teachers);
      this.myTeachers = teachers;
    });
  }
}

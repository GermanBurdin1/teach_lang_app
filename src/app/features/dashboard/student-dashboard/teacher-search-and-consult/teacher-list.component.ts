import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Teacher } from './teacher.model';
import { TeacherService } from './teacher.service';
import { MOCK_TEACHERS } from './mock-teachers';

@Component({
  selector: 'app-teacher-list',
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.css']
})
export class TeacherListComponent implements OnInit {
  allTeachers: Teacher[] = [];
  filteredTeachers: Teacher[] = [];
  paginatedTeachers: Teacher[] = [];
  experienceMin: number | null = null;
  experienceMax: number | null = null;
  priceMin: number | null = null;
  priceMax: number | null = null;
  selectedLanguage: string = '';
  availableLanguages: string[] = [];


  // Фильтры
  searchQuery = '';
  selectedSpecialization = '';
  sortOption = '';
  page = 1;
  limit = 6;

  availableSpecializations: string[] = [];
  total = 0;
  isLoading = false;

  constructor(
    private teacherService: TeacherService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.allTeachers = MOCK_TEACHERS;
    this.updateSpecializationOptions();
    this.availableLanguages = Array.from(
      new Set(
        this.allTeachers
          .flatMap(t => t.teachingLanguages || [])  // Защита от undefined
          .filter((lang): lang is string => typeof lang === 'string') // TS защита
      )
    );

    // 1. Подписка на query-параметры
    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['search'] || '';
      this.selectedSpecialization = params['specialization'] || '';
      this.sortOption = params['sort'] || '';
      this.page = +params['page'] || 1;
      this.priceMin = params['priceMin'] ? +params['priceMin'] : null;
      this.priceMax = params['priceMax'] ? +params['priceMax'] : null;
      this.experienceMin = params['experienceMin'] ? +params['experienceMin'] : null;
      this.experienceMax = params['experienceMax'] ? +params['experienceMax'] : null;
      this.selectedLanguage = params['language'] || '';
      this.applyFilters(false); // false => не обновлять URL при начальной загрузке

    });
  }

  updateSpecializationOptions() {
    const specs = new Set<string>();
    this.allTeachers.forEach(t => t.specializations.forEach(s => specs.add(s)));
    this.availableSpecializations = Array.from(specs);
  }

  applyFilters(updateQueryParams: boolean = true) {
  let result = [...this.allTeachers];

  // Поиск
  if (this.searchQuery.trim()) {
    const q = this.searchQuery.toLowerCase();
    result = result.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.specializations.some(s => s.toLowerCase().includes(q))
    );
  }

  // Специализация
  if (this.selectedSpecialization) {
    result = result.filter(t => t.specializations.includes(this.selectedSpecialization));
  }

  // Опыт
  if (this.experienceMin !== null) {
    result = result.filter(t => t.experienceYears >= this.experienceMin!);
  }
  if (this.experienceMax !== null) {
    result = result.filter(t => t.experienceYears <= this.experienceMax!);
  }

  // Цена
  if (this.priceMin !== null) {
    result = result.filter(t => t.price >= this.priceMin!);
  }
  if (this.priceMax !== null) {
    result = result.filter(t => t.price <= this.priceMax!);
  }

  // Язык
  if (this.selectedLanguage) {
    result = result.filter(t => t.teachingLanguages?.includes(this.selectedLanguage));
  }

  // Сортировка
  switch (this.sortOption) {
    case 'rating':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'price':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'experience':
      result.sort((a, b) => b.experienceYears - a.experienceYears);
      break;
  }

  // Только теперь сохраняем отфильтрованный результат
  this.filteredTeachers = result;
  this.total = result.length;
  this.updatePagination();

  // URL-синхронизация
  if (updateQueryParams) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery || null,
        specialization: this.selectedSpecialization || null,
        sort: this.sortOption || null,
        page: this.page !== 1 ? this.page : null,
        priceMin: this.priceMin ?? null,
        priceMax: this.priceMax ?? null,
        experienceMin: this.experienceMin ?? null,
        experienceMax: this.experienceMax ?? null,
        language: this.selectedLanguage || null
      },
      queryParamsHandling: 'merge'
    });
  }
}


  updatePagination() {
    const start = (this.page - 1) * this.limit;
    const end = start + this.limit;
    this.paginatedTeachers = this.filteredTeachers.slice(start, end);
  }

  nextPage() {
    if ((this.page * this.limit) < this.total) {
      this.page++;
      this.applyFilters();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.applyFilters();
    }
  }

  get maxPage(): number {
    return Math.ceil(this.total / this.limit);
  }
}

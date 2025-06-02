import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Teacher } from './teacher.model';
import { TeacherService } from '../../services/teacher.service';

@Component({
  selector: 'app-teacher-list',
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.css']
})
export class TeacherListComponent implements OnInit {
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
      this.reviewMin = params['reviewMin'] ? +params['reviewMin'] : null;

      this.loadTeachers();
    });
  }

  loadTeachers() {
    this.isLoading = true;

    const filters = {
      search: this.searchQuery,
      specialization: this.selectedSpecialization,
      priceMin: this.priceMin ?? undefined,
      priceMax: this.priceMax ?? undefined,
      experienceMin: this.experienceMin ?? undefined,
      experienceMax: this.experienceMax ?? undefined,
      language: this.selectedLanguage
    };

    this.teacherService.getTeachers(this.page, 9999, filters).subscribe(response => {
      console.log('📦 Полученные преподаватели:', response.data); // ⬅️ Вот сюда!
      this.allTeachers = response.data;
      this.total = response.total;
      this.updateSpecializationOptions();
      this.isLoading = false;
    });
  }

  onFilterChange() {
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

  nextPage() {
    if ((this.page * this.limit) < this.total) {
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
    return Math.ceil(this.total / this.limit);
  }
}

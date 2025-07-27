import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Teacher } from './teacher.model';
import { TeacherService } from '../../services/teacher.service';
import { PageEvent } from '@angular/material/paginator';

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
  // Filtres
  searchQuery = '';
  selectedSpecialization = '';
  sortOption = '';
  page = 1;
  limit = 10; // Afficher 10 enseignants par page

  availableSpecializations: string[] = [];
  total = 0;
  isLoading = false;

  myTeachers: Teacher[] = [];
  showMyTeachers = false;

  constructor(
    private teacherService: TeacherService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('[TeacherListComponent] ngOnInit');
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

  loadTeachers() {
    this.isLoading = true;
    console.log('[TeacherListComponent] loadTeachers appelé');
    const filters = {
      search: this.searchQuery,
      specialization: this.selectedSpecialization,
      priceMin: this.priceMin ?? undefined,
      priceMax: this.priceMax ?? undefined,
      experienceMin: this.experienceMin ?? undefined,
      experienceMax: this.experienceMax ?? undefined,
      language: this.selectedLanguage
    };
    console.log('[TeacherListComponent] loadTeachers filtres', filters);
    // Charger tous les enseignants d'un coup
    this.teacherService.getTeachers(1, 9999, filters).subscribe(response => {
      console.log('[TeacherListComponent] Enseignants reçus:', response.data);
      let teachers = response.data;
      if (this.sortOption === 'price') {
        teachers = teachers.slice().sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      }
      this.allTeachers = teachers;
      this.total = teachers.length; // Utiliser le nombre réel d'enseignants
      this.updateSpecializationOptions();
      this.isLoading = false;
    });
  }

  onFilterChange() {
    this.page = 1; // Remise à la première page lors du changement de filtres
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

  // Obtenir les enseignants pour la page actuelle
  get pagedTeachers(): Teacher[] {
    const start = (this.page - 1) * this.limit;
    const end = start + this.limit;
    return this.allTeachers.slice(start, end);
  }

  loadMyTeachers() {
    console.log('[TeacherListComponent] loadMyTeachers appelé');
    this.teacherService.getMyTeachersFromLessonService().subscribe(teachers => {
      console.log('[TeacherListComponent] Mes enseignants reçus:', teachers);
      this.myTeachers = teachers;
    });
  }
}

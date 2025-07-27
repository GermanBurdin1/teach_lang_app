import { Component, OnInit } from '@angular/core';
import { AdminTeacher } from './admin-teacher.model';
import { AdminTeacherService } from './admin-teacher.service';

// TODO : ajouter filtres et recherche pour la liste des enseignants
@Component({
  selector: 'app-admin-teachers-list',
  templateUrl: './admin-teachers-list.component.html',
  styleUrls: ['./admin-teachers-list.component.css']
})
export class AdminTeachersListComponent implements OnInit {
  teachers: AdminTeacher[] = [];
  total = 0;
  page = 1;
  limit = 6;
  isLoading = false;

  constructor(private adminTeacherService: AdminTeacherService) {}

  ngOnInit(): void {
    this.loadTeachers();
  }

  // TODO : optimiser le chargement avec virtualisation
  loadTeachers() {
    this.isLoading = true;
    this.adminTeacherService.getTeachers(this.page, this.limit).subscribe({
      next: (res: { data: AdminTeacher[], total: number }) => {
        this.teachers = res.data;
        this.total = res.total;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('[AdminTeachersList] Erreur lors du chargement:', err);
        this.isLoading = false;
      }
    });
  }

  nextPage() {
    if ((this.page * this.limit) < this.total) {
      this.page++;
      this.loadTeachers();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadTeachers();
    }
  }

  get maxPage(): number {
    return Math.ceil(this.total / this.limit);
  }
}

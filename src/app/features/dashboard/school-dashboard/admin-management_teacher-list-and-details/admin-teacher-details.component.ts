import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminTeacherService } from './admin-teacher.service';
import { AdminTeacher } from './admin-teacher.model';
import { MOCK_REVIEWS } from './mock-reviews';

@Component({
  selector: 'app-admin-teacher-details',
  templateUrl: './admin-teacher-details.component.html',
  styleUrls: ['./admin-teacher-details.component.css']
})
export class AdminTeacherDetailsComponent implements OnInit {
  teacher: AdminTeacher | null = null;
  reviews = MOCK_REVIEWS;

  constructor(
    private route: ActivatedRoute,
    private teacherService: AdminTeacherService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.teacherService.getTeacherById(id).subscribe(t => {
        this.teacher = t || null;
      });
    }

    const saved = localStorage.getItem('adminTeacherReviews');
    if (saved) {
      this.reviews = JSON.parse(saved);
    } else {
      this.reviews = MOCK_REVIEWS;
      this.saveReviewsToLocalStorage(); // Сохраняем первый раз
    }
  }

  getFormattedDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  removeReview(id: string): void {
    this.reviews = this.reviews.filter(r => r.id !== id);
    this.saveReviewsToLocalStorage();
  }

  private saveReviewsToLocalStorage(): void {
    localStorage.setItem('adminTeacherReviews', JSON.stringify(this.reviews));
  }


}

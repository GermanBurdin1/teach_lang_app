import { Component, OnInit } from '@angular/core';
import { TeacherProfileService } from '../teacher-profile.service';
import { TeacherProfile } from '../teacher-profile.model';
import { Review } from '../../shared/models/review.model';
import { MOCK_REVIEWS } from '../mock-reviews';

@Component({
  selector: 'app-teacher-dashboard-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class TeacherDashboardOverviewComponent implements OnInit {
  profile: TeacherProfile | null = null;
  reviews: Review[] = [];

  constructor(private profileService: TeacherProfileService) { }

  ngOnInit(): void {
    this.profileService.getTeacherProfile().subscribe((data) => {
      this.profile = data;
    });

    const stored = localStorage.getItem('teacher_reviews');
    this.reviews = stored ? JSON.parse(stored) : MOCK_REVIEWS;
  }

}

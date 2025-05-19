import { Component, OnInit } from '@angular/core';
import { TeacherProfileService } from '../teacher-profile.service';
import { TeacherProfile } from '../teacher-profile.model';

@Component({
  selector: 'app-teacher-dashboard-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class TeacherDashboardOverviewComponent implements OnInit {
  profile: TeacherProfile | null = null;

  constructor(private profileService: TeacherProfileService) {}

  ngOnInit(): void {
    this.profileService.getTeacherProfile().subscribe((data) => {
      this.profile = data;
    });
  }
}

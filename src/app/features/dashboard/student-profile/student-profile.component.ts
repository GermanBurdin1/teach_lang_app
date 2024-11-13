import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-profile',
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.css']
})
export class StudentProfileComponent {

  isEditModalOpen = false;
  studentData: any;
  studentId: number | null = null;


  constructor(private route: ActivatedRoute, private router: Router) {

  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId = Number(id); // Сохраните id, если нужно
      this.loadStudentData();
    }
  }

  loadStudentData(): void {
    const savedStudents = localStorage.getItem('students');
    if (savedStudents) {
      const students = JSON.parse(savedStudents);
      this.studentData = students.find((student: any) => student.id === this.studentId);
    }
  }

  openEditModal(): void {
    this.isEditModalOpen = true;
  }

  navigateBack() {
    this.router.navigate(['/student-dashboard/users']);
  }

  showStatisticsModal = false;

  downloadStatistics() {
    this.showStatisticsModal = true;
  }

  closeStatisticsModal() {
    this.showStatisticsModal = false;
  }

}

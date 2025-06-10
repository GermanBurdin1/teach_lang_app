import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../services/teacher.service';
import { TeacherDetails } from './teacher-details.model';
import { Review } from '../dashboard/shared/models/review.model';
import { AuthService } from '../../services/auth.service';
import { LessonService } from '../../services/lesson.service';

@Component({
  selector: 'app-teacher-details',
  templateUrl: './teacher-details.component.html',
  styleUrls: ['./teacher-details.component.css']
})
export class TeacherDetailsComponent implements OnInit {
  teacher: TeacherDetails | null = null;

  constructor(
    private route: ActivatedRoute,
    private teacherService: TeacherService,
    private authService: AuthService,
    private lessonService: LessonService
  ) { }

  messageText: string = '';
  selectedDate: Date = new Date();
  selectedTime: Date = new Date();
  reviews: Review[] = [];
  showMessageModal = false;
  showBookingModal = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.teacherService.getTeacherById(id).subscribe(data => {
        this.teacher = data || null;
      });
      this.teacherService.getReviewsByTeacher(id).subscribe(reviews => {
        this.reviews = reviews;
      });
    }
  }


  openMessageModal() {
    this.showMessageModal = true;
  }

  closeMessageModal() {
    this.showMessageModal = false;
  }

  sendMessage(message: string) {
    // Тут будет отправка на backend
    console.log('Message sent:', message);
    this.closeMessageModal();
  }


  openBookingModal() {
    this.showBookingModal = true;
  }

  closeBookingModal() {
    this.showBookingModal = false;
  }

  confirmBooking() {
    const bookedDateTime = new Date(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth(),
      this.selectedDate.getDate(),
      this.selectedTime.getHours(),
      this.selectedTime.getMinutes()
    );

    const studentId = this.authService.getCurrentUser()?.id;
    const teacherId = this.teacher?.id;

    if (!studentId || !teacherId) return;

    this.lessonService.requestBooking({
      studentId: studentId,
      teacherId: teacherId,
      scheduledAt: bookedDateTime.toISOString()
    }).subscribe(() => {
      this.closeBookingModal();
      alert('✅ Votre demande a été envoyée à l’enseignant.');
    });
  }

}

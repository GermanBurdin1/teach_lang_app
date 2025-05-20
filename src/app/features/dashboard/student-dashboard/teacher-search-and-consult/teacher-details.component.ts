import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeacherService } from './teacher.service';
import { TeacherDetails } from './teacher-details.model';
import { MOCK_REVIEWS } from './mock-reviews';

@Component({
  selector: 'app-teacher-details',
  templateUrl: './teacher-details.component.html',
  styleUrls: ['./teacher-details.component.css']
})
export class TeacherDetailsComponent implements OnInit {
  teacher: TeacherDetails | null = null;
  reviews = MOCK_REVIEWS;

  constructor(
    private route: ActivatedRoute,
    private teacherService: TeacherService
  ) {}

  messageText: string = '';        // ← для формы отправки сообщения
  selectedDate: Date = new Date();
  selectedTime: Date = new Date();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.teacherService.getTeacherById(id).subscribe(data => {
        this.teacher = data || null;
      });
    }
  }

  showMessageModal = false;

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

showBookingModal = false;

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

  console.log('Занятие забронировано на:', bookedDateTime);
  this.closeBookingModal();
}


}

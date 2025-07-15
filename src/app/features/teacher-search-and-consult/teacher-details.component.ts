import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../services/teacher.service';
import { TeacherDetails } from './teacher-details.model';
import { Review } from '../dashboard/shared/models/review.model';
import { AuthService } from '../../services/auth.service';
import { LessonService, TeacherTimeSlot } from '../../services/lesson.service';
import { NotificationService } from '../../services/notification.service';
import { PaymentService } from '../../services/payment.service';

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
    private lessonService: LessonService,
    private notificationService: NotificationService,
    private paymentService: PaymentService
  ) { }

  messageText: string = '';
  selectedDate: Date = new Date();
  selectedTime: string = '';
  teacherSchedule: TeacherTimeSlot[] = [];
  reviews: Review[] = [];
  showMessageModal = false;
  showBookingModal = false;
  showPaymentModal = false;
  lessonDuration: number = 60; // в минутах

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
    this.loadAvailableSlots();
  }

  onDateChange() {
    this.selectedTime = '';
    this.loadAvailableSlots();
  }

  loadAvailableSlots() {
    if (!this.teacher?.id) return;
    
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    this.lessonService.getAvailableSlots(this.teacher.id, dateStr).subscribe({
      next: (slots) => {
        // Фильтруем прошедшие слоты
        const now = new Date();
        const currentDate = this.selectedDate.toDateString();
        const todayDate = now.toDateString();
        
        if (currentDate === todayDate) {
          // Если выбран сегодняшний день, фильтруем прошедшие часы
          this.teacherSchedule = slots.filter(slot => {
            const [hours, minutes] = slot.time.split(':').map(Number);
            const slotDateTime = new Date(
              this.selectedDate.getFullYear(),
              this.selectedDate.getMonth(),
              this.selectedDate.getDate(),
              hours,
              minutes
            );
            return slotDateTime > now;
          });
        } else {
          // Если выбран не сегодняшний день, показываем все слоты
          this.teacherSchedule = slots;
        }
        
        console.log('✅ Planning du professeur chargé (filtré):', this.teacherSchedule);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du planning:', error);
        this.teacherSchedule = [];
      }
    });
  }

  selectTimeSlot(time: string) {
    this.selectedTime = time;
  }

  // Методы для шаблона
  hasAvailableSlots(): boolean {
    return this.teacherSchedule.length > 0 && this.teacherSchedule.some(s => s.available);
  }

  hasNoAvailableSlots(): boolean {
    return this.teacherSchedule.length > 0 && !this.teacherSchedule.some(s => s.available);
  }

  getAvailableIntervals(): TeacherTimeSlot[] {
    return this.teacherSchedule.filter((slot, i) => 
      slot.available && 
      slot.interval && 
      (!this.teacherSchedule[i-1] || !this.teacherSchedule[i-1].available)
    );
  }

  closeBookingModal() {
    this.showBookingModal = false;
  }

  confirmBooking() {
    console.log('🔍 confirmBooking() вызван');
    console.log('🔍 selectedTime:', this.selectedTime);
    console.log('🔍 selectedDate:', this.selectedDate);
    
    if (!this.selectedTime) {
      this.notificationService.warning('Veuillez sélectionner un créneau horaire.');
      return;
    }

    const [hours, minutes] = this.selectedTime.split(':').map(Number);
    const bookedDateTime = new Date(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth(),
      this.selectedDate.getDate(),
      hours,
      minutes
    );

    // Проверка, что время не в прошлом
    const now = new Date();
    if (bookedDateTime <= now) {
      this.notificationService.warning('Impossible de réserver un créneau dans le passé. Veuillez choisir un horaire futur.');
      return;
    }

    // Вместо прямой отправки запроса на бронирование, открываем модальное окно оплаты
    console.log('🔍 Закрываем модальное окно бронирования');
    this.closeBookingModal();
    console.log('🔍 Открываем модальное окно оплаты');
    this.showPaymentModal = true;
    console.log('🔍 showPaymentModal =', this.showPaymentModal);
  }

  onPaymentSuccess(paymentData: any) {
    // После успешной оплаты создаем бронирование
    const studentId = this.authService.getCurrentUser()?.id;
    const teacherId = this.teacher?.id;

    if (!studentId || !teacherId) return;

    const [hours, minutes] = this.selectedTime.split(':').map(Number);
    const bookedDateTime = new Date(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth(),
      this.selectedDate.getDate(),
      hours,
      minutes
    );

    this.lessonService.requestBooking({
      studentId: studentId,
      teacherId: teacherId,
      scheduledAt: bookedDateTime.toISOString(),
      paymentId: paymentData.paymentId // Добавляем ID платежа
    }).subscribe({
      next: () => {
        this.notificationService.success('Votre réservation a été confirmée et payée avec succès!');
        this.showPaymentModal = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors de la réservation après paiement:', error);
        let errorMessage = 'Une erreur est survenue lors de la confirmation de votre réservation.';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.notificationService.error(errorMessage);
      }
    });
  }

  onPaymentCancel() {
    this.showPaymentModal = false;
  }

}

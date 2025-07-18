import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { PaymentService, CreatePaymentIntentDto, ConfirmPaymentDto } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { TeacherDetails } from './teacher-details.model';

declare var Stripe: any;

@Component({
  selector: 'app-payment-modal',
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.css'],
  standalone: false
})
export class PaymentModalComponent implements OnInit {
  @Input() teacher: TeacherDetails | null = null;
  @Input() selectedDate: Date = new Date();
  @Input() selectedTime: string = '';
  @Input() lessonDuration: number = 60; // в минутах
  @Output() paymentSuccess = new EventEmitter<any>();
  @Output() paymentCancel = new EventEmitter<void>();

  showPaymentModal = false;
  isLoading = false;
  paymentProcessing = false;
  
  // Stripe
  stripe: any;
  elements: any;
  cardElement: any;
  
  // Payment data
  paymentIntent: any = null;
  clientSecret: string = '';
  paymentId: string = '';

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    console.log('🔍 PaymentModal: ngOnInit() вызван');
    // Автоматически открываем модальное окно при инициализации
    this.showPaymentModal = true;
    console.log('🔍 PaymentModal: showPaymentModal установлен в true');
    this.initializeStripe();
    // Вызываем createPaymentIntent после инициализации
    setTimeout(() => {
      this.createPaymentIntent();
    }, 500);
  }

  initializeStripe() {
    console.log('🔍 PaymentModal: initializeStripe() вызван');
    // Инициализация Stripe
    this.stripe = Stripe('pk_test_51Qb3cWGaUr31i20XRiurDRW2WZzxuaFCQWTHQGzPbFqUOzha4GBz3jIHTLHChC9o7E3aflhABxcRLWYSswDLzQrq00QqZAFkCO');
    this.elements = this.stripe.elements();
    
    // Создаем элемент карты
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#9e2146',
        },
      },
    });
    
    console.log('🔍 PaymentModal: Stripe инициализирован');
  }

  openPaymentModal() {
    console.log('🔍 PaymentModal: openPaymentModal() вызван');
    this.showPaymentModal = true;
    console.log('🔍 PaymentModal: showPaymentModal =', this.showPaymentModal);
    this.createPaymentIntent();
  }

  ngAfterViewInit() {
    console.log('🔍 PaymentModal: ngAfterViewInit() вызван');
    // Монтируем карту после инициализации компонента
    setTimeout(() => {
      if (this.cardElement) {
        this.cardElement.mount('#card-element');
        console.log('🔍 PaymentModal: Карта смонтирована');
      } else {
        console.error('❌ cardElement не найден');
      }
    }, 100);
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.paymentCancel.emit();
  }

  createPaymentIntent() {
    console.log('🔍 PaymentModal: createPaymentIntent() вызван');
    console.log('🔍 teacher:', this.teacher);
    console.log('🔍 selectedTime:', this.selectedTime);
    console.log('🔍 selectedDate:', this.selectedDate);
    console.log('🔍 lessonDuration:', this.lessonDuration);
    
    if (!this.teacher || !this.selectedTime) {
      console.error('❌ Informations de réservation manquantes');
      console.error('❌ teacher:', this.teacher);
      console.error('❌ selectedTime:', this.selectedTime);
      this.notificationService.error('Informations de réservation manquantes');
      return;
    }

    this.isLoading = true;
    
    const currentUser = this.authService.getCurrentUser();
    console.log('🔍 currentUser:', currentUser);
    
    if (!currentUser) {
      console.error('❌ Utilisateur non connecté');
      this.notificationService.error('Utilisateur non connecté');
      return;
    }

    const amount = this.teacher.price * (this.lessonDuration / 60); // Цена за час * продолжительность в часах
    console.log('🔍 amount:', amount);
    console.log('🔍 teacher.price:', this.teacher.price);
    console.log('🔍 lessonDuration:', this.lessonDuration);
    
    const paymentData: CreatePaymentIntentDto = {
      userId: currentUser.id,
      amount: amount,
      currency: 'eur',
      description: `Cours avec ${this.teacher.name} - ${this.selectedDate.toLocaleDateString()} ${this.selectedTime}`,
      metadata: {
        teacherId: this.teacher.id,
        teacherName: this.teacher.name,
        lessonDate: this.selectedDate.toISOString(),
        lessonTime: this.selectedTime,
        lessonDuration: this.lessonDuration
      }
    };
    
    console.log('🔍 paymentData:', paymentData);

    this.paymentService.createPaymentIntent(paymentData).subscribe({
      next: (response) => {
        console.log('✅ Payment intent создан:', response);
        this.paymentIntent = response;
        this.clientSecret = response.clientSecret;
        this.paymentId = response.paymentId;
        this.isLoading = false;
        
        // Рендерим элемент карты после получения client secret
        setTimeout(() => {
          this.cardElement.mount('#card-element');
          console.log('🔍 Карта смонтирована');
        }, 100);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du paiement:', error);
        console.error('❌ Error details:', error.error);
        this.notificationService.error('Erreur lors de la création du paiement');
        this.isLoading = false;
      }
    });
  }

  async processPayment() {
    console.log('🔍 PaymentModal: processPayment() вызван');
    console.log('🔍 clientSecret:', this.clientSecret ? 'present' : 'missing');
    console.log('🔍 cardElement:', this.cardElement ? 'present' : 'missing');
    
    if (!this.clientSecret) {
      console.error('❌ Informations de paiement manquantes - clientSecret отсутствует');
      this.notificationService.error('Informations de paiement manquantes');
      return;
    }

    this.paymentProcessing = true;
    console.log('🔍 Начинаем обработку платежа...');

    try {
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(this.clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            name: this.authService.getCurrentUser()?.name || '',
            email: this.authService.getCurrentUser()?.email || ''
          }
        }
      });

      console.log('🔍 Stripe response:', { error, paymentIntent });

      if (error) {
        console.error('❌ Erreur de paiement:', error);
        this.notificationService.error(`Erreur de paiement: ${error.message}`);
        this.paymentProcessing = false;
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Платеж успешен через Stripe');
        
        // Подтверждаем платеж на бэкенде для обновления статуса в БД
        const confirmData: ConfirmPaymentDto = {
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentIntent.payment_method
        };

        this.paymentService.confirmPayment(confirmData).subscribe({
          next: () => {
            console.log('✅ Платеж подтвержден на бэкенде');
            this.notificationService.success('Paiement réussi! Votre réservation a été confirmée.');
            this.paymentSuccess.emit({
              paymentId: this.paymentId,
              paymentIntent: paymentIntent
            });
            this.closePaymentModal();
          },
          error: (error) => {
            console.error('❌ Erreur lors de la confirmation:', error);
            // Даже если подтверждение на бэкенде не удалось, платеж уже прошел через Stripe
            this.notificationService.success('Paiement réussi! Votre réservation a été confirmée.');
            this.paymentSuccess.emit({
              paymentId: this.paymentId,
              paymentIntent: paymentIntent
            });
            this.closePaymentModal();
          },
          complete: () => {
            this.paymentProcessing = false;
          }
        });
      } else {
        console.log('⚠️ Платеж требует дополнительных действий:', paymentIntent.status);
        this.notificationService.warning('Le paiement nécessite une action supplémentaire');
        this.paymentProcessing = false;
      }
    } catch (error) {
      console.error('❌ Erreur lors du traitement du paiement:', error);
      this.notificationService.error('Erreur lors du traitement du paiement');
      this.paymentProcessing = false;
    }
  }

  getTotalAmount(): number {
    if (!this.teacher) return 0;
    return this.teacher.price * (this.lessonDuration / 60);
  }

  getLessonDurationText(): string {
    if (this.lessonDuration === 60) return '1 heure';
    return `${this.lessonDuration} minutes`;
  }

  testPayment() {
    console.log('🔍 PaymentModal: testPayment() вызван');
    this.notificationService.success('Тестовый платеж успешен!');
    this.paymentSuccess.emit({
      paymentId: 'test-payment-id',
      paymentIntent: { id: 'test-intent-id' }
    });
    this.closePaymentModal();
  }
} 
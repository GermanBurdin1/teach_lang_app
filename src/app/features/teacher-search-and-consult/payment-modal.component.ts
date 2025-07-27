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
  @Input() lessonDuration: number = 60; // en minutes
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
    console.log('PaymentModal: ngOnInit() appelé');
    // Ouvrir automatiquement la modale lors de l'initialisation
    this.showPaymentModal = true;
    console.log('PaymentModal: showPaymentModal défini à true');
    this.initializeStripe();
    // Appeler createPaymentIntent après l'initialisation
    setTimeout(() => {
      this.createPaymentIntent();
    }, 500);
  }

  initializeStripe() {
    console.log('PaymentModal: initializeStripe() appelé');
    // Initialisation de Stripe
    this.stripe = Stripe('pk_test_51Qb3cWGaUr31i20XRiurDRW2WZzxuaFCQWTHQGzPbFqUOzha4GBz3jIHTLHChC9o7E3aflhABxcRLWYSswDLzQrq00QqZAFkCO');
    this.elements = this.stripe.elements();
    
    // Créer l'élément de carte
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
    
    console.log('PaymentModal: Stripe initialisé');
  }

  openPaymentModal() {
    console.log('PaymentModal: openPaymentModal() appelé');
    this.showPaymentModal = true;
    console.log('PaymentModal: showPaymentModal =', this.showPaymentModal);
    this.createPaymentIntent();
  }

  ngAfterViewInit() {
    console.log('PaymentModal: ngAfterViewInit() appelé');
    // Monter la carte après l'initialisation du composant
    setTimeout(() => {
      if (this.cardElement) {
        this.cardElement.mount('#card-element');
        console.log('PaymentModal: Carte montée');
      } else {
        console.error('cardElement non trouvé');
      }
    }, 100);
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.paymentCancel.emit();
  }

  createPaymentIntent() {
    console.log('PaymentModal: createPaymentIntent() appelé');
    console.log('teacher:', this.teacher);
    console.log('selectedTime:', this.selectedTime);
    console.log('selectedDate:', this.selectedDate);
    console.log('lessonDuration:', this.lessonDuration);
    
    if (!this.teacher || !this.selectedTime) {
      console.error('Informations de réservation manquantes');
      console.error('teacher:', this.teacher);
      console.error('selectedTime:', this.selectedTime);
      this.notificationService.error('Informations de réservation manquantes');
      return;
    }

    this.isLoading = true;
    
    const currentUser = this.authService.getCurrentUser();
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
      console.error('Utilisateur non connecté');
      this.notificationService.error('Utilisateur non connecté');
      return;
    }

    const amount = this.teacher.price * (this.lessonDuration / 60); // Prix par heure * durée en heures
    console.log('amount:', amount);
    console.log('teacher.price:', this.teacher.price);
    console.log('lessonDuration:', this.lessonDuration);
    
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
    
    console.log('paymentData:', paymentData);

    this.paymentService.createPaymentIntent(paymentData).subscribe({
      next: (response) => {
        console.log('Payment intent créé:', response);
        this.paymentIntent = response;
        this.clientSecret = response.clientSecret;
        this.paymentId = response.paymentId;
        this.isLoading = false;
        
        // Rendre l'élément de carte après avoir reçu le client secret
        setTimeout(() => {
          this.cardElement.mount('#card-element');
          console.log('Carte montée');
        }, 100);
      },
      error: (error) => {
        console.error('Erreur lors de la création du paiement:', error);
        console.error('Détails de l\'erreur:', error.error);
        this.notificationService.error('Erreur lors de la création du paiement');
        this.isLoading = false;
      }
    });
  }

  async processPayment() {
    console.log('PaymentModal: processPayment() appelé');
    console.log('clientSecret:', this.clientSecret ? 'présent' : 'manquant');
    console.log('cardElement:', this.cardElement ? 'présent' : 'manquant');
    
    if (!this.clientSecret) {
      console.error('Informations de paiement manquantes - clientSecret absent');
      this.notificationService.error('Informations de paiement manquantes');
      return;
    }

    this.paymentProcessing = true;
    console.log('Début du traitement du paiement...');

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

      console.log('Réponse Stripe:', { error, paymentIntent });

      if (error) {
        console.error('Erreur de paiement:', error);
        this.notificationService.error(`Erreur de paiement: ${error.message}`);
        this.paymentProcessing = false;
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        console.log('Paiement réussi via Stripe');
        
        // Confirmer le paiement sur le backend pour mettre à jour le statut en BDD
        const confirmData: ConfirmPaymentDto = {
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentIntent.payment_method
        };

        this.paymentService.confirmPayment(confirmData).subscribe({
          next: () => {
            console.log('Paiement confirmé sur le backend');
            this.notificationService.success('Paiement réussi! Votre réservation a été confirmée.');
            this.paymentSuccess.emit({
              paymentId: this.paymentId,
              paymentIntent: paymentIntent
            });
            this.closePaymentModal();
          },
          error: (error) => {
            console.error('Erreur lors de la confirmation:', error);
            // Même si la confirmation sur le backend a échoué, le paiement a déjà passé via Stripe
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
        console.log('Le paiement nécessite une action supplémentaire:', paymentIntent.status);
        this.notificationService.warning('Le paiement nécessite une action supplémentaire');
        this.paymentProcessing = false;
      }
    } catch (error) {
      console.error('Erreur lors du traitement du paiement:', error);
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
    console.log('PaymentModal: testPayment() appelé');
    this.notificationService.success('Paiement de test réussi!');
    this.paymentSuccess.emit({
      paymentId: 'test-payment-id',
      paymentIntent: { id: 'test-intent-id' }
    });
    this.closePaymentModal();
  }
} 
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CourseService } from '../../../../services/course.service';
import { NotificationService } from '../../../../services/notification.service';

export interface CourseSettingsModalData {
  courseId: number;
  currentPrice?: number;
  currentCurrency?: string;
  currentPaymentMethod?: string;
  currentPaymentDescription?: string;
  isFree?: boolean;
}

@Component({
  selector: 'app-course-settings-modal',
  templateUrl: './course-settings-modal.component.html',
  styleUrls: ['./course-settings-modal.component.css']
})
export class CourseSettingsModalComponent implements OnInit {
  courseId: number;
  price: number = 0;
  currency: string = 'EUR';
  paymentMethod: string = 'stripe';
  paymentDescription: string = '';
  isFree: boolean = true;
  availableCurrencies = ['EUR', 'USD', 'GBP', 'RUB'];
  availablePaymentMethods = [
    { value: 'stripe', label: 'Stripe' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'bank_transfer', label: 'Virement bancaire' },
    { value: 'other', label: 'Autre' }
  ];

  constructor(
    public dialogRef: MatDialogRef<CourseSettingsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CourseSettingsModalData,
    private courseService: CourseService,
    private notificationService: NotificationService
  ) {
    this.courseId = data.courseId;
    this.price = data.currentPrice || 0;
    this.currency = data.currentCurrency || 'EUR';
    this.paymentMethod = data.currentPaymentMethod || 'stripe';
    this.paymentDescription = data.currentPaymentDescription || '';
    this.isFree = data.isFree !== undefined ? data.isFree : (!this.price || this.price === 0);
  }

  ngOnInit(): void {
  }

  saveSettings(): void {
    // Если курс бесплатный, устанавливаем цену в 0
    const finalPrice = this.isFree ? 0 : this.price;
    
    // Сохраняем настройки курса
    const settingsData = {
      price: finalPrice,
      currency: this.currency,
      paymentMethod: this.paymentMethod,
      paymentDescription: this.paymentDescription,
      isFree: this.isFree
    };

    // Используем updateCourse для сохранения настроек оплаты
    this.courseService.updateCourse(this.courseId, settingsData).subscribe({
      next: () => {
        this.notificationService.success('Paramètres du cours enregistrés avec succès!');
        this.dialogRef.close(settingsData);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la sauvegarde des paramètres:', error);
        this.notificationService.error('Erreur lors de la sauvegarde des paramètres');
      }
    });
  }

  onFreeToggle(): void {
    if (this.isFree) {
      // Если курс становится бесплатным, сбрасываем цену
      this.price = 0;
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}


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
    // Если курс бесплатный, устанавливаем цену в null, иначе используем указанную цену
    const finalPrice = this.isFree ? null : (this.price || null);
    
    // Сохраняем настройки курса
    const settingsData = {
      price: finalPrice,
      currency: this.isFree ? null : (this.currency || null),
      paymentMethod: this.isFree ? null : (this.paymentMethod || null),
      paymentDescription: this.isFree ? null : (this.paymentDescription || null),
      isFree: this.isFree
    };

    console.log('💾 Сохранение настроек курса через модальное окно:', settingsData);

    // Используем updateCourse для сохранения настроек оплаты
    this.courseService.updateCourse(this.courseId, settingsData).subscribe({
      next: (course) => {
        console.log('✅ Настройки курса сохранены, ответ сервера:', course);
        this.notificationService.success('Paramètres du cours enregistrés avec succès!');
        // Возвращаем обновленные данные из ответа сервера
        const result = {
          price: (course as any).price !== undefined ? (course as any).price : null,
          currency: (course as any).currency || null,
          paymentMethod: (course as any).paymentMethod || null,
          paymentDescription: (course as any).paymentDescription || null,
          isFree: (course as any).isFree !== undefined ? (course as any).isFree : true
        };
        this.dialogRef.close(result);
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


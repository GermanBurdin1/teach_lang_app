import { Injectable } from '@angular/core';
import { RgpdService } from './rgpd.service';
import { environment } from '../../../environment';

// TypeScript declarations for Google Analytics
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

declare let gtag: (...args: unknown[]) => void;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private measurementId = 'G-XXXXXXXXXX'; // Replace with your GA4 Measurement ID

  constructor(private rgpdService: RgpdService) {
    this.initializeGA4();
  }

  private initializeGA4(): void {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', this.measurementId, {
      page_title: document.title,
      page_location: window.location.href
    });
  }

  // 🔑 KEY EVENTS - Inscription (Registration)
  trackRegistration(method: 'email' | 'google' | 'facebook', userRole: 'student' | 'teacher'): void {
    // Vérifier le consentement RGPD avant le tracking
    if (!this.rgpdService.hasAnalyticsConsent()) {
      if (!environment.production) {
        console.log('🚫 Analytics désactivé - Pas de consentement RGPD');
      }
      return;
    }

    gtag('event', 'sign_up', {
      method: method,
      user_role: userRole,
      event_category: 'engagement',
      event_label: `${method}_${userRole}`,
      value: 1
    });
    if (!environment.production) {
      console.log('📊 GA4: Registration tracked', { method, userRole });
    }
  }

  // 🔑 KEY EVENTS - Réservation (Lesson Booking)
  trackLessonBooking(lessonId: string, teacherId: string, price: number, currency: string = 'EUR'): void {
    // Vérifier le consentement RGPD avant le tracking
    if (!this.rgpdService.hasAnalyticsConsent()) {
      if (!environment.production) {
        console.log('🚫 Analytics désactivé - Pas de consentement RGPD');
      }
      return;
    }

    gtag('event', 'purchase', {
      transaction_id: `lesson_${lessonId}_${Date.now()}`,
      value: price,
      currency: currency,
      items: [{
        item_id: lessonId,
        item_name: 'French Lesson',
        item_category: 'Education',
        item_brand: 'LINGUACONNECT',
        price: price,
        quantity: 1
      }],
      event_category: 'ecommerce',
      event_label: 'lesson_booking'
    });
    if (!environment.production) {
      console.log('📊 GA4: Lesson booking tracked', { lessonId, teacherId, price });
    }
  }

  // 🔑 KEY EVENTS - Paiement (Payment)
  trackPayment(paymentId: string, amount: number, currency: string = 'EUR', paymentMethod: string): void {
    gtag('event', 'purchase', {
      transaction_id: paymentId,
      value: amount,
      currency: currency,
      payment_method: paymentMethod,
      event_category: 'ecommerce',
      event_label: 'payment_completed'
    });
    if (!environment.production) {
      console.log('📊 GA4: Payment tracked', { paymentId, amount, paymentMethod });
    }
  }

  // 📚 Additional Events - Lesson Completion
  trackLessonCompletion(lessonId: string, duration: number, studentId: string): void {
    gtag('event', 'lesson_completed', {
      lesson_id: lessonId,
      duration_minutes: duration,
      student_id: studentId,
      event_category: 'engagement',
      event_label: 'lesson_completion'
    });
    if (!environment.production) {
      console.log('📊 GA4: Lesson completion tracked', { lessonId, duration });
    }
  }

  // 📚 Additional Events - Search
  trackSearch(searchTerm: string, resultsCount: number, searchType: 'words' | 'teachers' | 'lessons'): void {
    gtag('event', 'search', {
      search_term: searchTerm,
      results_count: resultsCount,
      search_type: searchType,
      event_category: 'engagement',
      event_label: 'search_performed'
    });
    if (!environment.production) {
      console.log('📊 GA4: Search tracked', { searchTerm, resultsCount, searchType });
    }
  }

  // 📚 Additional Events - Page Views
  trackPageView(pageName: string, pagePath: string): void {
    gtag('event', 'page_view', {
      page_title: pageName,
      page_location: window.location.href,
      page_path: pagePath,
      event_category: 'navigation',
      event_label: 'page_view'
    });
    if (!environment.production) {
      console.log('📊 GA4: Page view tracked', { pageName, pagePath });
    }
  }

  // 📚 Additional Events - User Engagement
  trackUserEngagement(action: string, category: string, label?: string): void {
    gtag('event', action, {
      event_category: category,
      event_label: label || action,
      value: 1
    });
    if (!environment.production) {
      console.log('📊 GA4: User engagement tracked', { action, category, label });
    }
  }

  // 📚 Additional Events - Error Tracking
  trackError(errorMessage: string, errorLocation: string, errorSeverity: 'low' | 'medium' | 'high'): void {
    gtag('event', 'exception', {
      description: errorMessage,
      fatal: errorSeverity === 'high',
      event_category: 'error',
      event_label: errorLocation
    });
    if (!environment.production) {
      console.log('📊 GA4: Error tracked', { errorMessage, errorLocation, errorSeverity });
    }
  }
}

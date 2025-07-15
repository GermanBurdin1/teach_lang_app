import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

export interface CreatePaymentIntentDto {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, any>;
  stripeCustomerId?: string;
}

export interface ConfirmPaymentDto {
  paymentIntentId: string;
  paymentMethodId: string;
}

export interface PaymentIntentResponse {
  paymentId: string;
  clientSecret: string;
  paymentIntentId: string;
  customerId: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'processing';
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  description: string;
  metadata?: string;
  failureReason?: string;
  createdAt: Date;
  processedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.paymentApiUrl}/payments`;

  constructor(private http: HttpClient) {}

  createPaymentIntent(dto: CreatePaymentIntentDto): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.apiUrl}/create-intent`, dto);
  }

  confirmPayment(dto: ConfirmPaymentDto): Observable<any> {
    console.log('🔍 PaymentService: confirmPayment called with:', dto);
    return this.http.post(`${this.apiUrl}/confirm`, dto);
  }

  getPaymentsForUser(userId: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}/user/${userId}`);
  }

  getPaymentById(paymentId: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/${paymentId}`);
  }

  createCustomer(userId: string, email?: string, name?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/customer`, { userId, email, name });
  }

  getCustomer(customerId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/customer/${customerId}`);
  }

  refundPayment(paymentIntentId: string, amount?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/refund`, { paymentIntentId, amount });
  }
} 
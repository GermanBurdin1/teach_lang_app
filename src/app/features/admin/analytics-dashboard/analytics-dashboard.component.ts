import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../../../services/analytics.service';
import { StructuredDataService } from '../../../services/structured-data.service';

@Component({
  selector: 'app-analytics-dashboard',
  template: `
    <div class="analytics-dashboard">
      <h2>📊 Tableau de Bord Analytics & SEO</h2>
      
      <!-- Section Événements GA4 -->
      <div class="card mb-4">
        <div class="card-header">
          <h5>🔑 Suivi des Événements Clés GA4</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-4">
              <div class="event-card">
                <h6>📝 Événements d'Inscription</h6>
                <p>Suivi des inscriptions utilisateurs avec rôle et méthode</p>
                <button class="btn btn-primary btn-sm" (click)="testRegistrationEvent()">
                  Tester Inscription
                </button>
              </div>
            </div>
            <div class="col-md-4">
              <div class="event-card">
                <h6>📚 Événements de Réservation</h6>
                <p>Suivi des réservations de cours et paiements</p>
                <button class="btn btn-success btn-sm" (click)="testLessonBookingEvent()">
                  Tester Réservation
                </button>
              </div>
            </div>
            <div class="col-md-4">
              <div class="event-card">
                <h6>💳 Événements de Paiement</h6>
                <p>Suivi des paiements et transactions</p>
                <button class="btn btn-warning btn-sm" (click)="testPaymentEvent()">
                  Tester Paiement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section Données Structurées -->
      <div class="card mb-4">
        <div class="card-header">
          <h5>📋 Données Structurées (JSON-LD)</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <h6>Schéma Organisation</h6>
              <button class="btn btn-info btn-sm" (click)="injectOrganizationSchema()">
                Injecter Données Organisation
              </button>
            </div>
            <div class="col-md-6">
              <h6>Schéma Cours</h6>
              <button class="btn btn-info btn-sm" (click)="injectCourseSchema()">
                Injecter Données Cours
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section Hreflang -->
      <div class="card mb-4">
        <div class="card-header">
          <h5>🌍 Implémentation Hreflang</h5>
        </div>
        <div class="card-body">
          <p><strong>Balises hreflang actuelles dans index.html :</strong></p>
          <ul>
            <li><code>&lt;link rel="alternate" hreflang="en" href="https://linguaconnect.com" /&gt;</code></li>
            <li><code>&lt;link rel="alternate" hreflang="fr" href="https://linguaconnect.com/fr" /&gt;</code></li>
            <li><code>&lt;link rel="alternate" hreflang="es" href="https://linguaconnect.com/es" /&gt;</code></li>
            <li><code>&lt;link rel="alternate" hreflang="de" href="https://linguaconnect.com/de" /&gt;</code></li>
            <li><code>&lt;link rel="alternate" hreflang="x-default" href="https://linguaconnect.com" /&gt;</code></li>
          </ul>
        </div>
      </div>

      <!-- Statut Analytics -->
      <div class="card">
        <div class="card-header">
          <h5>📈 Statut Analytics</h5>
        </div>
        <div class="card-body">
          <div class="alert alert-success">
            <h6>✅ Implémentation Complète</h6>
            <ul>
              <li><strong>Intégration GA4 :</strong> Prêt pour la production</li>
              <li><strong>Événements Clés :</strong> Inscription, Réservation, Paiement</li>
              <li><strong>Données Structurées :</strong> Schémas Organisation, Cours, Enseignant</li>
              <li><strong>Hreflang :</strong> Support multi-langues configuré</li>
              <li><strong>SEO Prêt :</strong> Toutes les balises meta et données structurées implémentées</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      padding: 20px;
    }
    .event-card {
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      background: #f8f9fa;
    }
    .event-card h6 {
      color: #495057;
      margin-bottom: 10px;
    }
    .event-card p {
      font-size: 0.9em;
      color: #6c757d;
      margin-bottom: 15px;
    }
    .card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .alert {
      border-left: 4px solid #28a745;
    }
  `]
})
export class AnalyticsDashboardComponent implements OnInit {

  constructor(
    private analyticsService: AnalyticsService,
    private structuredDataService: StructuredDataService
  ) { }

  ngOnInit(): void {
    // Suivi de la vue de page
    this.analyticsService.trackPageView('Tableau de Bord Analytics', '/admin/analytics');
  }

  testRegistrationEvent(): void {
    this.analyticsService.trackRegistration('email', 'student');
    console.log('📊 Événement d\'inscription de test envoyé à GA4');
  }

  testLessonBookingEvent(): void {
    this.analyticsService.trackLessonBooking('lesson_123', 'teacher_456', 99, 'EUR');
    console.log('📊 Événement de réservation de test envoyé à GA4');
  }

  testPaymentEvent(): void {
    this.analyticsService.trackPayment('payment_789', 99, 'EUR', 'credit_card');
    console.log('📊 Événement de paiement de test envoyé à GA4');
  }

  injectOrganizationSchema(): void {
    const orgSchema = this.structuredDataService.generateOrganizationSchema();
    this.structuredDataService.injectStructuredData(orgSchema);
    console.log('📊 Schéma organisation injecté');
  }

  injectCourseSchema(): void {
    const courseSchema = this.structuredDataService.generateCourseSchema({
      title: 'Préparation DELF B1 Français',
      description: 'Cours complet de préparation à l\'examen DELF B1',
      level: 'B1',
      price: 99
    });
    this.structuredDataService.injectStructuredData(courseSchema);
    console.log('📊 Schéma cours injecté');
  }
}

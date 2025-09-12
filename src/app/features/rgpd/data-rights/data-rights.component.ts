import { Component, OnInit } from '@angular/core';
import { RgpdService, UserDataRequest } from '../../../services/rgpd.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-data-rights',
  template: `
    <div class="data-rights-container">
      <!-- Back to Home Button -->
      <app-back-to-home-button userRole="student" label="Accueil"></app-back-to-home-button>
      
      <div class="container">
        <h2>🔒 Vos droits sur vos données personnelles (RGPD)</h2>
        
        <div class="rights-info">
          <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez de plusieurs droits concernant vos données personnelles.</p>
        </div>

        <div class="rights-grid">
          <!-- Droit d'accès -->
          <div class="right-card">
            <div class="right-icon">👁️</div>
            <h3>Droit d'accès</h3>
            <p>Consultez toutes les données personnelles que nous détenons sur vous.</p>
            <button class="btn btn-outline-primary" (click)="requestDataAccess()" [disabled]="isLoading">
              <span *ngIf="!isLoading">Demander l'accès</span>
              <span *ngIf="isLoading">Traitement...</span>
            </button>
          </div>

          <!-- Droit de rectification -->
          <div class="right-card">
            <div class="right-icon">✏️</div>
            <h3>Droit de rectification</h3>
            <p>Modifiez ou corrigez vos données personnelles inexactes.</p>
            <button class="btn btn-outline-warning" (click)="requestDataModification()" [disabled]="isLoading">
              <span *ngIf="!isLoading">Demander la modification</span>
              <span *ngIf="isLoading">Traitement...</span>
            </button>
          </div>

          <!-- Droit à l'effacement -->
          <div class="right-card">
            <div class="right-icon">🗑️</div>
            <h3>Droit à l'effacement</h3>
            <p>Supprimez vos données personnelles (droit à l'oubli).</p>
            <button class="btn btn-outline-danger" (click)="requestDataDeletion()" [disabled]="isLoading">
              <span *ngIf="!isLoading">Demander la suppression</span>
              <span *ngIf="isLoading">Traitement...</span>
            </button>
          </div>

          <!-- Rapport de données -->
          <div class="right-card">
            <div class="right-icon">📊</div>
            <h3>Rapport de données</h3>
            <p>Obtenez un rapport détaillé de vos données personnelles.</p>
            <button class="btn btn-outline-info" (click)="generateDataReport()" [disabled]="isLoading">
              <span *ngIf="!isLoading">Générer le rapport</span>
              <span *ngIf="isLoading">Génération...</span>
            </button>
          </div>
        </div>

        <!-- Historique des demandes -->
        <div class="requests-history" *ngIf="userRequests.length > 0">
          <h3>📋 Historique de vos demandes</h3>
          <div class="requests-list">
            <div class="request-item" *ngFor="let request of userRequests">
              <div class="request-info">
                <span class="request-type">{{ getRequestTypeLabel(request.type) }}</span>
                <span class="request-date">{{ request.requestedAt | date:'short' }}</span>
                <span class="request-status" [ngClass]="'status-' + request.status">
                  {{ getStatusLabel(request.status) }}
                </span>
              </div>
              <div class="request-details" *ngIf="request.processedAt">
                <small>Traité le: {{ request.processedAt | date:'short' }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Informations légales -->
        <div class="legal-info">
          <h3>ℹ️ Informations légales</h3>
          <div class="info-grid">
            <div class="info-item">
              <strong>Responsable du traitement:</strong>
              <span>LINGUACONNECT</span>
            </div>
            <div class="info-item">
              <strong>Délégué à la protection des données (DPO):</strong>
              <span>dpo&#64;linguaconnect.com</span>
            </div>
            <div class="info-item">
              <strong>Durée de conservation:</strong>
              <span>3 ans après la dernière activité</span>
            </div>
            <div class="info-item">
              <strong>Base légale:</strong>
              <span>Consentement et intérêt légitime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .data-rights-container {
      padding: 40px 0;
      background: #f8f9fa;
    }

    .rights-info {
      background: #e3f2fd;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border-left: 4px solid #2196f3;
    }

    .rights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .right-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
      transition: transform 0.2s ease;
    }

    .right-card:hover {
      transform: translateY(-2px);
    }

    .right-icon {
      font-size: 2.5em;
      margin-bottom: 15px;
    }

    .right-card h3 {
      color: #333;
      margin-bottom: 15px;
      font-size: 1.3em;
    }

    .right-card p {
      color: #666;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .requests-history {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .requests-list {
      margin-top: 20px;
    }

    .request-item {
      padding: 15px;
      border: 1px solid #eee;
      border-radius: 8px;
      margin-bottom: 10px;
      background: #fafafa;
    }

    .request-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }

    .request-type {
      font-weight: 500;
      color: #333;
    }

    .request-date {
      color: #666;
      font-size: 0.9em;
    }

    .request-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 500;
    }

    .status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-processing {
      background: #d1ecf1;
      color: #0c5460;
    }

    .status-completed {
      background: #d4edda;
      color: #155724;
    }

    .status-rejected {
      background: #f8d7da;
      color: #721c24;
    }

    .legal-info {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .info-item strong {
      color: #333;
      font-size: 0.9em;
    }

    .info-item span {
      color: #666;
    }

    @media (max-width: 768px) {
      .rights-grid {
        grid-template-columns: 1fr;
      }
      
      .request-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
    }
  `]
})
export class DataRightsComponent implements OnInit {
  isLoading = false;
  userRequests: UserDataRequest[] = [];

  constructor(
    private rgpdService: RgpdService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUserRequests();
  }

  requestDataAccess(): void {
    this.isLoading = true;
    const user = this.authService.getCurrentUser();
    if (user) {
      this.rgpdService.requestDataAccess(user.id).subscribe({
        next: (request) => {
          this.userRequests.unshift(request);
          this.isLoading = false;
          console.log('✅ Demande d\'accès créée:', request);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la demande d\'accès:', error);
          this.isLoading = false;
        }
      });
    }
  }

  requestDataModification(): void {
    this.isLoading = true;
    const user = this.authService.getCurrentUser();
    if (user) {
      this.rgpdService.requestDataModification(user.id, { 
        email: user.email,
        name: user.name 
      }).subscribe({
        next: (request) => {
          this.userRequests.unshift(request);
          this.isLoading = false;
          console.log('✅ Demande de modification créée:', request);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la demande de modification:', error);
          this.isLoading = false;
        }
      });
    }
  }

  requestDataDeletion(): void {
    if (window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer toutes vos données personnelles ? Cette action est irréversible.')) {
      this.isLoading = true;
      const user = this.authService.getCurrentUser();
      if (user) {
        this.rgpdService.requestDataDeletion(user.id).subscribe({
          next: (request) => {
            this.userRequests.unshift(request);
            this.isLoading = false;
            console.log('✅ Demande de suppression créée:', request);
          },
          error: (error) => {
            console.error('❌ Erreur lors de la demande de suppression:', error);
            this.isLoading = false;
          }
        });
      }
    }
  }

  generateDataReport(): void {
    this.isLoading = true;
    const user = this.authService.getCurrentUser();
    if (user) {
      this.rgpdService.generateDataReport(user.id).subscribe({
        next: (report) => {
          this.isLoading = false;
          console.log('📊 Rapport de données généré:', report);
          // En production, ceci téléchargerait le rapport
          alert('Rapport généré avec succès ! (Voir la console pour les détails)');
        },
        error: (error) => {
          console.error('❌ Erreur lors de la génération du rapport:', error);
          this.isLoading = false;
        }
      });
    }
  }

  private loadUserRequests(): void {
    // En production, ceci chargerait les demandes depuis le backend
    this.userRequests = [];
  }

  getRequestTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'access': 'Accès aux données',
      'modification': 'Modification des données',
      'deletion': 'Suppression des données'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'processing': 'En cours',
      'completed': 'Terminé',
      'rejected': 'Rejeté'
    };
    return labels[status] || status;
  }
}

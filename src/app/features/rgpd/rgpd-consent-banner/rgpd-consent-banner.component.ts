import { Component, OnInit } from '@angular/core';
import { RgpdService, ConsentData } from '../../../services/rgpd.service';

@Component({
  selector: 'app-rgpd-consent-banner',
  template: `
    <div class="rgpd-banner" *ngIf="showBanner">
      <div class="rgpd-content">
        <div class="rgpd-header">
          <h4>🍪 Gestion des cookies et données personnelles</h4>
        </div>
        
        <div class="rgpd-body">
          <p>Nous utilisons des cookies et collectons des données personnelles pour améliorer votre expérience sur LINGUACONNECT. 
          Conformément au RGPD, vous pouvez gérer vos préférences.</p>
          
          <div class="consent-options">
            <div class="consent-option">
              <label class="consent-label">
                <input type="checkbox" [(ngModel)]="consent.necessary" disabled checked>
                <span class="consent-text">Cookies nécessaires (obligatoires)</span>
              </label>
              <small>Ces cookies sont essentiels au fonctionnement du site.</small>
            </div>
            
            <div class="consent-option">
              <label class="consent-label">
                <input type="checkbox" [(ngModel)]="consent.analytics">
                <span class="consent-text">Analytics et performance</span>
              </label>
              <small>Nous aident à comprendre comment vous utilisez notre site.</small>
            </div>
            
            <div class="consent-option">
              <label class="consent-label">
                <input type="checkbox" [(ngModel)]="consent.marketing">
                <span class="consent-text">Marketing et publicité</span>
              </label>
              <small>Pour personnaliser les contenus et publicités.</small>
            </div>
          </div>
        </div>
        
        <div class="rgpd-actions">
          <button class="btn btn-outline-secondary btn-sm" (click)="rejectAll()">
            Rejeter tout
          </button>
          <button class="btn btn-outline-primary btn-sm" (click)="savePreferences()">
            Enregistrer mes préférences
          </button>
          <button class="btn btn-primary btn-sm" (click)="acceptAll()">
            Accepter tout
          </button>
        </div>
        
        <div class="rgpd-footer">
          <small>
            <a href="/privacy-policy" target="_blank">Politique de confidentialité</a> | 
            <a href="/cookies-policy" target="_blank">Politique des cookies</a> | 
            <a href="/data-rights" target="_blank">Vos droits</a>
          </small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rgpd-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-top: 3px solid #4A90E2;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      z-index: 9999;
      padding: 20px;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .rgpd-content {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .rgpd-header h4 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 1.2em;
    }
    
    .rgpd-body {
      margin-bottom: 20px;
    }
    
    .rgpd-body p {
      margin-bottom: 15px;
      color: #666;
      line-height: 1.5;
    }
    
    .consent-options {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .consent-option {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .consent-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .consent-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #4A90E2;
    }
    
    .consent-text {
      color: #333;
    }
    
    .consent-option small {
      color: #666;
      margin-left: 28px;
    }
    
    .rgpd-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }
    
    .rgpd-footer {
      text-align: center;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    
    .rgpd-footer a {
      color: #4A90E2;
      text-decoration: none;
    }
    
    .rgpd-footer a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .rgpd-banner {
        padding: 15px;
      }
      
      .rgpd-actions {
        flex-direction: column;
      }
      
      .rgpd-actions button {
        width: 100%;
      }
    }
  `]
})
export class RgpdConsentBannerComponent implements OnInit {
  showBanner = false;
  consent: ConsentData = {
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: '',
    version: '1.0'
  };

  constructor(private rgpdService: RgpdService) {}

  ngOnInit(): void {
    // Vérifier si le consentement existe déjà
    const existingConsent = this.rgpdService.getConsent();
    if (!existingConsent) {
      this.showBanner = true;
    }
  }

  acceptAll(): void {
    this.consent.analytics = true;
    this.consent.marketing = true;
    this.savePreferences();
  }

  rejectAll(): void {
    this.consent.analytics = false;
    this.consent.marketing = false;
    this.savePreferences();
  }

  savePreferences(): void {
    this.rgpdService.saveConsent(this.consent);
    this.showBanner = false;
    console.log('✅ Préférences RGPD enregistrées:', this.consent);
  }
}

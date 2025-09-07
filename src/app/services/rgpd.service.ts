import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ConsentData {
  analytics: boolean;
  marketing: boolean;
  necessary: boolean;
  timestamp: string;
  version: string;
}

export interface UserDataRequest {
  id: string;
  type: 'access' | 'modification' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RgpdService {
  private consentSubject = new BehaviorSubject<ConsentData | null>(null);
  public consent$ = this.consentSubject.asObservable();

  private readonly CONSENT_KEY = 'rgpd_consent';
  private readonly CONSENT_VERSION = '1.0';

  constructor() {
    this.loadConsentFromStorage();
  }

  /**
   * Initialise le consentement RGPD
   */
  initializeConsent(): void {
    const existingConsent = this.getConsent();
    if (!existingConsent) {
      this.showConsentBanner();
    }
  }

  /**
   * Affiche la bannière de consentement
   */
  private showConsentBanner(): void {
    // En production, ceci déclencherait l'affichage d'une vraie bannière
    console.log('🍪 Affichage de la bannière de consentement RGPD');
  }

  /**
   * Enregistre le consentement utilisateur
   */
  saveConsent(consent: Partial<ConsentData>): void {
    const fullConsent: ConsentData = {
      analytics: consent.analytics || false,
      marketing: consent.marketing || false,
      necessary: true, // Toujours true car nécessaire au fonctionnement
      timestamp: new Date().toISOString(),
      version: this.CONSENT_VERSION
    };

    try {
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(fullConsent));
      this.consentSubject.next(fullConsent);
      console.log('✅ Consentement RGPD enregistré:', fullConsent);
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du consentement:', error);
    }
  }

  /**
   * Récupère le consentement actuel
   */
  getConsent(): ConsentData | null {
    return this.consentSubject.value;
  }

  /**
   * Vérifie si l'utilisateur a consenti aux analytics
   */
  hasAnalyticsConsent(): boolean {
    const consent = this.getConsent();
    return consent?.analytics || false;
  }

  /**
   * Vérifie si l'utilisateur a consenti au marketing
   */
  hasMarketingConsent(): boolean {
    const consent = this.getConsent();
    return consent?.marketing || false;
  }

  /**
   * Charge le consentement depuis le localStorage
   */
  private loadConsentFromStorage(): void {
    try {
      const savedConsent = localStorage.getItem(this.CONSENT_KEY);
      if (savedConsent) {
        const consent = JSON.parse(savedConsent);
        this.consentSubject.next(consent);
        console.log('📋 Consentement RGPD chargé depuis le localStorage:', consent);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement du consentement:', error);
      this.clearConsent();
    }
  }

  /**
   * Efface le consentement
   */
  clearConsent(): void {
    localStorage.removeItem(this.CONSENT_KEY);
    this.consentSubject.next(null);
    console.log('🗑️ Consentement RGPD effacé');
  }

  /**
   * Demande d'accès aux données personnelles
   */
  requestDataAccess(userId: string): Observable<UserDataRequest> {
    const request: UserDataRequest = {
      id: `access_${Date.now()}`,
      type: 'access',
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    console.log('📋 Demande d\'accès aux données créée:', request);
    // En production, ceci enverrait une requête au backend
    return new Observable(observer => {
      setTimeout(() => {
        request.status = 'completed';
        request.processedAt = new Date().toISOString();
        observer.next(request);
        observer.complete();
      }, 1000);
    });
  }

  /**
   * Demande de modification des données personnelles
   */
  requestDataModification(userId: string, modifications: any): Observable<UserDataRequest> {
    const request: UserDataRequest = {
      id: `modify_${Date.now()}`,
      type: 'modification',
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    console.log('📝 Demande de modification des données créée:', request, modifications);
    // En production, ceci enverrait une requête au backend
    return new Observable(observer => {
      setTimeout(() => {
        request.status = 'completed';
        request.processedAt = new Date().toISOString();
        observer.next(request);
        observer.complete();
      }, 1000);
    });
  }

  /**
   * Demande de suppression des données personnelles (droit à l'oubli)
   */
  requestDataDeletion(userId: string): Observable<UserDataRequest> {
    const request: UserDataRequest = {
      id: `delete_${Date.now()}`,
      type: 'deletion',
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    console.log('🗑️ Demande de suppression des données créée:', request);
    // En production, ceci enverrait une requête au backend
    return new Observable(observer => {
      setTimeout(() => {
        request.status = 'completed';
        request.processedAt = new Date().toISOString();
        observer.next(request);
        observer.complete();
      }, 2000);
    });
  }

  /**
   * Génère un rapport de données personnelles
   */
  generateDataReport(userId: string): Observable<any> {
    const report = {
      userId,
      generatedAt: new Date().toISOString(),
      dataTypes: [
        'Informations de profil (nom, email, rôle)',
        'Données de cours et leçons',
        'Historique de connexion',
        'Préférences de consentement',
        'Données de navigation (si consentement analytics)'
      ],
      retentionPeriod: '3 ans après la dernière activité',
      dataController: 'LINGUACONNECT',
      dpoContact: 'dpo@linguaconnect.com'
    };

    console.log('📊 Rapport de données généré:', report);
    return new Observable(observer => {
      setTimeout(() => {
        observer.next(report);
        observer.complete();
      }, 500);
    });
  }

  /**
   * Vérifie si une AIPD est nécessaire
   */
  isAipdRequired(processingType: string, dataVolume: number): boolean {
    // Critères simplifiés pour déterminer si une AIPD est nécessaire
    const highRiskTypes = ['biometric', 'health', 'financial', 'location'];
    const isHighRisk = highRiskTypes.some(type => processingType.includes(type));
    const isHighVolume = dataVolume > 10000;
    
    return isHighRisk || isHighVolume;
  }

  /**
   * Génère une AIPD basique
   */
  generateAipd(processingType: string, dataVolume: number): Observable<any> {
    const aipd = {
      id: `aipd_${Date.now()}`,
      processingType,
      dataVolume,
      riskLevel: this.isAipdRequired(processingType, dataVolume) ? 'HIGH' : 'LOW',
      measures: [
        'Chiffrement des données sensibles',
        'Accès restreint aux données personnelles',
        'Audit régulier des accès',
        'Formation du personnel à la protection des données'
      ],
      generatedAt: new Date().toISOString(),
      status: 'draft'
    };

    console.log('📋 AIPD générée:', aipd);
    return new Observable(observer => {
      setTimeout(() => {
        observer.next(aipd);
        observer.complete();
      }, 1000);
    });
  }
}

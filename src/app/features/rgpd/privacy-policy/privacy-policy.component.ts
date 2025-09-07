import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy-policy',
  template: `
    <div class="privacy-policy-container">
      <!-- Back to Home Button -->
      <app-back-to-home-button userRole="student" label="Accueil"></app-back-to-home-button>
      
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <h1 class="mb-4">🔒 Politique de Confidentialité</h1>
            
            <div class="policy-section">
              <h2>1. Collecte des données</h2>
              <p>LINGUACONNECT collecte les données personnelles suivantes :</p>
              <ul>
                <li>Nom et prénom</li>
                <li>Adresse e-mail</li>
                <li>Informations de profil (niveau de français, objectifs d'apprentissage)</li>
                <li>Données de navigation et d'utilisation</li>
              </ul>
            </div>

            <div class="policy-section">
              <h2>2. Utilisation des données</h2>
              <p>Vos données sont utilisées pour :</p>
              <ul>
                <li>Fournir nos services d'apprentissage</li>
                <li>Personnaliser votre expérience</li>
                <li>Communiquer avec vous</li>
                <li>Améliorer nos services</li>
              </ul>
            </div>

            <div class="policy-section">
              <h2>3. Partage des données</h2>
              <p>Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées uniquement avec :</p>
              <ul>
                <li>Nos prestataires de services (hébergement, paiement)</li>
                <li>Les autorités compétentes si requis par la loi</li>
              </ul>
            </div>

            <div class="policy-section">
              <h2>4. Vos droits</h2>
              <p>Conformément au RGPD, vous avez le droit de :</p>
              <ul>
                <li>Accéder à vos données</li>
                <li>Les rectifier</li>
                <li>Les supprimer</li>
                <li>Limiter leur traitement</li>
                <li>Vous opposer à leur traitement</li>
              </ul>
            </div>

            <div class="policy-section">
              <h2>5. Contact</h2>
              <p>Pour toute question concernant cette politique :</p>
              <p><strong>Email :</strong> dpo&#64;linguaconnect.com</p>
              <p><strong>Adresse :</strong> LINGUACONNECT, France</p>
            </div>

            <div class="policy-footer">
              <p class="text-muted">Dernière mise à jour : Janvier 2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .privacy-policy-container {
      background-color: #f8f9fa;
    }
    
    .policy-section {
      background: white;
      padding: 30px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .policy-section h2 {
      color: #4A90E2;
      margin-bottom: 15px;
      font-size: 1.3em;
    }
    
    .policy-section ul {
      padding-left: 20px;
    }
    
    .policy-section li {
      margin-bottom: 8px;
    }
    
    .policy-footer {
      text-align: center;
      margin-top: 30px;
    }
  `]
})
export class PrivacyPolicyComponent { }

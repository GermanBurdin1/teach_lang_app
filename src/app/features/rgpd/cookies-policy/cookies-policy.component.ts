import { Component } from '@angular/core';

@Component({
  selector: 'app-cookies-policy',
  template: `
    <div class="cookies-policy-container">
      <!-- Back to Home Button -->
      <app-back-to-home-button userRole="student" label="Accueil"></app-back-to-home-button>
      
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <h1 class="mb-4">🍪 Politique des Cookies</h1>
            
            <div class="policy-section">
              <h2>1. Qu'est-ce qu'un cookie ?</h2>
              <p>Un cookie est un petit fichier texte stocké sur votre ordinateur ou appareil mobile lorsque vous visitez notre site web. Les cookies nous aident à améliorer votre expérience de navigation.</p>
            </div>

            <div class="policy-section">
              <h2>2. Types de cookies utilisés</h2>
              
              <h3>Cookies nécessaires</h3>
              <p>Ces cookies sont essentiels au fonctionnement du site :</p>
              <ul>
                <li>Cookies de session pour maintenir votre connexion</li>
                <li>Cookies de sécurité pour protéger vos données</li>
                <li>Cookies de préférences linguistiques</li>
              </ul>

              <h3>Cookies d'analyse</h3>
              <p>Ces cookies nous aident à comprendre comment vous utilisez notre site :</p>
              <ul>
                <li>Google Analytics pour les statistiques de visite</li>
                <li>Cookies de performance pour mesurer la vitesse</li>
              </ul>

              <h3>Cookies de marketing</h3>
              <p>Ces cookies sont utilisés pour personnaliser les publicités :</p>
              <ul>
                <li>Cookies de réseaux sociaux</li>
                <li>Cookies publicitaires ciblés</li>
              </ul>
            </div>

            <div class="policy-section">
              <h2>3. Gestion des cookies</h2>
              <p>Vous pouvez gérer vos préférences de cookies :</p>
              <ul>
                <li>Via notre bannière de consentement</li>
                <li>Dans les paramètres de votre navigateur</li>
                <li>En nous contactant directement</li>
              </ul>
            </div>

            <div class="policy-section">
              <h2>4. Durée de conservation</h2>
              <p>Les cookies sont conservés pour différentes durées :</p>
              <ul>
                <li><strong>Cookies de session :</strong> Supprimés à la fermeture du navigateur</li>
                <li><strong>Cookies persistants :</strong> 1 à 2 ans maximum</li>
                <li><strong>Cookies d'analyse :</strong> 26 mois</li>
              </ul>
            </div>

            <div class="policy-section">
              <h2>5. Contact</h2>
              <p>Pour toute question sur notre utilisation des cookies :</p>
              <p><strong>Email :</strong> dpo&#64;linguaconnect.com</p>
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
    .cookies-policy-container {
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
    
    .policy-section h3 {
      color: #333;
      margin: 20px 0 10px 0;
      font-size: 1.1em;
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
export class CookiesPolicyComponent { }

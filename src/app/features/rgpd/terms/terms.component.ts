import { Component } from '@angular/core';

@Component({
  selector: 'app-terms',
  template: `
    <div class="terms-container">
      <!-- Back to Home Button -->
      <app-back-to-home-button userRole="student" label="Accueil"></app-back-to-home-button>
      
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <h1 class="mb-4">📋 Conditions d'Utilisation</h1>
            
            <div class="terms-section">
              <h2>1. Acceptation des conditions</h2>
              <p>En utilisant LINGUACONNECT, vous acceptez ces conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.</p>
            </div>

            <div class="terms-section">
              <h2>2. Description du service</h2>
              <p>LINGUACONNECT est une plateforme d'apprentissage du français en ligne qui propose :</p>
              <ul>
                <li>Des cours interactifs pour la préparation aux examens DELF et DALF</li>
                <li>Des leçons personnalisées avec des enseignants natifs</li>
                <li>Des outils d'apprentissage (vocabulaire, grammaire, exercices)</li>
                <li>Un tableau blanc collaboratif pour les cours en ligne</li>
              </ul>
            </div>

            <div class="terms-section">
              <h2>3. Compte utilisateur</h2>
              <p>Pour utiliser nos services, vous devez :</p>
              <ul>
                <li>Créer un compte avec des informations exactes</li>
                <li>Maintenir la confidentialité de vos identifiants</li>
                <li>Être responsable de toutes les activités sur votre compte</li>
                <li>Nous informer de toute utilisation non autorisée</li>
              </ul>
            </div>

            <div class="terms-section">
              <h2>4. Utilisation acceptable</h2>
              <p>Vous vous engagez à :</p>
              <ul>
                <li>Utiliser le service conformément à la loi</li>
                <li>Respecter les autres utilisateurs et enseignants</li>
                <li>Ne pas perturber le fonctionnement du service</li>
                <li>Ne pas partager de contenu inapproprié</li>
              </ul>
            </div>

            <div class="terms-section">
              <h2>5. Propriété intellectuelle</h2>
              <p>Tous les contenus de LINGUACONNECT (cours, exercices, matériels pédagogiques) sont protégés par le droit d'auteur. Vous ne pouvez pas :</p>
              <ul>
                <li>Copier ou distribuer nos contenus</li>
                <li>Utiliser nos contenus à des fins commerciales</li>
                <li>Modifier ou créer des œuvres dérivées</li>
              </ul>
            </div>

            <div class="terms-section">
              <h2>6. Paiements et remboursements</h2>
              <p>Les cours payants sont facturés selon nos tarifs en vigueur. Les remboursements sont possibles dans les 14 jours suivant l'achat, sous certaines conditions.</p>
            </div>

            <div class="terms-section">
              <h2>7. Limitation de responsabilité</h2>
              <p>LINGUACONNECT ne peut être tenu responsable des dommages indirects résultant de l'utilisation de notre service.</p>
            </div>

            <div class="terms-section">
              <h2>8. Modification des conditions</h2>
              <p>Nous nous réservons le droit de modifier ces conditions. Les utilisateurs seront informés des changements importants.</p>
            </div>

            <div class="terms-section">
              <h2>9. Contact</h2>
              <p>Pour toute question concernant ces conditions :</p>
              <p><strong>Email :</strong> legal&#64;linguaconnect.com</p>
              <p><strong>Adresse :</strong> LINGUACONNECT, France</p>
            </div>

            <div class="terms-footer">
              <p class="text-muted">Dernière mise à jour : Janvier 2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .terms-container {
      background-color: #f8f9fa;
    }
    
    .terms-section {
      background: white;
      padding: 30px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .terms-section h2 {
      color: #4A90E2;
      margin-bottom: 15px;
      font-size: 1.3em;
    }
    
    .terms-section ul {
      padding-left: 20px;
    }
    
    .terms-section li {
      margin-bottom: 8px;
    }
    
    .terms-footer {
      text-align: center;
      margin-top: 30px;
    }
  `]
})
export class TermsComponent { }

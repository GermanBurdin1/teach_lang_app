import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {
  message = 'Vérification en cours...';
  success = false;
  loading = true;

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.http.post('http://localhost:3001/auth/verify-email', { token }).subscribe({
        next: () => {
          this.message = 'Votre email a été confirmé avec succès ! Vous pouvez maintenant vous connecter.';
          this.success = true;
          this.loading = false;
        },
        error: () => {
          this.message = "Erreur lors de la confirmation de l'email. Le lien est peut-être expiré ou déjà utilisé.";
          this.success = false;
          this.loading = false;
        }
      });
    } else {
      this.message = 'Lien de confirmation invalide.';
      this.success = false;
      this.loading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
} 
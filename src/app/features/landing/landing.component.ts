import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  isFormValid: boolean = false;

  constructor(private router: Router) {}

  goBack() {

  }

  previewPage(): void {
    this.router.navigate(['/landing/preview']);
  }
}

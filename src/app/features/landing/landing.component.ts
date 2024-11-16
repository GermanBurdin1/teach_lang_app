import { Component } from '@angular/core';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  isFormValid: boolean = false;

  goBack() {
    // Логика для кнопки возврата назад
  }
}

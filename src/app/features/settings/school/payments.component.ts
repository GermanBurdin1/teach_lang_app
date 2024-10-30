import { Component } from '@angular/core';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent {
  showModal: boolean = false;

  openSettingsModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }
}

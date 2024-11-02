import { Component } from '@angular/core';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {
  isCreateStudentModalOpen = false;
  showAdditionalInfo = false;

  openCreateStudentModal(): void {
    this.isCreateStudentModalOpen = true;
  }

  closeCreateStudentModal(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isCreateStudentModalOpen = false;
  }

  toggleAdditionalInfo(): void {
    this.showAdditionalInfo = !this.showAdditionalInfo;
  }
}



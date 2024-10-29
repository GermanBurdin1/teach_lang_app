import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.css']
})
export class GeneralSettingsComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  showPasswordChange: boolean = false;

  // Метод для открытия диалога выбора файла
  triggerFileUpload() {
    this.fileInput.nativeElement.click();
  }

  // Метод, который вызывается при выборе файла
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      console.log('Файл выбран:', file);
    }
  }

  // Метод для переключения видимости полей изменения пароля
  togglePasswordChange() {
    this.showPasswordChange = !this.showPasswordChange;
  }
}


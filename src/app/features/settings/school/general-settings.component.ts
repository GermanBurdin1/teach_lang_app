import { Component, ViewChild, ElementRef } from '@angular/core';

interface Language {
  name: string;
  flag: string;
}

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.css']
})
export class GeneralSettingsComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  showPasswordChange: boolean = false;

  // langues disponibles et sélectionnées
  availableLanguages: Language[] = [
    { name: 'Russian', flag: 'path_to_russian_flag.png' },
    { name: 'English', flag: 'path_to_english_flag.png' },
    { name: 'Italian', flag: 'path_to_italian_flag.png' },
    { name: 'Spanish', flag: 'path_to_spanish_flag.png' }
  ];
  selectedLanguages: Language[] = [];
  selectedLanguage: Language | null = null;

  triggerFileUpload() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      console.log('Файл выбран:', file);
    }
  }

  togglePasswordChange() {
    this.showPasswordChange = !this.showPasswordChange;
  }

  addLanguage() {
    if (this.selectedLanguage && !this.selectedLanguages.some(lang => lang.name === this.selectedLanguage!.name)) {
      this.selectedLanguages.push(this.selectedLanguage);
      this.selectedLanguage = null;
    }
  }

  removeLanguage(language: Language) {
    this.selectedLanguages = this.selectedLanguages.filter(lang => lang !== language);
  }
}

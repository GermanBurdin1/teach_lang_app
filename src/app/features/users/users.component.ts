import { Component } from '@angular/core';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {
  isCreateStudentModalOpen = false;
  isCreateTeacherModalOpen = false;
  showAdditionalInfo = false;
  selectedFile: File | null = null;
  selectedPlatform = 'Skype';
  linkPlaceholder = 'Введите ссылку для Skype';
  linkInput: string | undefined;

  platforms = [
    { value: 'Skype', label: 'Skype', icon: 'bi bi-skype' },
    { value: 'Zoom', label: 'Zoom', icon: 'bi bi-camera-video' }
  ];


  // Timezone options (all UTC)
  timezones = [
    'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00',
    'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+04:00',
    'UTC+05:00', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
  ];

  // Frequency options for "Периодичность обучения"
  frequencies = [
    '1 раз в неделю', '2 раза в неделю', '3 раза в неделю', '4 раза в неделю',
    '5 раз в неделю', '6 раз в неделю', '7 раз в неделю'
  ];

  openCreateStudentModal(): void {
    this.isCreateStudentModalOpen = true;
  }

  closeCreateStudentModal(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isCreateStudentModalOpen = false;
  }

  openCreateTeacherModal(): void {
    this.isCreateTeacherModalOpen = true;
  }

  closeCreateTeacherModal(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isCreateTeacherModalOpen = false;
  }

  toggleAdditionalInfo(): void {
    this.showAdditionalInfo = !this.showAdditionalInfo;
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('avatarUpload') as HTMLElement;
    fileInput.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Выбранный файл:', this.selectedFile.name);
    }
  }

  updateLinkPlaceholder(): void {
    if (this.selectedPlatform === 'Skype') {
      this.linkPlaceholder = 'Введите ссылку для Skype';
    } else {
      this.linkPlaceholder = 'Введите ссылку для Zoom';
    }
  }
  possibilities = [
    {
      title: 'Учитель онлайн-уроков',
      description: 'Сотрудник сможет проводить онлайн-уроки',
      icon: 'bi bi-person-video3', // Иконка для примера
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
    {
      title: 'Куратор марафонов',
      description: 'Сотрудник сможет курировать марафоны и онлайн-курсы',
      icon: 'bi bi-award', // Иконка для примера
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
    {
      title: 'Администратор',
      description: 'Сотрудник сможет администрировать учебный процесс',
      icon: 'bi bi-gear', // Иконка для примера
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
  ];

  selectedLanguages: string = 'Английский';
  availableLanguages = ['Русский', 'Английский', 'Французский'];
  days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  togglePossibility(possibility: any) {
    possibility.expanded = !possibility.expanded;
  }

  toggleFeature(possibility: any) {
    possibility.isFeatureEnabled = !possibility.isFeatureEnabled;
  }

  fillSchedule() {
    // Логика заполнения графика автоматически
  }

  fillTeacherSchedule() {
    // Логика заполнения графика учителем
  }

  toggleTimeSlot(day: string, hour: string) {
    // Логика для переключения состояния временного слота
  }

  isTimeSlotActive(day: string, hour: string): boolean {
    // Логика для определения, активен ли временной слот
    return false; // Примерная реализация
  }

}

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
      icon: 'bi bi-camera-video', // Иконка Bootstrap для камеры
      enabled: true,
      expanded: false,
    },
    {
      title: 'Куратор марафонов',
      description: 'Сотрудник сможет курировать марафоны и онлайн-курсы',
      icon: 'bi bi-trophy', // Иконка Bootstrap для трофея
      enabled: false,
      expanded: false,
    },
    {
      title: 'Администратор',
      description: 'Сотрудник сможет администрировать учебный процесс',
      icon: 'bi bi-person-badge', // Иконка Bootstrap для бейджа
      enabled: false,
      expanded: false,
    },
  ];

  selectedLanguages: string[] = [];
  availableLanguages = [
    { name: 'Английский' },
    { name: 'Русский' },
    { name: 'Французский' },
    // Добавьте другие языки по необходимости
  ];

  days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  togglePossibility(possibility: any): void {
    possibility.expanded = !possibility.expanded;
  }

  fillSchedule(): void {
    // Логика заполнения графика (по умолчанию)
    console.log('Заполнить график');
  }

  fillTeacherSchedule(): void {
    // Логика заполнения графика учителем
    console.log('Заполнить график учителя');
  }

  toggleTimeSlot(day: string, hour: string): void {
    // Логика переключения времени
    console.log(`Время выбрано: ${day}, ${hour}`);
  }

  isTimeSlotActive(day: string, hour: string): boolean {
    // Логика проверки активности слота (например, проверить, заполнено ли время)
    return false;
  }

}

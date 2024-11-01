import { Component, AfterViewInit } from '@angular/core';
import { Tooltip } from 'bootstrap';

@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.css']
})
export class MaterialsComponent implements AfterViewInit {
document: any;

  ngAfterViewInit(): void {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
      new Tooltip(tooltipTriggerEl);
    });
  }

  selectedFile: File | null = null;
  courses = [
    { id: 1, name: 'A1', letter: 'A' }
  ];

  selectedCourseId: number | null = null;
  showDeleteModal = false;

  // Функция для обработки выбора файла
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Выбранный файл:', this.selectedFile.name);
    }
  }

  // Открытие модального окна удаления
  openDeleteModal(courseId: number): void {
    this.selectedCourseId = courseId;
    this.showDeleteModal = true;
  }

  // Закрытие модального окна удаления
  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  // Удаление курса
  deleteCourse(): void {
    if (this.selectedCourseId !== null) {
      this.courses = this.courses.filter(course => course.id !== this.selectedCourseId);
      this.selectedCourseId = null;
      this.closeDeleteModal();
    }
  }

  //фильтры => oсновные

  isFilterModalOpen = false;
  selectedFilters: any = {}; // Объект для хранения выбранных значений фильтров

  filters = [
    { label: 'Язык', placeholder: 'Выберите язык', type: 'language', options: ['Русский', 'Английский', 'Испанский'] },
    { label: 'Возраст', placeholder: 'Выберите возраст', type: 'age', options: ['Дети', 'Подростки', 'Взрослые'] },
    { label: 'Уровень', placeholder: 'Выберите уровень', type: 'level', options: ['Начальный', 'Средний', 'Продвинутый'] },
    { label: 'Тип', placeholder: 'Выберите тип', type: 'type', options: ['Общий', 'Бизнес', 'Для путешествий'] },
    { label: 'Навыки', placeholder: 'Выберите навык', type: 'skills', options: ['Грамматика', 'Лексика', 'Письмо'] },
    { label: 'Время', placeholder: 'Выберите время', type: 'time', options: ['Утро', 'День', 'Вечер'] },
    { label: 'Грамматика', placeholder: 'Введите тип', type: 'grammar', options: ['Основы', 'Продвинутый'] },
    { label: 'Лексика', placeholder: 'Выберите лексику', type: 'vocabulary', options: ['Базовая', 'Продвинутая'] },
    { label: 'Функции', placeholder: 'Выберите функции', type: 'functions', options: ['Разговор', 'Письмо', 'Чтение'] },
    { label: 'Другое', placeholder: 'Выберите тег', type: 'other', options: ['Дополнительный', 'Специальный'] }
  ];



  openFilterModal(): void {
    this.isFilterModalOpen = true;
  }

  closeFilterModal(): void {
    this.isFilterModalOpen = false;
  }

  resetFilters(): void {
    this.selectedFilters = {}; // Сбрасываем все выбранные фильтры
    console.log('Сбросить все фильтры');
  }

  applyFilters(): void {
    console.log('Применить фильтры', this.selectedFilters);
    // Логика применения выбранных фильтров
  }

  ///////////////////////////////// интерактивная карта
  isCreateBoardModalOpen = false;

  openCreateBoardModal(): void {
    this.isCreateBoardModalOpen = true;
    console.log('Открытие модального окна для создания новой доски');
  }

  closeCreateBoardModal(): void {
    this.isCreateBoardModalOpen = false;
    console.log('Закрытие модального окна для создания новой доски');
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('coverUpload') as HTMLInputElement;
    fileInput?.click();
  }
}

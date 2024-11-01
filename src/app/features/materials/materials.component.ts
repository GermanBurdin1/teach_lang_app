import { Component } from '@angular/core';

@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.css']
})
export class MaterialsComponent {
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
}

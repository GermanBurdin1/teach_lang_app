import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileUploadService } from '../../../services/file-upload.service';

export interface UploadedFile {
  id: number;
  filename: string;
  url: string;
  mimetype: string;
  courseId: string;
  createdAt: string;
  tag?: string;
  description?: string;
}

@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.css']
})
export class MaterialsComponent implements OnInit {
  courseId!: string;
  showDropdown = false;
  sections: string[] = [];
  hoveredSection: string | null = null;
  subSections: { [key: string]: string[] } = {};
  files: { [key: string]: UploadedFile[] } = {};
  sectionsOptions = ['Грамматика', 'Фонетика', 'Лексика', 'Лайфхаки'];
  selectedSection: string | null = null;
  selectedSubSection: string | null = null;
  isUploadModalOpen = false;

  // Переменные для модального окна
  mediaTitle: string = '';
  mediaTag: string = '';
  mediaDescription: string = '';
  selectedCover: File | null = null;
  selectedFile: File | null = null;
  uploadType: string = '';

  constructor(private route: ActivatedRoute, private fileUploadService: FileUploadService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.courseId = params.get('id')!;
      console.log('Открыт курс с ID:', this.courseId);
      this.loadFiles();
    });

    // Загружаем сохранённые данные
    this.loadSections();
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  addSection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const sectionName = target.value;

    if (sectionName && !this.sections.includes(sectionName)) {
      this.sections.push(sectionName);
      this.subSections[sectionName] = [];
      this.saveSections();
    }
  }

  removeSection(sectionName: string): void {
    this.sections = this.sections.filter(sec => sec !== sectionName);
    delete this.subSections[sectionName];
    this.saveSections();
  }

  addSubSection(sectionName: string): void {
    const newSubSection = prompt(`Введите название подраздела для ${sectionName}:`);
    if (newSubSection) {
      this.subSections[sectionName].push(newSubSection);
      this.saveSections();
    }
  }

  saveSections(): void {
    localStorage.setItem('sections', JSON.stringify(this.sections));
    localStorage.setItem('subSections', JSON.stringify(this.subSections));
  }

  loadSections(): void {
    const savedSections = localStorage.getItem('sections');
    const savedSubSections = localStorage.getItem('subSections');

    if (savedSections) {
      this.sections = JSON.parse(savedSections);
    }
    if (savedSubSections) {
      this.subSections = JSON.parse(savedSubSections);
    }
  }

  addMaterial(event: Event, type: string, section: string, subSection?: string): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
      this.selectedSection = section;
      this.selectedSubSection = subSection || null;
      this.uploadType = type;

      // Открываем модальное окно
      this.openUploadModal(type, section, subSection);
    }
  }


  // Открытие модального окна и сохранение типа загружаемого медиа
  openUploadModal(type: string, section: string, subSection?: string): void {
    this.uploadType = type;
    this.selectedSection = section;
    this.selectedSubSection = subSection || null;

    // Включаем флаг, чтобы показать модалку
    this.isUploadModalOpen = true;
  }

  closeUploadModal(): void {
    this.isUploadModalOpen = false;
  }

  // Выбор файла
  selectFile(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
    }
  }

  // Выбор обложки
  selectCoverImage(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedCover = target.files[0];
    }
  }

  // Подтверждение загрузки файла
  confirmUpload(): void {
    if (!this.selectedFile || !this.mediaTitle) {
      alert('Введите название и выберите файл перед загрузкой!');
      return;
    }

    this.fileUploadService.uploadFile(this.selectedFile, this.courseId).subscribe({
      next: (response) => {
        const uploadedFile: UploadedFile = {
          id: response.id, // ✅ Теперь приходит с бэкенда
          filename: this.mediaTitle,
          url: response.url,
          mimetype: this.uploadType,
          tag: this.mediaTag || undefined,
          description: this.mediaDescription || undefined,
          courseId: this.courseId,
          createdAt: response.createdAt,
        };

        this.saveFile(uploadedFile);
      },
      error: (err) => {
        console.error('Ошибка загрузки файла:', err);
        alert('Ошибка загрузки файла.');
      }
    });

    this.closeUploadModal();
  }


  // Сохранение загруженного файла в структуру данных
  saveFile(file: UploadedFile): void {
    const sectionKey = this.selectedSection ?? 'default';
    if (!this.files[sectionKey]) {
      this.files[sectionKey] = [];
    }
    this.files[sectionKey].push(file);
  }

  loadFiles(): void {
    this.fileUploadService.getFiles(this.courseId).subscribe({
      next: (files) => {
        console.log('Полученные файлы:', files);

        if (!files || files.length === 0) {
          console.warn(`Нет файлов для курса ${this.courseId}`);
          this.files = {}; // Убедимся, что объект пуст
          return;
        }

        this.files = files.reduce<{ [key: string]: UploadedFile[] }>((acc, fileData) => {
          const file: UploadedFile = {
            id: fileData.id,
            filename: fileData.filename,
            url: fileData.url,
            mimetype: fileData.mimetype, // ✅ Теперь TypeScript не будет ругаться
            courseId: fileData.courseId,
            createdAt: fileData.createdAt
          };

          if (!acc[file.mimetype]) {
            acc[file.mimetype] = [];
          }
          acc[file.mimetype].push(file);

          return acc;
        }, {});
      },
      error: (err) => console.error('Ошибка загрузки файлов:', err)
    });
  }

}

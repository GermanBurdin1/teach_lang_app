import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Material } from '../../../services/material.service';
import { UploadedFile } from '../../../services/file-upload.service';

export interface AddMaterialModalData {
  section: string;
  lesson?: string;
  subSection?: string;
  courseId: string;
  trainerMaterials: Material[];
  loadingTrainerMaterials: boolean;
}

@Component({
  selector: 'app-add-material-modal',
  templateUrl: './add-material-modal.component.html',
  styleUrls: ['./add-material-modal.component.css']
})
export class AddMaterialModalComponent implements OnInit {
  showExistingMaterials = false;
  newMaterial = {
    title: '',
    type: 'text' as 'text' | 'audio' | 'video' | 'pdf' | 'image',
    content: '',
    description: '',
    tag: '',
    coverImage: null as File | null
  };
  
  selectedFile: File | null = null;
  filePreview: string | null = null;
  isDragOver = false;
  maxFileSize = 50 * 1024 * 1024; // 50MB

  constructor(
    public dialogRef: MatDialogRef<AddMaterialModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddMaterialModalData
  ) {}

  ngOnInit(): void {
    // Инициализация
  }

  toggleExistingMaterials(): void {
    this.showExistingMaterials = !this.showExistingMaterials;
  }

  needsFileUpload(): boolean {
    return ['audio', 'video', 'pdf', 'image'].includes(this.newMaterial.type);
  }

  getAcceptedFileTypes(): string {
    switch (this.newMaterial.type) {
      case 'audio':
        return 'audio/*';
      case 'video':
        return 'video/*';
      case 'pdf':
        return 'application/pdf';
      case 'image':
        return 'image/*';
      default:
        return '*';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (file.size > this.maxFileSize) {
      alert(`Le fichier est trop volumineux. Taille maximale: ${this.formatFileSize(this.maxFileSize)}`);
      return;
    }

    this.selectedFile = file;

    if (this.newMaterial.type === 'image' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.filePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.filePreview = null;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getMaterialTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      text: 'fas fa-file-alt',
      audio: 'fas fa-music',
      video: 'fas fa-video',
      pdf: 'fas fa-file-pdf',
      image: 'fas fa-image'
    };
    return icons[type] || 'fas fa-file';
  }

  addExistingMaterial(material: Material): void {
    this.dialogRef.close({ action: 'addExisting', material });
  }

  createMaterial(): void {
    if (!this.newMaterial.title.trim()) {
      return;
    }

    if (this.needsFileUpload() && !this.selectedFile) {
      return;
    }

    if (this.newMaterial.type === 'text' && !this.newMaterial.content.trim()) {
      return;
    }

    this.dialogRef.close({
      action: 'create',
      material: {
        ...this.newMaterial,
        file: this.selectedFile
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}



import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HomeworkService } from '../../../services/homework.service';
import { environment } from '../../../../../environment';

export interface HomeworkModalData {
  type: 'task' | 'question' | 'material';
  title: string;
  itemId: string;
}

@Component({
  selector: 'app-homework-modal',
  templateUrl: './homework-modal.component.html',
  styleUrls: ['./homework-modal.component.css']
})
export class HomeworkModalComponent implements OnInit {
  homeworkTitle = '';
  homeworkDescription = '';
  dueDate = '';
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<HomeworkModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HomeworkModalData
    // homeworkService удален, так как не используется
  ) {}

  ngOnInit() {
    // Définir le titre par défaut
    this.homeworkTitle = this.data.title;
    
    // Définir l'échéance à demain par défaut
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.dueDate = tomorrow.toISOString().split('T')[0];
  }

  getTypeTitle(): string {
    switch (this.data.type) {
      case 'task': return 'Tâche';
      case 'question': return 'Question';
      case 'material': return 'Matériel';
      default: return 'Devoir';
    }
  }

  getTypeIcon(): string {
    switch (this.data.type) {
      case 'task': return '📝';
      case 'question': return '❓';
      case 'material': return '📚';
      default: return '📋';
    }
  }

  onSave() {
    if (!this.homeworkTitle.trim() || !this.homeworkDescription.trim() || !this.dueDate) {
      return;
    }

    this.isSaving = true;

    const homeworkData = {
      title: this.homeworkTitle.trim(),
      description: this.homeworkDescription.trim(),
      dueDate: new Date(this.dueDate),
      status: 'assigned',
      type: this.data.type,
      sourceItemId: this.data.itemId,
      createdAt: new Date()
    };

    // Simulation de la sauvegarde
    window.setTimeout(() => {
      if (!environment.production) {
        console.log('💾 Sauvegarde du devoir:', homeworkData);
      }
      
      // TODO: Sauvegarde réelle via HomeworkService
      // this.homeworkService.createHomework(homeworkData).subscribe(...)
      
      this.isSaving = false;
      this.dialogRef.close(homeworkData);
    }, 1000);
  }

  onCancel() {
    this.dialogRef.close();
  }
} 
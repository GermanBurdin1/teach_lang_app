import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HomeworkService } from '../../../services/homework.service';

export interface HomeworkModalData {
  type: 'task' | 'question' | 'material';
  title: string;
  itemId: string;
}

// TODO : ajouter validation des données et gestion d'erreurs
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
    @Inject(MAT_DIALOG_DATA) public data: HomeworkModalData,
    private homeworkService: HomeworkService
  ) {}

  ngOnInit() {
    // on définit le titre par défaut
    this.homeworkTitle = this.data.title;
    
    // on définit l'échéance à demain par défaut
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

    // simulation de la sauvegarde
    setTimeout(() => {
      console.log('[HomeworkModal] Sauvegarde du devoir:', homeworkData);
      
      // TODO: sauvegarde réelle via HomeworkService
      // this.homeworkService.createHomework(homeworkData).subscribe(...)
      
      this.isSaving = false;
      this.dialogRef.close(homeworkData);
    }, 1000);
  }

  onCancel() {
    this.dialogRef.close();
  }
} 
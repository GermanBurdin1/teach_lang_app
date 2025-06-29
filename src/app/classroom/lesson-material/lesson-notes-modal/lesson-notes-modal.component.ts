import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LessonNotesService, LessonNote } from '../../../services/lesson-notes.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

export interface LessonNotesModalData {
  lessonId: string;
  section: 'tasks' | 'questions' | 'materials';
  itemId: string;
  itemText: string;
}

@Component({
  selector: 'app-lesson-notes-modal',
  templateUrl: './lesson-notes-modal.component.html',
  styleUrls: ['./lesson-notes-modal.component.css']
})
export class LessonNotesModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private contentChanges$ = new Subject<string>();
  
  noteContent = '';
  isSaving = false;
  lastSaved: Date | null = null;
  
  constructor(
    public dialogRef: MatDialogRef<LessonNotesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LessonNotesModalData,
    private lessonNotesService: LessonNotesService
  ) {}

  ngOnInit() {
    // Загружаем существующую заметку если есть
    const existingNote = this.lessonNotesService.getNoteForItem(this.data.section, this.data.itemId);
    if (existingNote) {
      this.noteContent = existingNote.content;
      this.lastSaved = existingNote.updatedAt;
    }

    // Автосохранение при изменении содержимого
    this.contentChanges$.pipe(
      debounceTime(2000), // Ждем 2 секунды после последнего изменения
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(content => {
      this.saveNote(content);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onContentChange(content: string) {
    this.noteContent = content;
    this.contentChanges$.next(content);
  }

  getFormattedDate(): string {
    if (!this.lastSaved) return '';
    return this.lastSaved.toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private saveNote(content: string) {
    if (!content.trim()) return;
    
    this.isSaving = true;
    
    // Имитируем асинхронное сохранение
    setTimeout(() => {
      this.lessonNotesService.addOrUpdateNote(
        this.data.section,
        this.data.itemId,
        this.data.itemText,
        content
      );
      
      this.isSaving = false;
      this.lastSaved = new Date();
    }, 500);
  }

  getSectionTitle(): string {
    switch (this.data.section) {
      case 'tasks': return 'Отработка задания';
      case 'questions': return 'Отработка вопроса';
      case 'materials': return 'Отработка материала';
      default: return 'Конспект';
    }
  }

  getSectionIcon(): string {
    switch (this.data.section) {
      case 'tasks': return '📝';
      case 'questions': return '❓';
      case 'materials': return '📚';
      default: return '📋';
    }
  }

  onSave() {
    this.saveNote(this.noteContent);
    this.dialogRef.close(this.noteContent);
  }

  onClose() {
    if (this.noteContent.trim()) {
      this.saveNote(this.noteContent);
    }
    this.dialogRef.close();
  }
} 
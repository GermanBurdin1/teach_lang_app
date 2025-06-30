import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LessonNotesService, LessonNote } from '../../../services/lesson-notes.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

export interface LessonNotesModalData {
  lessonId: string;
  section: 'tasks' | 'questions' | 'materials';
  itemId: string;
  itemText: string;
  lessonData?: {
    studentTasks?: string[];
    teacherTasks?: string[];
    studentQuestions?: string[];
    teacherQuestions?: string[];
    materials?: any[];
  };
}

@Component({
  selector: 'app-lesson-notes-modal',
  templateUrl: './lesson-notes-modal.component.html',
  styleUrls: ['./lesson-notes-modal.component.css']
})
export class LessonNotesModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private contentChanges$ = new Subject<string>();
  
  // Содержимое для каждого раздела
  tasksContent = '';
  questionsContent = '';
  materialsContent = '';
  
  isSaving = false;
  lastSaved: Date | null = null;
  
  constructor(
    public dialogRef: MatDialogRef<LessonNotesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LessonNotesModalData,
    private lessonNotesService: LessonNotesService
  ) {}

  ngOnInit() {
    // Инициализируем заметки для урока
    this.lessonNotesService.initNotesForLesson(this.data.lessonId);
    
    // Подписываемся на все заметки урока
    this.lessonNotesService.notes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(notes => {
      this.loadAccumulatedNotes(notes);
    });

    // Автосохранение при изменении содержимого
    this.contentChanges$.pipe(
      debounceTime(2000), // Ждем 2 секунды после последнего изменения
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(content => {
      this.saveCurrentSectionNote(content);
    });
  }

  private loadAccumulatedNotes(notes: any) {
    // Загружаем накопленные заметки для каждого раздела
    this.tasksContent = this.buildAccumulatedContent(notes.tasks, 'tasks');
    this.questionsContent = this.buildAccumulatedContent(notes.questions, 'questions');
    this.materialsContent = this.buildAccumulatedContent(notes.materials, 'materials');
    
    // Определяем последнее время сохранения
    const allNotes = [...notes.tasks, ...notes.questions, ...notes.materials];
    if (allNotes.length > 0) {
      this.lastSaved = allNotes.reduce((latest, note) => 
        !latest || note.updatedAt > latest ? note.updatedAt : latest, null);
    }
  }

  private buildAccumulatedContent(sectionNotes: LessonNote[], section: 'tasks' | 'questions' | 'materials'): string {
    if (!sectionNotes || sectionNotes.length === 0) {
      return '';
    }

    // Сортируем заметки по времени создания
    const sortedNotes = sectionNotes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Если это активный раздел, показываем только заметку для текущего элемента
    if (section === this.data.section) {
      const currentNote = sortedNotes.find(note => note.itemId === this.data.itemId);
      return currentNote ? currentNote.content : '';
    }
    
    // Для неактивных разделов объединяем все заметки
    return sortedNotes.map(note => {
      const timestamp = note.updatedAt.toLocaleString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `[${timestamp}] ${note.itemText}:\n${note.content}`;
    }).join('\n\n---\n\n');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Методы для обработки изменений в каждом разделе
  onTasksContentChange(content: string) {
    // Обновляем содержимое только если это активный раздел
    if (this.data.section === 'tasks') {
      this.tasksContent = content;
      this.contentChanges$.next(content);
    }
  }

  onQuestionsContentChange(content: string) {
    // Обновляем содержимое только если это активный раздел
    if (this.data.section === 'questions') {
      this.questionsContent = content;
      this.contentChanges$.next(content);
    }
  }

  onMaterialsContentChange(content: string) {
    // Обновляем содержимое только если это активный раздел
    if (this.data.section === 'materials') {
      this.materialsContent = content;
      this.contentChanges$.next(content);
    }
  }

  getFormattedDate(): string {
    if (!this.lastSaved) return '';
    return this.lastSaved.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private saveCurrentSectionNote(content: string) {
    if (!content.trim()) return;
    
    this.isSaving = true;
    
    // Сохраняем только новый контент для текущего элемента
    const currentSectionContent = this.getCurrentSectionEditableContent();
    
    // Имитируем асинхронное сохранение
    setTimeout(() => {
      this.lessonNotesService.addOrUpdateNote(
        this.data.section,
        this.data.itemId,
        this.data.itemText,
        currentSectionContent
      );
      
      this.isSaving = false;
      this.lastSaved = new Date();
    }, 500);
  }

  private getCurrentSectionEditableContent(): string {
    // Возвращаем содержимое только для активного раздела
    switch (this.data.section) {
      case 'tasks': return this.tasksContent;
      case 'questions': return this.questionsContent; 
      case 'materials': return this.materialsContent;
      default: return '';
    }
  }

  private saveAllNotes() {
    this.isSaving = true;
    
    // Сохраняем только активный раздел для текущего элемента
    const currentContent = this.getCurrentSectionEditableContent();
    
    if (currentContent.trim()) {
      setTimeout(() => {
        this.lessonNotesService.addOrUpdateNote(
          this.data.section,
          this.data.itemId,
          this.data.itemText,
          currentContent
        );
        
        this.isSaving = false;
        this.lastSaved = new Date();
      }, 300);
    } else {
      this.isSaving = false;
    }
  }

  getSectionTitle(): string {
    switch (this.data.section) {
      case 'tasks': return 'Travail sur la tâche';
      case 'questions': return 'Travail sur la question';
      case 'materials': return 'Travail sur le matériau';
      default: return 'Notes';
    }
  }

  // Методы для работы с новой структурой элементов
  isCurrentItem(itemIdentifier: string): boolean {
    // Для простых строковых элементов (задачи и вопросы)
    // Сравниваем с текстом самого элемента, так как itemId содержит текст задачи/вопроса
    if (this.data.itemId === this.data.itemText) {
      // Если это текущий элемент, проверяем соответствие
      const currentItemIndex = this.getCurrentItemIndex();
      return itemIdentifier === currentItemIndex;
    }
    
    // Для материалов
    if (this.data.section === 'materials') {
      return this.data.itemId === itemIdentifier;
    }
    
    // Fallback для совместимости
    return this.data.itemId === itemIdentifier;
  }

  private getCurrentItemIndex(): string {
    if (this.data.section === 'tasks') {
      // Ищем индекс в задачах студента
      const studentIndex = this.data.lessonData?.studentTasks?.findIndex(task => task === this.data.itemText);
      if (studentIndex !== undefined && studentIndex >= 0) {
        return 'student-task-' + studentIndex;
      }
      
      // Ищем индекс в задачах преподавателя
      const teacherIndex = this.data.lessonData?.teacherTasks?.findIndex(task => task === this.data.itemText);
      if (teacherIndex !== undefined && teacherIndex >= 0) {
        return 'teacher-task-' + teacherIndex;
      }
    }
    
    if (this.data.section === 'questions') {
      // Ищем индекс в вопросах студента
      const studentIndex = this.data.lessonData?.studentQuestions?.findIndex(question => question === this.data.itemText);
      if (studentIndex !== undefined && studentIndex >= 0) {
        return 'student-question-' + studentIndex;
      }
      
      // Ищем индекс в вопросах преподавателя
      const teacherIndex = this.data.lessonData?.teacherQuestions?.findIndex(question => question === this.data.itemText);
      if (teacherIndex !== undefined && teacherIndex >= 0) {
        return 'teacher-question-' + teacherIndex;
      }
    }
    
    return this.data.itemId; // Fallback
  }

  getMaterialId(material: any): string {
    return material?.id || material?.title || material?.name || 'unknown';
  }

  getMaterialTypeIcon(materialType: string): string {
    switch (materialType) {
      case 'text': return '📄';
      case 'audio': return '🎧';
      case 'video': return '🎬';
      case 'pdf': return '📔';
      case 'image': return '🖼️';
      default: return '📎';
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
    this.saveAllNotes();
    
    // Возвращаем текущее состояние заметок урока
    const currentNotes = this.lessonNotesService.exportNotes();
    this.dialogRef.close({
      section: this.data.section,
      content: this.getCurrentSectionEditableContent(),
      allNotes: currentNotes
    });
  }

  onClose() {
    // Сохраняем активный раздел при закрытии, если есть содержимое
    const currentContent = this.getCurrentSectionEditableContent();
    if (currentContent.trim()) {
      this.saveAllNotes();
    }
    this.dialogRef.close();
  }
} 
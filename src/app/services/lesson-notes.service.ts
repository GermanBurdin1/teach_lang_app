import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { AuthService } from './auth.service';

export interface LessonNote {
  id: string;
  lessonId: string;
  section: 'tasks' | 'questions' | 'materials';
  itemId: string;
  itemText: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonNotesData {
  lessonId: string;
  tasks: LessonNote[];
  questions: LessonNote[];
  materials: LessonNote[];
}

// Backend format for lesson notes
export interface BackendLessonNotes {
  id: string;
  lessonId: string;
  tasksContent: string | null;
  questionsContent: string | null;
  materialsContent: string | null;
  createdBy: string;
  createdByRole: 'student' | 'teacher';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LessonNotesService {
  private baseUrl = `http://localhost:3004/lessons`;
  
  private notesSubject = new BehaviorSubject<LessonNotesData>({
    lessonId: '',
    tasks: [],
    questions: [],
    materials: []
  });

  public notes$ = this.notesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  async initNotesForLesson(lessonId: string) {
    try {
      // Загружаем заметки из базы данных
      const backendNotes = await this.loadNotesFromDatabase(lessonId);
      
      if (backendNotes) {
        // Конвертируем backend формат в frontend формат
        const frontendNotes = this.convertBackendToFrontend(backendNotes);
        this.notesSubject.next(frontendNotes);
        console.log('📝 Заметки загружены из базы данных:', frontendNotes);
      } else {
        // Если в базе нет, пробуем загрузить из localStorage как fallback
        const existingNotes = this.getNotesFromStorage(lessonId);
        this.notesSubject.next({
          lessonId,
          tasks: existingNotes.tasks || [],
          questions: existingNotes.questions || [],
          materials: existingNotes.materials || []
        });
        console.log('📝 Заметки загружены из localStorage (fallback)');
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке заметок из базы:', error);
      // Fallback к localStorage при ошибке
      const existingNotes = this.getNotesFromStorage(lessonId);
      this.notesSubject.next({
        lessonId,
        tasks: existingNotes.tasks || [],
        questions: existingNotes.questions || [],
        materials: existingNotes.materials || []
      });
    }
  }

  async addOrUpdateNote(section: 'tasks' | 'questions' | 'materials', itemId: string, itemText: string, content: string) {
    const currentNotes = this.notesSubject.value;
    const existingNoteIndex = currentNotes[section].findIndex(note => note.itemId === itemId);
    
    const noteData: LessonNote = {
      id: existingNoteIndex >= 0 ? currentNotes[section][existingNoteIndex].id : this.generateId(),
      lessonId: currentNotes.lessonId,
      section,
      itemId,
      itemText,
      content,
      createdAt: existingNoteIndex >= 0 ? currentNotes[section][existingNoteIndex].createdAt : new Date(),
      updatedAt: new Date()
    };

    if (existingNoteIndex >= 0) {
      currentNotes[section][existingNoteIndex] = noteData;
    } else {
      currentNotes[section].push(noteData);
    }

    this.notesSubject.next(currentNotes);
    
    // Сохраняем в localStorage для мгновенного доступа
    this.saveNotesToStorage(currentNotes);
    
    // Сохраняем в базу данных асинхронно
    try {
      await this.saveNotesToDatabase(currentNotes);
      console.log('✅ Заметки сохранены в базу данных');
    } catch (error) {
      console.error('❌ Ошибка при сохранении заметок в базу:', error);
    }
  }

  getNoteForItem(section: 'tasks' | 'questions' | 'materials', itemId: string): LessonNote | undefined {
    const currentNotes = this.notesSubject.value;
    return currentNotes[section].find(note => note.itemId === itemId);
  }

  // Загрузка заметок из базы данных
  private async loadNotesFromDatabase(lessonId: string): Promise<BackendLessonNotes | null> {
    try {
      const response = await this.http.get<BackendLessonNotes>(`${this.baseUrl}/${lessonId}/notes`).toPromise();
      return response || null;
    } catch (error) {
      console.error('❌ Ошибка при загрузке заметок из API:', error);
      return null;
    }
  }

  // Сохранение заметок в базу данных
  private async saveNotesToDatabase(notes: LessonNotesData): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    const userRole = this.authService.currentRole;
    
    if (!currentUser || !userRole) {
      throw new Error('Пользователь не авторизован');
    }

    // Конвертируем frontend формат в backend формат
    const backendFormat = this.convertFrontendToBackend(notes, currentUser.id, userRole as 'student' | 'teacher');
    
    try {
      await this.http.post(`${this.baseUrl}/${notes.lessonId}/notes`, backendFormat).toPromise();
    } catch (error) {
      console.error('❌ Ошибка при сохранении заметок в API:', error);
      throw error;
    }
  }

  // Конвертация из backend формата в frontend формат
  private convertBackendToFrontend(backendNotes: BackendLessonNotes): LessonNotesData {
    const frontendNotes: LessonNotesData = {
      lessonId: backendNotes.lessonId,
      tasks: [],
      questions: [],
      materials: []
    };

    // Конвертируем tasksContent
    if (backendNotes.tasksContent) {
      try {
        const tasksData = JSON.parse(backendNotes.tasksContent);
        if (Array.isArray(tasksData)) {
          frontendNotes.tasks = tasksData.map(task => ({
            ...task,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt)
          }));
        }
      } catch (error) {
        console.error('❌ Ошибка при парсинге tasksContent:', error);
      }
    }

    // Конвертируем questionsContent
    if (backendNotes.questionsContent) {
      try {
        const questionsData = JSON.parse(backendNotes.questionsContent);
        if (Array.isArray(questionsData)) {
          frontendNotes.questions = questionsData.map(question => ({
            ...question,
            createdAt: new Date(question.createdAt),
            updatedAt: new Date(question.updatedAt)
          }));
        }
      } catch (error) {
        console.error('❌ Ошибка при парсинге questionsContent:', error);
      }
    }

    // Конвертируем materialsContent
    if (backendNotes.materialsContent) {
      try {
        const materialsData = JSON.parse(backendNotes.materialsContent);
        if (Array.isArray(materialsData)) {
          frontendNotes.materials = materialsData.map(material => ({
            ...material,
            createdAt: new Date(material.createdAt),
            updatedAt: new Date(material.updatedAt)
          }));
        }
      } catch (error) {
        console.error('❌ Ошибка при парсинге materialsContent:', error);
      }
    }

    return frontendNotes;
  }

  // Конвертация из frontend формата в backend формат
  private convertFrontendToBackend(notes: LessonNotesData, createdBy: string, createdByRole: 'student' | 'teacher'): any {
    return {
      tasksContent: notes.tasks.length > 0 ? JSON.stringify(notes.tasks) : null,
      questionsContent: notes.questions.length > 0 ? JSON.stringify(notes.questions) : null,
      materialsContent: notes.materials.length > 0 ? JSON.stringify(notes.materials) : null,
      createdBy,
      createdByRole
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Fallback methods for localStorage
  private getNotesFromStorage(lessonId: string): LessonNotesData {
    const stored = localStorage.getItem(`lesson_notes_${lessonId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      ['tasks', 'questions', 'materials'].forEach(section => {
        if (parsed[section]) {
          parsed[section].forEach((note: any) => {
            note.createdAt = new Date(note.createdAt);
            note.updatedAt = new Date(note.updatedAt);
          });
        }
      });
      return parsed;
    }
    return { lessonId, tasks: [], questions: [], materials: [] };
  }

  private saveNotesToStorage(notes: LessonNotesData) {
    localStorage.setItem(`lesson_notes_${notes.lessonId}`, JSON.stringify(notes));
  }

  exportNotes(): LessonNotesData {
    return this.notesSubject.value;
  }

  async clearNotes(lessonId: string) {
    // Очищаем localStorage
    localStorage.removeItem(`lesson_notes_${lessonId}`);
    
    // Очищаем состояние
    this.notesSubject.next({
      lessonId: '',
      tasks: [],
      questions: [],
      materials: []
    });

    // Очищаем в базе данных
    try {
      const currentUser = this.authService.getCurrentUser();
      const userRole = this.authService.currentRole;
      
      if (currentUser && userRole) {
        await this.http.post(`${this.baseUrl}/${lessonId}/notes`, {
          tasksContent: null,
          questionsContent: null,
          materialsContent: null,
          createdBy: currentUser.id,
          createdByRole: userRole
        }).toPromise();
      }
    } catch (error) {
      console.error('❌ Ошибка при очистке заметок в базе:', error);
    }
  }
} 
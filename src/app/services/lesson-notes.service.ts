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

// TODO : ajouter synchronisation en temps réel des notes entre participants
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
      // on charge les notes depuis la base de données
      const backendNotes = await this.loadNotesFromDatabase(lessonId);
      
      if (backendNotes) {
        // on convertit le format backend en format frontend
        const frontendNotes = this.convertBackendToFrontend(backendNotes);
        this.notesSubject.next(frontendNotes);
        console.log('[LessonNotes] Notes chargées depuis la base de données:', frontendNotes);
      } else {
        // si rien en base, on essaie de charger depuis localStorage comme fallback
        const existingNotes = this.getNotesFromStorage(lessonId);
        this.notesSubject.next({
          lessonId,
          tasks: existingNotes.tasks || [],
          questions: existingNotes.questions || [],
          materials: existingNotes.materials || []
        });
        console.log('[LessonNotes] Notes chargées depuis localStorage (fallback)');
      }
    } catch (error) {
      console.error('[LessonNotes] Erreur lors du chargement des notes depuis la base:', error);
      // fallback vers localStorage en cas d'erreur
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
    
    // on sauvegarde dans localStorage pour un accès instantané
    this.saveNotesToStorage(currentNotes);
    
    // on sauvegarde dans la base de données de manière asynchrone
    try {
      await this.saveNotesToDatabase(currentNotes);
      console.log('[LessonNotes] Notes sauvegardées dans la base de données');
    } catch (error) {
      console.error('[LessonNotes] Erreur lors de la sauvegarde des notes en base:', error);
    }
  }

  getNoteForItem(section: 'tasks' | 'questions' | 'materials', itemId: string): LessonNote | undefined {
    const currentNotes = this.notesSubject.value;
    return currentNotes[section].find(note => note.itemId === itemId);
  }

  // chargement des notes depuis la base de données
  private async loadNotesFromDatabase(lessonId: string): Promise<BackendLessonNotes | null> {
    try {
      const response = await this.http.get<BackendLessonNotes>(`${this.baseUrl}/${lessonId}/notes`).toPromise();
      return response || null;
    } catch (error) {
      console.error('[LessonNotes] Erreur lors du chargement des notes depuis l\'API:', error);
      return null;
    }
  }

  // sauvegarde des notes dans la base de données
  private async saveNotesToDatabase(notes: LessonNotesData): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    const userRole = this.authService.currentRole;
    
    if (!currentUser || !userRole) {
      throw new Error('Utilisateur non autorisé');
    }

    // on convertit le format frontend en format backend
    const backendFormat = this.convertFrontendToBackend(notes, currentUser.id, userRole as 'student' | 'teacher');
    
    try {
      await this.http.post(`${this.baseUrl}/${notes.lessonId}/notes`, backendFormat).toPromise();
    } catch (error) {
      console.error('[LessonNotes] Erreur lors de la sauvegarde des notes en API:', error);
      throw error;
    }
  }

  // on convertit le format backend en format frontend
  private convertBackendToFrontend(backendNotes: BackendLessonNotes): LessonNotesData {
    const frontendNotes: LessonNotesData = {
      lessonId: backendNotes.lessonId,
      tasks: [],
      questions: [],
      materials: []
    };

    // on convertit tasksContent
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
        console.error('[LessonNotes] Erreur lors du parsing de tasksContent:', error);
      }
    }

    // on convertit questionsContent
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
        console.error('[LessonNotes] Erreur lors du parsing de questionsContent:', error);
      }
    }

    // on convertit materialsContent
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
        console.error('[LessonNotes] Erreur lors du parsing de materialsContent:', error);
      }
    }

    return frontendNotes;
  }

  // on convertit le format frontend en format backend
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
      // on convertit les chaînes de date en objets Date
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
    // on vide le localStorage
    localStorage.removeItem(`lesson_notes_${lessonId}`);
    
    // on vide l'état
    this.notesSubject.next({
      lessonId: '',
      tasks: [],
      questions: [],
      materials: []
    });

    // on vide dans la base de données
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
      console.error('[LessonNotes] Erreur lors de la suppression des notes en base:', error);
    }
  }
} 
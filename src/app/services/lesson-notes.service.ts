import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class LessonNotesService {
  private notesSubject = new BehaviorSubject<LessonNotesData>({
    lessonId: '',
    tasks: [],
    questions: [],
    materials: []
  });

  public notes$ = this.notesSubject.asObservable();

  constructor() { }

  initNotesForLesson(lessonId: string) {
    const existingNotes = this.getNotesFromStorage(lessonId);
    this.notesSubject.next({
      lessonId,
      tasks: existingNotes.tasks || [],
      questions: existingNotes.questions || [],
      materials: existingNotes.materials || []
    });
  }

  addOrUpdateNote(section: 'tasks' | 'questions' | 'materials', itemId: string, itemText: string, content: string) {
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
    this.saveNotesToStorage(currentNotes);
  }

  getNoteForItem(section: 'tasks' | 'questions' | 'materials', itemId: string): LessonNote | undefined {
    const currentNotes = this.notesSubject.value;
    return currentNotes[section].find(note => note.itemId === itemId);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

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

  clearNotes(lessonId: string) {
    localStorage.removeItem(`lesson_notes_${lessonId}`);
    this.notesSubject.next({
      lessonId: '',
      tasks: [],
      questions: [],
      materials: []
    });
  }
} 
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment';

export interface Homework {
  id: string;
  title: string;
  description: string;
  assignedBy: string;
  assignedByName: string;
  assignedTo: string;
  assignedToName: string;
  lessonId?: string;
  lessonDate?: Date;
  assignedAt: Date;
  createdAt: Date; // date de création du devoir
  dueDate: Date;
  status: 'assigned' | 'submitted' | 'completed' | 'overdue' | 'unfinished' | 'finished';
  materialIds: string[]; // Linked materials
  submittedAt?: Date;
  teacherFeedback?: string;
  grade?: number;
  studentResponse?: string; // réponse de l'étudiant
  isLinkedToMaterials: boolean;
  createdInClass: boolean; // true si créé pendant le cours, false si dans TrainingComponent
  sourceType?: string; // type de source (task, question, material)
  sourceItemId?: string; // ID de l'élément source
  sourceItemText?: string; // texte de l'élément source
}

export interface CreateHomeworkRequest {
  lessonId: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  materialIds?: string[];
  sourceType?: string;
  sourceItemId?: string;
  sourceItemText?: string;
}

// TODO : ajouter système de notifications pour les devoirs
@Injectable({
  providedIn: 'root'
})
export class HomeworkService {
  private baseUrl = `${environment.apiUrl}/lessons`;
  private homeworkUpdated = new BehaviorSubject<boolean>(false);

  private homework$ = new BehaviorSubject<string[]>([]);

  private teacherHomework$ = new BehaviorSubject<Homework[]>([]);
  private studentHomework$ = new BehaviorSubject<Homework[]>([]);

  constructor(private http: HttpClient) {}

  getHomeworkStream() {
    return this.homework$.asObservable();
  }

  addHomework(item: string) {
    const current = this.homework$.getValue();
    if (!current.includes(item)) {
      this.homework$.next([...current, item]);
    }
  }

  reset() {
    this.homework$.next([]);
  }

  // ==================== nouverlles méthodes de LESSON-SERVICE ====================

  // Début de leçon
  startLesson(lessonId: string, startedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${lessonId}/start`, { startedBy });
  }

  // Fin de leçon
  endLesson(lessonId: string, endedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${lessonId}/end`, { endedBy });
  }

  getLessonWithTasksAndQuestions(lessonId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${lessonId}/details`);
  }

  addTaskToLesson(lessonId: string, title: string, description: string | null, createdBy: string, createdByRole: 'student' | 'teacher'): Observable<any> {
    return this.http.post(`${this.baseUrl}/${lessonId}/tasks`, {
      title,
      description,
      createdBy,
      createdByRole
    });
  }

  addQuestionToLesson(lessonId: string, question: string, createdBy: string, createdByRole: 'student' | 'teacher'): Observable<any> {
    return this.http.post(`${this.baseUrl}/${lessonId}/questions`, {
      question,
      createdBy,
      createdByRole
    });
  }

  completeTask(taskId: string, completedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks/${taskId}/complete`, { completedBy });
  }


  completeHomeworkItem(homeworkId: string, completedBy: string, studentResponse?: string): Observable<any> {
    const body: any = { completedBy };
    if (studentResponse) {
      body.studentResponse = studentResponse;
    }
    
    console.log('🔗 HomeworkService.completeHomeworkItem appelé:', {
      homeworkId,
      completedBy,
      studentResponse,
      body,
      url: `${this.baseUrl}/homework-item/${homeworkId}/complete`
    });
    
    return this.http.put(`${this.baseUrl}/homework-item/${homeworkId}/complete`, body);
  }

  completeQuestion(questionId: string, completedBy: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/questions/${questionId}/complete`, { completedBy });
  }

  gradeHomeworkItem(homeworkId: string, grade: number, teacherFeedback?: string): Observable<any> {
    const body: any = { grade };
    if (teacherFeedback) {
      body.teacherFeedback = teacherFeedback;
    }
    return this.http.put(`${this.baseUrl}/homework-item/${homeworkId}/grade`, body);
  }

  answerQuestion(questionId: string, answer: string, answeredBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/questions/${questionId}/answer`, { answer, answeredBy });
  }

  getTasksForLesson(lessonId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${lessonId}/tasks`);
  }

  // ==================== NEW HOMEWORK SYSTEM ====================

  getHomeworkForLesson(lessonId: string): Observable<Homework[]> {
    const url = `${this.baseUrl}/${lessonId}/homework`;
    console.log(`📋 [SERVICE] getHomeworkForLesson called for lessonId: ${lessonId}`);
    console.log(`📋 [SERVICE] Request URL: ${url}`);
    
    return this.http.get<Homework[]>(url).pipe(
      tap((homework: Homework[]) => {
        console.log(`📋 [SERVICE] getHomeworkForLesson response for ${lessonId}:`, homework);
      })
    );
  }

  // pour les étudiants - obtient les devoirs assignés à cet étudiant
  getHomeworkForStudent(studentId: string): Observable<Homework[]> {
    const url = `${this.baseUrl}/${studentId}/homework`;
    console.log(`[HomeworkService] Envoi de la requête étudiant vers: ${url}`);
    return this.http.get<Homework[]>(url).pipe(
      tap(homework => this.studentHomework$.next(homework))
    );
  }

  // pour les enseignants - obtient les devoirs créés par cet enseignant
  getHomeworkForTeacher(teacherId: string): Observable<Homework[]> {
    const url = `${this.baseUrl}/teacher/${teacherId}/homework`;
    console.log(`[HomeworkService] Envoi de la requête vers: ${url}`);
    return this.http.get<Homework[]>(url).pipe(
      tap(homework => this.teacherHomework$.next(homework))
    );
  }

  createHomework(lessonId: string, homework: Partial<Homework>): Observable<Homework> {
    return this.http.post<Homework>(`${this.baseUrl}/${lessonId}/homework`, homework);
  }

  updateHomeworkStatus(homeworkId: string, status: string): Observable<Homework> {
    return this.http.patch<Homework>(`${this.baseUrl}/homework/${homeworkId}/status`, { status });
  }

  addGradeAndFeedback(homeworkId: string, grade: number, feedback: string): Observable<Homework> {
    return this.http.patch<Homework>(`${this.baseUrl}/homework/${homeworkId}/grade`, { grade, feedback });
  }


  notifyHomeworkUpdated() {
    this.homeworkUpdated.next(true);
  }

  onHomeworkUpdated(): Observable<boolean> {
    return this.homeworkUpdated.asObservable();
  }

  filterHomework(filters: {
    teacherId?: string;
    studentId?: string;
    status?: Homework['status'];
    dateFrom?: Date;
    dateTo?: Date;
  }): Observable<Homework[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    
    return this.http.get<Homework[]>(`${this.baseUrl}/homework/filter?${params.toString()}`);
  }

  deleteHomework(homeworkId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/homework/${homeworkId}`);
  }

  getTeacherHomeworkStream(): Observable<Homework[]> {
    return this.teacherHomework$.asObservable();
  }

  getStudentHomeworkStream(): Observable<Homework[]> {
    return this.studentHomework$.asObservable();
  }

  addHomeworkToLocal(homework: Homework, isTeacher: boolean = false) {
    if (isTeacher) {
      const current = this.teacherHomework$.value;
      this.teacherHomework$.next([...current, homework]);
    } else {
      const current = this.studentHomework$.value;
      this.studentHomework$.next([...current, homework]);
    }
  }

  removeHomeworkFromLocal(homeworkId: string, isTeacher: boolean = false) {
    if (isTeacher) {
      const current = this.teacherHomework$.value;
      this.teacherHomework$.next(current.filter(h => h.id !== homeworkId));
    } else {
      const current = this.studentHomework$.value;
      this.studentHomework$.next(current.filter(h => h.id !== homeworkId));
    }
  }

  getQuestionsForLesson(lessonId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${lessonId}/questions`);
  }

  // ==================== création de devoirs ====================

  createHomeworkFromLesson(data: {
    lessonId: string;
    title: string;
    description: string;
    dueDate: Date;
    assignedBy: string;
    assignedTo: string;
    sourceType: 'task' | 'question' | 'material';
    sourceItemId: string;
    sourceItemText: string;
    materialIds?: string[];
  }): Observable<Homework> {
    console.log('[SERVICE] createHomeworkFromLesson called with:', data);
    
    const homeworkData = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      itemType: data.sourceType as 'task' | 'question' | 'material',
      originalItemId: data.sourceItemId,
      createdBy: data.assignedBy,
      createdByRole: 'teacher' as const
    };

    const url = `${this.baseUrl}/${data.lessonId}/homework`;
    console.log('création du devoir avec lesson-service:', {
      url,
      homeworkData
    });
    
    return this.http.post<Homework>(url, homeworkData).pipe(
      tap((response: Homework) => {
        console.log('[SERVICE hw] createHomeworkFromLesson response:', response);
      })
    );
  }



  // du training composant
  createHomeworkFromTraining(data: {
    title: string;
    description: string;
    dueDate: Date;
    assignedBy: string;
    assignedTo: string;
    lessonId?: string; // leçon lié
    materialIds?: string[];
  }): Observable<Homework> {
    const homeworkData = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      itemType: 'task' as const,  
      originalItemId: null, 
      createdBy: data.assignedBy,
      createdByRole: 'teacher' as const
    };

    if (data.lessonId) {
      const url = `${this.baseUrl}/${data.lessonId}/homework`;
      console.log(' création du devoir pour leçon:', {
        lessonId: data.lessonId,
        url,
        homeworkData
      });
      
      return this.http.post<Homework>(url, homeworkData).pipe(
        tap((response: Homework) => {
          console.log('[SERVICE] createHomeworkFromTraining response:', response);
        })
      );
    } else {
      const url = `${this.baseUrl}/homework/general`;
      console.log(' créa devoir:', {
        url,
        homeworkData
      });
      
      return this.http.post<Homework>(url, homeworkData).pipe(
        tap((response: Homework) => {
          console.log('✅ [SERVICE] createHomeworkFromTraining (general) response:', response);
        })
      );
    }
  }

  createHomeworkLegacy(homework: CreateHomeworkRequest): Observable<Homework> {
    if (!homework.lessonId) {
      throw new Error('lessonId is required');
    }
    return this.createHomework(homework.lessonId, homework);
  }
}

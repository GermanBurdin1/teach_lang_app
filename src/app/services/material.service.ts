import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';

export interface Material {
  id: string;
  title: string;
  type: 'text' | 'audio' | 'video' | 'pdf' | 'image';
  content: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  attachedLessons: string[]; // Array of lesson IDs
  tags: string[];
}

export interface AttachMaterialRequest {
  materialId: string;
  lessonId: string;
  teacherId: string;
  studentId: string;
}

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private baseUrl = `${API_ENDPOINTS.FILES}/materials`;

  private materials$ = new BehaviorSubject<Material[]>([]);
  private studentMaterials$ = new BehaviorSubject<Material[]>([]);

  // Subject для уведомления о прикреплении материалов к урокам
  private materialAttached$ = new Subject<{ materialId: string, lessonId: string }>();

  constructor(private http: HttpClient) {}

  // Получение всех материалов
  getMaterials(): Observable<Material[]> {
    return this.http.get<Material[]>(this.baseUrl);
  }

  // Получение всех материалов преподавателя
  getMaterialsForTeacher(teacherId: string): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/teacher/${teacherId}`);
  }

  // Получение материалов студента (прикрепленных к урокам)
  getMaterialsForStudent(studentId: string): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/student/${studentId}`);
  }

  // Получение материалов для уроков (прикрепленных к урокам)
  getLessonMaterials(userId: string): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/lesson-materials/${userId}`);
  }

  // Получение материалов конкретного урока
  getMaterialsByLessonId(lessonId: string): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/lesson/${lessonId}`);
  }

  // Создание нового материала
  createMaterial(material: Omit<Material, 'id' | 'createdAt' | 'attachedLessons'>): Observable<Material> {
    console.warn("in createMaterial:" , material)
    return this.http.post<Material>(this.baseUrl, {
      ...material,
      createdAt: new Date(),
      attachedLessons: []
    });
  }

  // Прикрепление материала к уроку
  attachMaterialToLesson(request: AttachMaterialRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attach`, request);
  }

  // Уведомление о прикреплении материала (вызывается после успешного прикрепления)
  notifyMaterialAttached(materialId: string, lessonId: string): void {
    this.materialAttached$.next({ materialId, lessonId });
  }

  // Подписка на уведомления о прикреплении материалов
  onMaterialAttached(): Observable<{ materialId: string, lessonId: string }> {
    return this.materialAttached$.asObservable();
  }

  // Открепление материала от урока
  detachMaterialFromLesson(materialId: string, lessonId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${materialId}/lessons/${lessonId}`);
  }

  // Удаление материала
  deleteMaterial(materialId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${materialId}`);
  }

  // Обновление материала
  updateMaterial(materialId: string, updates: Partial<Material>): Observable<Material> {
    return this.http.patch<Material>(`${this.baseUrl}/${materialId}`, updates);
  }

  // Поиск материалов
  searchMaterials(query: string, type?: string): Observable<Material[]> {
    const params = type ? `?query=${query}&type=${type}` : `?query=${query}`;
    return this.http.get<Material[]>(`${this.baseUrl}/search${params}`);
  }

  // Local state management
  getMaterialsStream(): Observable<Material[]> {
    return this.materials$.asObservable();
  }

  getStudentMaterialsStream(): Observable<Material[]> {
    return this.studentMaterials$.asObservable();
  }

  addMaterialToLocal(material: Material) {
    const current = this.materials$.value;
    this.materials$.next([...current, material]);
  }

  removeMaterialFromLocal(materialId: string) {
    const current = this.materials$.value;
    this.materials$.next(current.filter(m => m.id !== materialId));
  }
}

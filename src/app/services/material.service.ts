import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

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

// TODO : ajouter système de catégories pour les matériaux
@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private baseUrl = 'http://localhost:3008/materials';
  
  private materials$ = new BehaviorSubject<Material[]>([]);
  private studentMaterials$ = new BehaviorSubject<Material[]>([]);
  
  // Subject pour notifications d'attachement de matériaux aux cours
  private materialAttached$ = new Subject<{ materialId: string, lessonId: string }>();

  constructor(private http: HttpClient) {}

  // obtention de tous les matériaux
  getMaterials(): Observable<Material[]> {
    return this.http.get<Material[]>(this.baseUrl);
  }

  // obtention de tous les matériaux du professeur
  getMaterialsForTeacher(teacherId: string): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/teacher/${teacherId}`);
  }

  // obtention des matériaux étudiant (attachés aux cours)
  getMaterialsForStudent(studentId: string): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/student/${studentId}`);
  }

  // obtention des matériaux pour les cours (attachés aux cours)
  getLessonMaterials(userId: string): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/lesson-materials/${userId}`);
  }

  // obtention des matériaux d'un cours spécifique
  getMaterialsByLessonId(lessonId: string): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.baseUrl}/lesson/${lessonId}`);
  }

  // création d'un nouveau matériau
  createMaterial(material: Omit<Material, 'id' | 'createdAt' | 'attachedLessons'>): Observable<Material> {
    return this.http.post<Material>(this.baseUrl, {
      ...material,
      createdAt: new Date(),
      attachedLessons: []
    });
  }

  // attachement d'un matériau à un cours
  attachMaterialToLesson(request: AttachMaterialRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attach`, request);
  }

  // notification d'attachement de matériau (appelée après un attachement réussi)
  notifyMaterialAttached(materialId: string, lessonId: string): void {
    this.materialAttached$.next({ materialId, lessonId });
  }

  // souscription aux notifications d'attachement de matériaux
  onMaterialAttached(): Observable<{ materialId: string, lessonId: string }> {
    return this.materialAttached$.asObservable();
  }

  // détachement d'un matériau du cours
  detachMaterialFromLesson(materialId: string, lessonId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${materialId}/lessons/${lessonId}`);
  }

  // suppression d'un matériau
  deleteMaterial(materialId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${materialId}`);
  }

  // mise à jour d'un matériau
  updateMaterial(materialId: string, updates: Partial<Material>): Observable<Material> {
    return this.http.patch<Material>(`${this.baseUrl}/${materialId}`, updates);
  }

  // recherche de matériaux
  searchMaterials(query: string, type?: string): Observable<Material[]> {
    const params = type ? `?query=${query}&type=${type}` : `?query=${query}`;
    return this.http.get<Material[]>(`${this.baseUrl}/search${params}`);
  }

  // Gestion de l'état local
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
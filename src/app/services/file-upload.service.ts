import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';

export interface UploadedFile {
  id: number;
  filename: string;
  url: string;
  mimetype: string;
  courseId: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = `${API_ENDPOINTS.FILES}/upload`;
  private materialsUrl = `${API_ENDPOINTS.FILES}/materials`;

  constructor(private http: HttpClient) { }

  uploadFile(
    file: File,
    courseId?: number | null
  ): Observable<{ id: number; url: string; createdAt: string }> {
    const formData = new FormData();
    formData.append('file', file);

    //  если courseId передали и он не null – отправляем в FormData
    if (courseId !== undefined && courseId !== null) {
      formData.append('courseId', String(courseId));
    }

    return this.http.post<{ id: number; url: string; createdAt: string }>(
      `${this.apiUrl}`,
      formData
    );
  }

  uploadFileAsCourse(file: File, courseId: string): Observable<{ id: number; url: string; createdAt: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ id: number; url: string; createdAt: string }>(
      `${this.apiUrl}?courseId=${encodeURIComponent(courseId)}`, // ✅ Передаем courseId как строку
      formData
    );
  }

  getFiles(courseId: string): Observable<UploadedFile[]> {
    return this.http.get<UploadedFile[]>(`${this.materialsUrl}?courseId=${encodeURIComponent(courseId)}`);
  }


}

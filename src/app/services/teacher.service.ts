import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { TeacherDetails } from '../features/teacher-search-and-consult/teacher-details.model';
import { Teacher } from '../features/teacher-search-and-consult/teacher.model';
import { AuthService } from './auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Review } from '../features/dashboard/shared/models/review.model';
import { API_ENDPOINTS } from '../core/constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  constructor(private http: HttpClient, private authService: AuthService) { }


  getTeachers(
    page = 1,
    limit = 6,
    filters: any = {}
  ): Observable<{ data: Teacher[]; total: number }> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<{ data: any[]; total: number }>(
      `${API_ENDPOINTS.AUTH}/teachers`,
      { params }
    ).pipe(
      map(response => {
        console.log('🔥 RAW from backend', response.data); // DEBUG
        return {
          data: response.data.map(user => ({
            id: user.id,
            name: user.email,
            photoUrl: user.photoUrl, // ❗️не перезаписывать на дефолт
            price: user.price,
            experienceYears: user.experienceYears,
            rating: user.rating,
            reviewCount: user.reviewCount,
            specializations: user.specializations ?? [],
            certificates: user.certificates ?? [],              // ✅ добавлено
            bio: user.bio ?? '',
            teachingLanguages: user.teachingLanguages ?? []
          })),
          total: response.total
        };
      })
    );
  }

  getTeacherById(id: string): Observable<TeacherDetails> {
    return this.http.get<any>(`${API_ENDPOINTS.AUTH}/teacher-profile/full/${id}`).pipe(
      map(profile => ({
        id: profile.user.id_users,
        name: profile.user.name || '',
        surname: profile.user.surname || '',
        email: profile.user.email || '',
        photoUrl: profile.photo_url || 'assets/default-avatar.png',
        specializations: profile.specializations || [],
        price: profile.price || 0,
        rating: profile.rating || 0,
        bio: profile.bio || '',
        experienceYears: profile.experience_years || 0,
        certificates: profile.certificates || []
      }))
    );
  }

  getReviewsByTeacher(teacherId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${API_ENDPOINTS.AUTH}/reviews/teacher/${teacherId}`);
  }

  updateProfile(userId: string, data: {
    bio?: string;
    price?: number;
    experienceYears?: number;
    specializations?: string[];
    certificates?: string[];
  }): Observable<any> {
    return this.http.put(`${API_ENDPOINTS.AUTH}/teacher-profile/update/${userId}`, data);
  }


  uploadPhoto(userId: string, photoUrl: string): Observable<any> {
    return this.http.put(`${API_ENDPOINTS.AUTH}/teacher-profile/photo/${userId}`, { photoUrl });
  }

  getMyTeachers(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(`${API_ENDPOINTS.AUTH}/student/my-teachers`);
  }

  getMyTeachersFromLessonService(): Observable<Teacher[]> {
    const studentId = this.authService.user?.id;
    console.log('[TeacherService] getMyTeachersFromLessonService studentId:', studentId);
    if (!studentId) {
      throw new Error('Не найден id студента');
    }
    return this.http.get<Teacher[]>(`${API_ENDPOINTS.LESSONS}/student/${studentId}/teachers`).pipe(
      map(result => {
        console.log('[TeacherService] getMyTeachersFromLessonService result:', result);
        return result;
      })
    );
  }

}

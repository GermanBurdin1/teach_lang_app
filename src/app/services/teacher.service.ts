import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { TeacherDetails } from '../features/teacher-search-and-consult/teacher-details.model';
import { Teacher } from '../features/teacher-search-and-consult/teacher.model';
import { AuthService } from './auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Review } from '../features/dashboard/shared/models/review.model';

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
      'http://localhost:3002/auth/teachers',
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
    return this.http.get<any>(`http://localhost:3002/teacher-profile/full/${id}`).pipe(
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
    return this.http.get<Review[]>(`http://localhost:3002/reviews/teacher/${teacherId}`);
  }

  updateProfile(userId: string, data: {
    bio?: string;
    price?: number;
    experienceYears?: number;
    specializations?: string[];
    certificates?: string[];
  }): Observable<any> {
    return this.http.put(`http://localhost:3002/teacher-profile/update/${userId}`, data);
  }


  uploadPhoto(userId: string, photoUrl: string): Observable<any> {
    return this.http.put(`http://localhost:3002/teacher-profile/photo/${userId}`, { photoUrl });
  }


}

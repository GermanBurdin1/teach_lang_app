import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LessonService } from '../services/lesson.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface Lesson {
  id: string;
  [key: string]: any;
}

interface LessonData {
  lessonId: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LessonResolverService implements Resolve<LessonData> {

  constructor(
    private authService: AuthService,
    private lessonService: LessonService,
    private router: Router
  ) { }

  resolve(): Observable<LessonData> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return of({ lessonId: null });
    }

    // Для преподавателей получаем первый урок
    if (currentUser.roles?.includes('teacher')) {
      return this.lessonService.getAllConfirmedLessonsForTeacher(currentUser.id).pipe(
        map((lessons: unknown[]) => {
          if (lessons && lessons.length > 0) {
            const firstLesson = lessons[0] as Lesson;
            const lessonId = firstLesson.id;
            console.log(`🎯 Resolver: найден урок для преподавателя: ${lessonId}`);
            return { lessonId };
          }
          console.log('🎯 Resolver: уроки не найдены для преподавателя');
          return { lessonId: null };
        }),
        catchError(error => {
          console.error('🎯 Resolver: ошибка получения уроков преподавателя:', error);
          return of({ lessonId: null });
        })
      );
    }

    // Для студентов получаем первую заявку
    if (currentUser.roles?.includes('student')) {
      return this.lessonService.getStudentSentRequests(currentUser.id).pipe(
        map((requests: any[]) => {
          if (requests && requests.length > 0) {
            const firstRequest = requests[0] as any;
            const lessonId = firstRequest.lessonId || firstRequest.id;
            console.log(`🎯 Resolver: найден урок для студента: ${lessonId}`);
            return { lessonId };
          }
          console.log('🎯 Resolver: заявки не найдены для студента');
          return { lessonId: null };
        }),
        catchError(error => {
          console.error('🎯 Resolver: ошибка получения заявок студента:', error);
          return of({ lessonId: null });
        })
      );
    }

    return of({ lessonId: null });
  }
}

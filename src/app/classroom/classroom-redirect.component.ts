import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface LessonData {
  lessonId: string | null;
}

@Component({
  selector: 'app-classroom-redirect',
  template: '<div>Перенаправление в класс...</div>'
})
export class ClassroomRedirectComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Получаем данные из резолвера
    this.route.data.subscribe(data => {
      const lessonData = data['lessonData'] as LessonData;
      
      if (lessonData && lessonData.lessonId) {
        console.log(`🎯 Перенаправляем в класс с уроком: ${lessonData.lessonId}`);
        this.router.navigate([`/classroom/${lessonData.lessonId}/lesson`]);
      } else {
        console.log('🎯 Урок не найден, перенаправляем на дашборд');
        this.router.navigate(['/dashboard']);
      }
    });
  }
}

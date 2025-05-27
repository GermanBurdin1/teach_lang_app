import { Component } from '@angular/core';

@Component({
  selector: 'app-teacher-lesson-management',
  templateUrl: './teacher-lesson-management.component.html',
  styleUrls: ['./teacher-lesson-management.component.css']
})
export class TeacherLessonManagementComponent {
  activeLesson: any = null;

  lessons = [
    {
      id: 1,
      teacher: 'Marie',
      date: new Date('2025-06-01'),
      status: 'future',
      tasks: ['Corriger une rédaction'],
      texts: ['Introduction à Baudelaire'],
      audios: [],
      videos: []
    },
    {
      id: 2,
      teacher: 'Paul',
      date: new Date('2025-06-05'),
      status: 'future',
      tasks: ['Analyser une chanson'],
      texts: [],
      audios: ['Lien vers podcast'],
      videos: []
    }
  ];

  openGabarit(lesson: any) {
    this.activeLesson = lesson;
  }

  closeGabarit() {
    this.activeLesson = null;
  }

  onItemDropped(event: { from: number, to: number, item: string }) {
    const fromLesson = this.lessons.find(l => l.id === event.from);
    const toLesson = this.lessons.find(l => l.id === event.to);
    if (!fromLesson || !toLesson || fromLesson === toLesson) return;

    const index = fromLesson.tasks.indexOf(event.item);
    if (index !== -1) {
      fromLesson.tasks.splice(index, 1);
      toLesson.tasks.push(event.item);
    }
  }

  get taskDropIds(): string[] {
    return this.lessons.map(l => `tasks-${l.id}`);
  }
}

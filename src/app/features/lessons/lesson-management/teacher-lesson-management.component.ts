import { Component, OnInit } from '@angular/core';
import { HomeworkService } from '../../../services/homework.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-teacher-lesson-management',
  templateUrl: './teacher-lesson-management.component.html',
  styleUrls: ['./teacher-lesson-management.component.css']
})
export class TeacherLessonManagementComponent implements OnInit {
  activeLesson: any = null;
  filter: string = 'future';
  selectedStudent: string | null = null;
  searchTerm = '';
  startDate?: string;
  endDate?: string;
  visibleCount = 4;
  hideTabs = true;
  newHomeworkFromClass: string[] = [];
  activePanel: 'cours' | 'settings' | 'stats' = 'cours';
  highlightedLessonId: number | null = null;
  pageSize = 4;
  currentPage = 1;

  lessons = [
    {
      id: 1,
      date: new Date(Date.now() + 1000 * 60 * 2), // ближайший урок для входа
      status: 'future',
      student: 'Alice',
      tasks: ['Corriger une rédaction', 'Faire un résumé', 'Analyser un poème'],
      texts: ['Intro Baudelaire'],
      audios: ['Lecture extrait'],
      videos: ['Docu Molière'],
      homework: []
    },
    {
      id: 2,
      date: new Date('2025-06-05'),
      status: 'future',
      student: 'Max',
      tasks: ['Analyser une chanson'],
      texts: ['Texte chanson'],
      audios: [],
      videos: [],
      homework: []
    },
    {
      id: 3,
      date: new Date('2025-04-15'),
      status: 'past',
      student: 'Alice',
      tasks: ['Ancien devoir'],
      texts: [],
      audios: [],
      videos: [],
      homework: []
    }
  ];

  resolvedItemsPerLesson: { [lessonId: number]: string[] } = {};
  uniqueStudents: string[] = [];

  constructor(private homeworkService: HomeworkService) { }

  ngOnInit() {
    this.recalculateStatus();
    this.updateUniqueStudents();

    this.homeworkService.getHomeworkStream().subscribe(items => {
      this.newHomeworkFromClass = items;
    });
  }

  recalculateStatus() {
    const now = Date.now();
    this.lessons.forEach(l => {
      l.status = l.date.getTime() >= now ? 'future' : 'past';
    });
  }

  updateUniqueStudents() {
    this.uniqueStudents = [...new Set(this.lessons.map(l => l.student))];
  }

  openGabarit(lesson: any) {
    this.activeLesson = lesson;
  }

  closeGabarit() {
    this.activeLesson = null;
  }

  get fullFilteredLessons() {
    const result = this.lessons
      .filter(l => this.filter === 'all' || l.status === this.filter)
      .filter(l => !this.selectedStudent || l.student === this.selectedStudent)
      .filter(l => {
        const time = l.date.getTime();
        const afterStart = !this.startDate || time >= new Date(this.startDate).getTime();
        const beforeEnd = !this.endDate || time <= new Date(this.endDate).getTime();
        return afterStart && beforeEnd;
      })
      .filter(l => {
        if (!this.searchTerm.trim()) return true;
        const keyword = this.searchTerm.toLowerCase();
        return (
          l.tasks.some(t => t.toLowerCase().includes(keyword)) ||
          l.texts.some(t => t.toLowerCase().includes(keyword)) ||
          l.audios.some(t => t.toLowerCase().includes(keyword)) ||
          l.videos.some(t => t.toLowerCase().includes(keyword))
        );
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return result;
  }

  get filteredLessons() {
    return this.fullFilteredLessons.slice(0, this.visibleCount);
  }

  loadMore() {
    this.visibleCount += 4;
  }

  get taskDropIds(): string[] {
    return this.filteredLessons.map(l => `tasks-${l.id}`);
  }

  onItemDropped(event: { from: number; to: number; item: string }) {
    const from = this.lessons.find(l => l.id === event.from);
    const to = this.lessons.find(l => l.id === event.to);
    if (!from || !to || from === to) return;

    const i = from.tasks.indexOf(event.item);
    if (i !== -1) {
      from.tasks.splice(i, 1);
      to.tasks.push(event.item);
    }
  }

  get allHomework(): string[] {
    return this.lessons
      .filter(l => l.status === 'future' && Array.isArray(l.homework))
      .flatMap(l => l.homework)
      .filter((v, i, arr) => arr.indexOf(v) === i); // без дубликатов
  }

  addToHomework(item: any) {
    const targetLesson = this.lessons.find(l => l.status === 'future');
    if (!targetLesson) return;

    targetLesson.homework ??= [];

    if ((targetLesson.homework as string[]).includes(item)) return;

    (targetLesson.homework as string[]).push(item);
    this.highlightedLessonId = targetLesson.id;

    setTimeout(() => {
      this.highlightedLessonId = null;
    }, 3000);
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
  }

  get pastLessonsCount(): number {
  return this.lessons.filter(l => l.status === 'past').length;
}

get futureLessonsCount(): number {
  return this.lessons.filter(l => l.status === 'future').length;
}


}

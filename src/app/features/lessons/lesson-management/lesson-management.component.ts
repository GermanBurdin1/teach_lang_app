import { Component, OnInit } from '@angular/core';
import { HomeworkService } from '../../../services/homework.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css']
})
export class LessonManagementComponent implements OnInit {
  filter: string = 'future';
  selectedTeacher: string | null = null;
  allLessons = [
    {
      id: 1,
      teacher: 'Marie',
      date: new Date(Date.now() + 5 * 60 * 1000),
      status: 'future',
      tasks: [
        'Analyser la chanson de Charles Aznavour',
        'Compléter la fiche de vocabulaire',
        'Faire une synthèse sur le présent du subjonctif',
        'Corriger les erreurs d’un camarade'
      ],
      questions: [
        'Le passé simple est-il utilisé uniquement pour l’ironie ?',
        'Quand utilise-t-on “depuis” vs “il y a” ?',
        'Quelle est la structure du discours indirect ?'
      ],
      tasksDone: 1,
      questionsDone: 0,
      homework: []
    },
    {
      id: 2,
      teacher: 'Paul',
      date: new Date('2025-06-05'),
      status: 'future',
      tasks: ['Faire des phrases au subjonctif'],
      questions: ['Quelle est la différence entre “bien que” et “même si” ?'],
      tasksDone: 0,
      questionsDone: 1,
      homework: []
    },
    {
      id: 3,
      teacher: 'Claire',
      date: new Date('2025-05-20'),
      status: 'future',
      tasks: ['Préparer un exposé sur la pollution sonore'],
      questions: ['Faut-il accorder les participes passés avec avoir ?'],
      tasksDone: 0,
      questionsDone: 0,
      homework: []
    },
    {
      id: 4,
      teacher: 'Marie',
      date: new Date('2025-04-10'),
      status: 'past',
      tasks: ['Écrire une lettre de motivation'],
      questions: ['Quelles sont les erreurs fréquentes en conjugaison ?'],
      tasksDone: 1,
      questionsDone: 1,
      homework: []
    },
    {
      id: 5,
      teacher: 'Paul',
      date: new Date('2025-03-15'),
      status: 'past',
      tasks: ['Corriger les fautes dans un article'],
      questions: ['Quelle est la différence entre “depuis” et “pendant” ?'],
      tasksDone: 1,
      questionsDone: 1,
      homework: []
    },
    {
      id: 6,
      teacher: 'Claire',
      date: new Date('2025-06-10'),
      status: 'future',
      tasks: ['Expliquer une œuvre d’art'],
      questions: ['Quelle est la structure du discours indirect ?'],
      tasksDone: 0,
      questionsDone: 0,
      homework: [],
    },
    {
      id: 7,
      teacher: 'Marie',
      date: new Date('2025-06-03'),
      status: 'past',
      tasks: ['Préparer un débat sur l’intelligence artificielle'],
      questions: ['Peut-on utiliser “on” dans une rédaction formelle ?'],
      tasksDone: 0,
      questionsDone: 0,
      homework: []
    }
  ];
  highlightedLessonId: number | null = null;
  resolvedItemsPerLesson: { [lessonId: number]: string[] } = {};
  newHomeworkFromClass: string[] = [];
  activePanel: 'cours' | 'homework' = 'cours';
  hideTabs = true;
  searchTerm = '';
  startDate?: string;
  endDate?: string;
  pageSize = 4;
  currentPage = 1;

  constructor(private homeworkService: HomeworkService) { }




  ngOnInit(): void {
    const now = Date.now();
    this.allLessons.forEach(lesson => {
      lesson.status = lesson.date.getTime() >= now ? 'future' : 'past';
    });

    console.log('[ngOnInit] allLessons after status calc:', this.allLessons);

    this.homeworkService.getHomeworkStream().subscribe(items => {
      this.newHomeworkFromClass = items;
    });
  }

  get fullFilteredLessons() {
    const result = this.allLessons
      .filter(l => this.filter === 'all' || l.status === this.filter)
      .filter(l => !this.selectedTeacher || l.teacher === this.selectedTeacher)
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
          l.questions.some(q => q.toLowerCase().includes(keyword))
        );
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log('[fullFilteredLessons]', {
      filter: this.filter,
      selectedTeacher: this.selectedTeacher,
      startDate: this.startDate,
      endDate: this.endDate,
      searchTerm: this.searchTerm,
      result
    });

    return result;
  }


  get filteredLessons() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.fullFilteredLessons.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.fullFilteredLessons.length / this.pageSize);
  }

  get taskDropListIds(): string[] {
    return this.filteredLessons.map(l => `tasks-${l.id}`);
  }

  get questionDropListIds(): string[] {
    return this.filteredLessons.map(l => `questions-${l.id}`);
  }


  get allHomework(): string[] {
    return this.allLessons
      .filter(l => l.status === 'future' && Array.isArray(l.homework))
      .flatMap(l => l.homework)
      .filter((value, index, self) => self.indexOf(value) === index); // убрать дубликаты
  }


  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
  }


  onItemDropped(event: { from: number, to: number, item: string, type: 'task' | 'question' }) {
    const fromLesson = this.allLessons.find(l => l.id === event.from);
    const toLesson = this.allLessons.find(l => l.id === event.to);

    if (!fromLesson || !toLesson || fromLesson === toLesson) return;

    const sourceArray = fromLesson[event.type === 'task' ? 'tasks' : 'questions'];
    const targetArray = toLesson[event.type === 'task' ? 'tasks' : 'questions'];

    const index = sourceArray.indexOf(event.item);
    if (index > -1) {
      sourceArray.splice(index, 1);
      targetArray.push(event.item);
    }
  }

  onMoveToFuture(event: { item: string, type: 'task' | 'question' }) {
    // Переключаемся на вкладку À venir
    this.filter = 'future';

    // Ищем ближайший future-урок, в который еще не добавлен этот элемент
    const futureLesson = this.allLessons.find(l =>
      l.status === 'future' &&
      !l[event.type === 'task' ? 'tasks' : 'questions'].includes(event.item)
    );
    if (!futureLesson) return;

    // Добавляем в нужный список
    const list = futureLesson[event.type === 'task' ? 'tasks' : 'questions'];
    list.push(event.item);

    // Удаляем из всех passés этот элемент, чтобы нельзя было повторно кликнуть
    this.allLessons.forEach(lesson => {
      if (lesson.status !== 'past') return;
      const arr = lesson[event.type === 'task' ? 'tasks' : 'questions'];
      const index = arr.indexOf(event.item);
      if (index > -1) arr.splice(index, 1);
    });

    // Визуальное выделение карточки
    this.highlightedLessonId = futureLesson.id;

    setTimeout(() => {
      this.highlightedLessonId = null;
    }, 3000);
  }




  addToHomework(item: any) {
    const targetLesson = this.allLessons.find(l => l.status === 'future');
    if (!targetLesson) return;

    targetLesson.homework ??= [];

    if ((targetLesson.homework as string[]).includes(item)) return;

    (targetLesson.homework as string[]).push(item);
    this.highlightedLessonId = targetLesson.id;

    setTimeout(() => {
      this.highlightedLessonId = null;
    }, 3000);
  }


  recalculateStatus() {
    const now = Date.now();
    this.allLessons.forEach(lesson => {
      lesson.status = lesson.date.getTime() >= now ? 'future' : 'past';
    });
    this.currentPage = 1;
  }



}

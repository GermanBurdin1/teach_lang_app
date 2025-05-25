import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css']
})
export class LessonManagementComponent implements OnInit {
  filter: 'future' | 'past' | 'requested' = 'future';
  selectedTeacher: string | null = null;

  allLessons = [
    {
      id: 1,
      teacher: 'Marie',
      date: new Date('2025-06-01'),
      status: 'future',
      tasks: ['Analyser la chanson de Charles Aznavour'],
      questions: ['Le passé simple est-il utilisé uniquement pour l’ironie ?'],
      tasksDone: 1,
      questionsDone: 0
    },
    {
      id: 2,
      teacher: 'Paul',
      date: new Date('2025-06-05'),
      status: 'future',
      tasks: ['Faire des phrases au subjonctif'],
      questions: ['Quelle est la différence entre “bien que” et “même si” ?'],
      tasksDone: 0,
      questionsDone: 1
    },
    {
      id: 3,
      teacher: 'Claire',
      date: new Date('2025-05-20'),
      status: 'requested',
      tasks: ['Préparer un exposé sur la pollution sonore'],
      questions: ['Faut-il accorder les participes passés avec avoir ?'],
      tasksDone: 0,
      questionsDone: 0
    },
    {
      id: 4,
      teacher: 'Marie',
      date: new Date('2025-04-10'),
      status: 'past',
      tasks: ['Écrire une lettre de motivation'],
      questions: ['Quelles sont les erreurs fréquentes en conjugaison ?'],
      tasksDone: 1,
      questionsDone: 1
    },
    {
      id: 5,
      teacher: 'Paul',
      date: new Date('2025-03-15'),
      status: 'past',
      tasks: ['Corriger les fautes dans un article'],
      questions: ['Quelle est la différence entre “depuis” et “pendant” ?'],
      tasksDone: 1,
      questionsDone: 1
    },
    {
      id: 6,
      teacher: 'Claire',
      date: new Date('2025-06-10'),
      status: 'future',
      tasks: ['Expliquer une œuvre d’art'],
      questions: ['Quelle est la structure du discours indirect ?'],
      tasksDone: 0,
      questionsDone: 0
    },
    {
      id: 7,
      teacher: 'Marie',
      date: new Date('2025-06-03'),
      status: 'requested',
      tasks: ['Préparer un débat sur l’intelligence artificielle'],
      questions: ['Peut-on utiliser “on” dans une rédaction formelle ?'],
      tasksDone: 0,
      questionsDone: 0
    }
  ];



  get filteredLessons() {
    return this.allLessons
      .filter(lesson => lesson.status === this.filter)
      .filter(lesson => !this.selectedTeacher || lesson.teacher === this.selectedTeacher)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  ngOnInit(): void { }

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

}

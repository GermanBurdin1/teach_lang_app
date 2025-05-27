import { Component } from '@angular/core';

@Component({
  selector: 'app-teacher-lesson-management',
  templateUrl: './teacher-lesson-management.component.html',
  styleUrls: ['./teacher-lesson-management.component.css']
})
export class TeacherLessonManagementComponent {
  activeLesson: any = null;
  filter: 'future' | 'past' | 'requested' = 'future';

  lessons = [
    {
      id: 1,
      date: new Date('2025-06-01'),
      status: 'future',
      student: 'Alice',
      tasks: [
        'Corriger une rédaction',
        'Faire un résumé',
        'Analyser un poème'
      ],
      texts: [
        'Introduction à Baudelaire',
        'Fiche explicative du subjonctif',
        'Texte de Victor Hugo'
      ],
      audios: [
        'Lecture d’un extrait',
        'Podcast: La grammaire au quotidien'
      ],
      videos: [
        'Lien vers documentaire sur Molière',
        'Analyse de scène théâtrale'
      ]
    },
    {
      id: 2,
      date: new Date('2025-06-05'),
      status: 'future',
      student: 'Max',
      tasks: [
        'Analyser une chanson',
        'Corriger les erreurs d’un élève'
      ],
      texts: [
        'Texte chanson française',
        'Analyse stylistique'
      ],
      audios: [
        'Lien vers podcast chanson',
        'Enregistrement oral'
      ],
      videos: [
        'Vidéo explicative subjonctif',
        'Entretien avec un linguiste'
      ]
    },
    {
      id: 3,
      date: new Date('2025-06-10'),
      status: 'future',
      student: "Robert",
      tasks: [
        'Préparer un exposé oral',
        'Corriger un dialogue'
      ],
      texts: [
        'Dialogue exemple',
        'Note explicative'
      ],
      audios: [],
      videos: [
        'Présentation orale exemple'
      ]
    }
  ];

selectedStudent: string | null = null;

ngOnInit() {
    this.updateUniqueStudents();
  }

  uniqueStudents: string[] = [];

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



  get filteredLessons() {
  return this.lessons
    .filter(lesson => lesson.status === this.filter)
    .filter(lesson => !this.selectedStudent || lesson.student === this.selectedStudent)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

 updateUniqueStudents() {
    const students = this.lessons.map(l => l.student);
    this.uniqueStudents = students.filter((v, i, a) => a.indexOf(v) === i);
  }

}

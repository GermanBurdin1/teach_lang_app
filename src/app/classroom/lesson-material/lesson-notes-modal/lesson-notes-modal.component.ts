import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LessonNotesService, LessonNote } from '../../../services/lesson-notes.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

export interface LessonNotesModalData {
  lessonId: string;
  section: 'tasks' | 'questions' | 'materials';
  itemId: string;
  itemText: string;
  lessonData?: {
    studentTasks?: string[];
    teacherTasks?: string[];
    studentQuestions?: string[];
    teacherQuestions?: string[];
    materials?: any[];
  };
}

// TODO : ajouter support pour les fichiers joints aux notes
@Component({
  selector: 'app-lesson-notes-modal',
  templateUrl: './lesson-notes-modal.component.html',
  styleUrls: ['./lesson-notes-modal.component.css']
})
export class LessonNotesModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private contentChanges$ = new Subject<string>();
  
  // contenu pour chaque section
  tasksContent = '';
  questionsContent = '';
  materialsContent = '';
  
  isSaving = false;
  lastSaved: Date | null = null;
  
  constructor(
    public dialogRef: MatDialogRef<LessonNotesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LessonNotesModalData,
    private lessonNotesService: LessonNotesService
  ) {}

  ngOnInit() {
    // on initialise les notes pour le cours
    this.lessonNotesService.initNotesForLesson(this.data.lessonId);
    
    // on s'abonne à toutes les notes du cours
    this.lessonNotesService.notes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(notes => {
      this.loadAccumulatedNotes(notes);
    });

    // auto-sauvegarde lors des changements de contenu
    this.contentChanges$.pipe(
      debounceTime(2000), // on attend 2 secondes après le dernier changement
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(content => {
      this.saveCurrentSectionNote(content);
    });
  }

  private loadAccumulatedNotes(notes: any) {
    // on charge les notes accumulées pour chaque section
    this.tasksContent = this.buildAccumulatedContent(notes.tasks, 'tasks');
    this.questionsContent = this.buildAccumulatedContent(notes.questions, 'questions');
    this.materialsContent = this.buildAccumulatedContent(notes.materials, 'materials');
    
    // on détermine la dernière heure de sauvegarde
    const allNotes = [...notes.tasks, ...notes.questions, ...notes.materials];
    if (allNotes.length > 0) {
      this.lastSaved = allNotes.reduce((latest, note) => 
        !latest || note.updatedAt > latest ? note.updatedAt : latest, null);
    }
  }

  private buildAccumulatedContent(sectionNotes: LessonNote[], section: 'tasks' | 'questions' | 'materials'): string {
    if (!sectionNotes || sectionNotes.length === 0) {
      return '';
    }

    // on trie les notes par heure de création
    const sortedNotes = sectionNotes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // si c'est la section active, on affiche seulement la note pour l'élément actuel
    if (section === this.data.section) {
      const currentNote = sortedNotes.find(note => note.itemId === this.data.itemId);
      return currentNote ? currentNote.content : '';
    }
    
    // pour les sections inactives on combine toutes les notes
    return sortedNotes.map(note => {
      const timestamp = note.updatedAt.toLocaleString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `[${timestamp}] ${note.itemText}:\n${note.content}`;
    }).join('\n\n---\n\n');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // méthodes pour traiter les changements dans chaque section
  onTasksContentChange(content: string) {
    // on met à jour le contenu seulement si c'est la section active
    if (this.data.section === 'tasks') {
      this.tasksContent = content;
      this.contentChanges$.next(content);
    }
  }

  onQuestionsContentChange(content: string) {
    // on met à jour le contenu seulement si c'est la section active
    if (this.data.section === 'questions') {
      this.questionsContent = content;
      this.contentChanges$.next(content);
    }
  }

  onMaterialsContentChange(content: string) {
    // on met à jour le contenu seulement si c'est la section active
    if (this.data.section === 'materials') {
      this.materialsContent = content;
      this.contentChanges$.next(content);
    }
  }

  getFormattedDate(): string {
    if (!this.lastSaved) return '';
    return this.lastSaved.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private saveCurrentSectionNote(content: string) {
    if (!content.trim()) return;
    
    this.isSaving = true;
    
    // on sauvegarde seulement le nouveau contenu pour l'élément actuel
    const currentSectionContent = this.getCurrentSectionEditableContent();
    
    // on simule une sauvegarde asynchrone
    setTimeout(() => {
      this.lessonNotesService.addOrUpdateNote(
        this.data.section,
        this.data.itemId,
        this.data.itemText,
        currentSectionContent
      );
      
      this.isSaving = false;
      this.lastSaved = new Date();
    }, 500);
  }

  private getCurrentSectionEditableContent(): string {
    // on retourne le contenu seulement pour la section active
    switch (this.data.section) {
      case 'tasks': return this.tasksContent;
      case 'questions': return this.questionsContent; 
      case 'materials': return this.materialsContent;
      default: return '';
    }
  }

  private saveAllNotes() {
    this.isSaving = true;
    
    // on sauvegarde seulement la section active pour l'élément actuel
    const currentContent = this.getCurrentSectionEditableContent();
    
    if (currentContent.trim()) {
      setTimeout(() => {
        this.lessonNotesService.addOrUpdateNote(
          this.data.section,
          this.data.itemId,
          this.data.itemText,
          currentContent
        );
        
        this.isSaving = false;
        this.lastSaved = new Date();
      }, 300);
    } else {
      this.isSaving = false;
    }
  }

  getSectionTitle(): string {
    switch (this.data.section) {
      case 'tasks': return 'Travail sur la tâche';
      case 'questions': return 'Travail sur la question';
      case 'materials': return 'Travail sur le matériau';
      default: return 'Notes';
    }
  }

  // méthodes pour travailler avec la nouvelle structure d'éléments
  isCurrentItem(itemIdentifier: string): boolean {
    // pour les éléments de chaîne simples (tâches et questions)
    // on compare avec le texte de l'élément lui-même, car itemId contient le texte de la tâche/question
    if (this.data.itemId === this.data.itemText) {
      // si c'est l'élément actuel, on vérifie la correspondance
      const currentItemIndex = this.getCurrentItemIndex();
      return itemIdentifier === currentItemIndex;
    }
    
    // pour les matériaux
    if (this.data.section === 'materials') {
      return this.data.itemId === itemIdentifier;
    }
    
    // fallback pour compatibilité
    return this.data.itemId === itemIdentifier;
  }

  private getCurrentItemIndex(): string {
    if (this.data.section === 'tasks') {
      // on cherche l'index dans les tâches étudiant
      const studentIndex = this.data.lessonData?.studentTasks?.findIndex(task => task === this.data.itemText);
      if (studentIndex !== undefined && studentIndex >= 0) {
        return 'student-task-' + studentIndex;
      }
      
      // on cherche l'index dans les tâches professeur
      const teacherIndex = this.data.lessonData?.teacherTasks?.findIndex(task => task === this.data.itemText);
      if (teacherIndex !== undefined && teacherIndex >= 0) {
        return 'teacher-task-' + teacherIndex;
      }
    }
    
    if (this.data.section === 'questions') {
      // on cherche l'index dans les questions étudiant
      const studentIndex = this.data.lessonData?.studentQuestions?.findIndex(question => question === this.data.itemText);
      if (studentIndex !== undefined && studentIndex >= 0) {
        return 'student-question-' + studentIndex;
      }
      
      // on cherche l'index dans les questions professeur
      const teacherIndex = this.data.lessonData?.teacherQuestions?.findIndex(question => question === this.data.itemText);
      if (teacherIndex !== undefined && teacherIndex >= 0) {
        return 'teacher-question-' + teacherIndex;
      }
    }
    
    return this.data.itemId; // fallback
  }

  getMaterialId(material: any): string {
    return material?.id || material?.title || material?.name || 'unknown';
  }

  getMaterialTypeIcon(materialType: string): string {
    switch (materialType) {
      case 'text': return '📄';
      case 'audio': return '🎧';
      case 'video': return '🎬';
      case 'pdf': return '📔';
      case 'image': return '🖼️';
      default: return '📎';
    }
  }

  getSectionIcon(): string {
    switch (this.data.section) {
      case 'tasks': return '📝';
      case 'questions': return '❓';
      case 'materials': return '📚';
      default: return '📋';
    }
  }

  onSave() {
    this.saveAllNotes();
    
    // on retourne l'état actuel des notes du cours
    const currentNotes = this.lessonNotesService.exportNotes();
    this.dialogRef.close({
      section: this.data.section,
      content: this.getCurrentSectionEditableContent(),
      allNotes: currentNotes
    });
  }

  onClose() {
    // on sauvegarde la section active à la fermeture, s'il y a du contenu
    const currentContent = this.getCurrentSectionEditableContent();
    if (currentContent.trim()) {
      this.saveAllNotes();
    }
    this.dialogRef.close();
  }
} 
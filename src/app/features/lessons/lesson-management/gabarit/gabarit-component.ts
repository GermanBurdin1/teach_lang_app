import { Component, Input } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-gabarit',
  templateUrl: './gabarit-component.html',
  styleUrls: ['./gabarit-component.css']
})
export class GabaritComponent {
  @Input() lesson: unknown;
  @Input() visible: boolean = false;
  @Input() close!: () => void;
  @Input() lessonId: string = '';
  @Input() readonly: boolean = false;


  ngOnInit(): void {
    if (!this.lesson) {
      console.warn('⚠️ [GabaritComponent] Aucune leçon reçue. On injecte un mock...');
      this.lesson = {
        date: new Date(),
        texts: ['📄 Le subjonctif expliqué', '📄 Notes sur Victor Hugo'],
        audios: ['🎧 Podcast grammaire', '🎧 Enregistrement oral'],
        videos: ['🎬 Analyse de Molière', '🎬 Documentaire']
      };
    }
  }

  get texts() { return (this.lesson as {texts?: unknown[]})?.texts || []; }
  get audios() { return (this.lesson as {audios?: unknown[]})?.audios || []; }
  get videos() { return (this.lesson as {videos?: unknown[]})?.videos || []; }


  add(type: 'text' | 'audio' | 'video') {
    const input = document.createElement('input');
    input.type = 'file';

    if (type === 'audio') input.accept = 'audio/*';
    if (type === 'video') input.accept = 'video/*';
    if (type === 'text') input.accept = '.txt,.pdf,.doc,.docx';

    input.onchange = () => {
      const file = input.files?.[0];
      if (file && this.lesson) {
        const label = `${file.name} (${Math.round(file.size / 1024)} Ko)`;
        if (type === 'text' && this.lesson) (this.lesson as {texts?: unknown[]}).texts?.push?.(label);
        if (type === 'audio' && this.lesson) (this.lesson as {audios?: unknown[]}).audios?.push?.(label);
        if (type === 'video' && this.lesson) (this.lesson as {videos?: unknown[]}).videos?.push?.(label);
      }
    };

    input.click();
  }

  onDrop(event: CdkDragDrop<string[]>, type: 'texts' | 'audios' | 'videos') {
    const lessonArray = (this.lesson as {[key: string]: unknown[]})?.[type];
    if (lessonArray && Array.isArray(lessonArray)) {
      moveItemInArray(lessonArray, event.previousIndex, event.currentIndex);
    }
  }

  // Helper методы для template
  getLessonDate(): Date | null {
    const date = (this.lesson as {date?: string | Date})?.date;
    return date ? new Date(date) : null;
  }

  getTextsStringArray(): string[] {
    return this.texts.map(item => String(item));
  }

  getAudiosStringArray(): string[] {
    return this.audios.map(item => String(item));
  }

  getVideosStringArray(): string[] {
    return this.videos.map(item => String(item));
  }

  getItemString(item: unknown): string {
    return String(item);
  }
}

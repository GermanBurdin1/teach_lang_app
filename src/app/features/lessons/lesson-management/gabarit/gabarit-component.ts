import { Component, Input } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-gabarit',
  templateUrl: './gabarit-component.html',
  styleUrls: ['./gabarit-component.css']
})
export class GabaritComponent {
  @Input() lesson: any;
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

  get texts() { return this.lesson?.texts || []; }
  get audios() { return this.lesson?.audios || []; }
  get videos() { return this.lesson?.videos || []; }


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
        if (type === 'text') this.lesson.texts.push(label);
        if (type === 'audio') this.lesson.audios.push(label);
        if (type === 'video') this.lesson.videos.push(label);
      }
    };

    input.click();
  }

  onDrop(event: CdkDragDrop<string[]>, type: 'texts' | 'audios' | 'videos') {
    moveItemInArray(this.lesson[type], event.previousIndex, event.currentIndex);
  }
}

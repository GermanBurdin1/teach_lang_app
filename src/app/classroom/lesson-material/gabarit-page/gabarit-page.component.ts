import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-gabarit-page',
  templateUrl: './gabarit-page.component.html',
  styleUrls: ['./gabarit-page.component.css']
})
export class GabaritPageComponent implements OnInit {
  @Input() lesson: any;
  @Input() readonly = true;

  ngOnInit(): void {
    if (!this.lesson) {
      console.warn('⚠️ [GabaritPageComponent] Aucune leçon reçue. On injecte un mock...');
      this.lesson = {
        date: new Date(),
        texts: ['📄 Exemple de texte'],
        audios: ['🎧 Exemple audio'],
        videos: ['🎬 Exemple vidéo']
      };
    }
  }

  get texts() { return this.lesson?.texts || []; }
  get audios() { return this.lesson?.audios || []; }
  get videos() { return this.lesson?.videos || []; }
}

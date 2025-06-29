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
      console.warn('⚠️ [GabaritPageComponent] No lesson data received');
    }
  }

  get texts() { return this.lesson?.texts || []; }
  get audios() { return this.lesson?.audios || []; }
  get videos() { return this.lesson?.videos || []; }
}

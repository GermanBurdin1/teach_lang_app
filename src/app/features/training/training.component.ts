import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent implements OnInit {
  activeTrainingTab = 'audio';

  constructor() { }

  ngOnInit(): void {
  }

  setActiveTrainingTab(tab: string): void {
    this.activeTrainingTab = tab;
  }
}


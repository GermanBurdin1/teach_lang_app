import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface LessonTypeSelectorData {
  title?: string;
}

export type LessonType = 'self' | 'call';

@Component({
  selector: 'app-lesson-type-selector',
  templateUrl: './lesson-type-selector.component.html',
  styleUrls: ['./lesson-type-selector.component.css']
})
export class LessonTypeSelectorComponent {
  selectedType: LessonType | null = null;

  constructor(
    public dialogRef: MatDialogRef<LessonTypeSelectorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LessonTypeSelectorData
  ) {}

  selectType(type: LessonType): void {
    this.selectedType = type;
  }

  confirm(): void {
    if (this.selectedType) {
      this.dialogRef.close(this.selectedType);
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}



import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface PromptDialogData {
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-prompt-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="fill" class="full-width">
        <mat-label>{{ data.label || 'Valeur' }}</mat-label>
        <input matInput
               [(ngModel)]="value"
               [placeholder]="data.placeholder || ''"
               (keyup.enter)="submit()" />
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button color="primary" (click)="onCancel()">
        {{ data.cancelText || 'Annuler' }}
      </button>
      <button mat-flat-button color="primary" (click)="submit()">
        {{ data.confirmText || 'OK' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .dialog-content { padding-top: 4px; }
  `]
})
export class PromptDialogComponent {
  value: string;

  constructor(
    private dialogRef: MatDialogRef<PromptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PromptDialogData
  ) {
    this.value = data.defaultValue ?? '';
  }

  submit(): void {
    this.dialogRef.close(this.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}


import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogActions, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ExitConfirmationDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

@Component({
  selector: 'app-exit-confirmation-dialog',
  standalone: true,
  imports: [MatDialogContent, MatDialogActions, MatDialogTitle, MatButtonModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" color="primary">
          {{ data.cancelText }}
        </button>
        <button mat-raised-button (click)="onConfirm()" color="warn">
          {{ data.confirmText }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 20px;
    }
    
    h2 {
      color: #333;
      margin-bottom: 20px;
    }
    
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    
    mat-dialog-actions {
      gap: 12px;
    }
  `]
})
export class ExitConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ExitConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExitConfirmationDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

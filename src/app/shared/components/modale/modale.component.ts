import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type InstallDialogData = {
  title?: string;
};

export type InstallDialogResult = boolean;

@Component({
  standalone: true,
  selector: 'app-install-dialog',
  templateUrl: './install-dialog.component.html',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<InstallDialogComponent, InstallDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: InstallDialogData
  ) {}

  close(result: InstallDialogResult) {
    this.dialogRef.close(result);
  }
}




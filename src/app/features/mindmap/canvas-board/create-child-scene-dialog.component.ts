import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface CreateChildSceneDialogData {
  previewOutlineNumber: string;
}

export interface CreateChildSceneDialogResult {
  title: string;
}

@Component({
  selector: 'app-create-child-scene-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './create-child-scene-dialog.component.html',
  styles: [
    `
      .full-width {
        width: 100%;
      }
      .outline-preview {
        margin: 0 0 12px;
        color: #475569;
      }
    `
  ]
})
export class CreateChildSceneDialogComponent {
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor(
    private readonly dialogRef: MatDialogRef<CreateChildSceneDialogComponent, CreateChildSceneDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CreateChildSceneDialogData
  ) {}

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) return;
    const title = this.form.controls.title.value.trim();
    if (!title) return;
    this.dialogRef.close({ title });
  }
}

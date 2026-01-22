import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export type DynamicField =
  | {
      type: 'text';
      name: string;
      label: string;
      placeholder?: string;
      required?: boolean;
      value?: string;
    }
  | {
      type: 'select';
      name: string;
      label: string;
      required?: boolean;
      value?: string;
      options: { value: string; label: string }[];
    };

export type UniversalDialogData = {
  title: string;
  description?: string;
  content?: string;
  okText?: string;
  cancelText?: string;
  fields?: DynamicField[];
};

export type UniversalDialogResult =
  | { confirmed: false }
  | { confirmed: true; values: Record<string, any> };

@Component({
  standalone: true,
  selector: 'app-universal-dialog',
  templateUrl: './install-dialog.component.html',
  imports: [
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InstallDialogComponent, UniversalDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: UniversalDialogData
  ) {
    this.form = this.buildForm(data.fields ?? []);
  }

  private buildForm(fields: DynamicField[]): FormGroup {
    const controls: Record<string, any> = {};

    for (const f of fields) {
      const validators = f.required ? [Validators.required] : [];
      controls[f.name] = [f.value ?? '', validators];
    }

    return this.fb.group(controls);
  }

  cancel() {
    this.dialogRef.close({ confirmed: false });
  }

  confirm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ confirmed: true, values: this.form.value });
  }
}


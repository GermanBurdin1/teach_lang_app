import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherSettingsComponent } from './teacher-settings/teacher-settings.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// ✅ Материальные модули
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';

const routes: Routes = [
  { path: '', component: TeacherSettingsComponent }
];

@NgModule({
  declarations: [TeacherSettingsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),

    // ✅ Материальные модули
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatSelectModule
  ]
})
export class TeacherSettingsModule {}

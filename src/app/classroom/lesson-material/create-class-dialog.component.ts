import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateGroupClassDto, GroupClass, GroupClassService } from '../../services/group-class.service';
import { AuthService } from '../../services/auth.service';

export interface CreateClassDialogData {
  teacherId: string;
}

export interface CreateClassDialogResult {
  success: boolean;
  createdClass?: GroupClass;
  error?: string;
}

@Component({
  selector: 'app-create-class-dialog',
  template: `
    <div class="create-class-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2 mat-dialog-title class="dialog-title">
          <mat-icon class="title-icon">school</mat-icon>
          Créer une nouvelle classe
        </h2>
        <button mat-icon-button class="close-button" (click)="onCancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div mat-dialog-content class="dialog-content">
        <form [formGroup]="createClassForm" class="create-class-form">
          
          <!-- Nom de la classe -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nom de la classe</mat-label>
            <input matInput 
                   formControlName="name" 
                   placeholder="Ex: DELF B1 - Groupe 1"
                   maxlength="100">
            <mat-icon matSuffix>class</mat-icon>
            <mat-hint>Exemple: "DELF B1 - Groupe 1", "Conversation A2"</mat-hint>
          </mat-form-field>

          <!-- Niveau -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Niveau DELF/DALF</mat-label>
            <mat-select formControlName="level">
              <mat-option value="A1">A1 - Débutant</mat-option>
              <mat-option value="A2">A2 - Élémentaire</mat-option>
              <mat-option value="B1">B1 - Intermédiaire</mat-option>
              <mat-option value="B2">B2 - Intermédiaire avancé</mat-option>
              <mat-option value="C1">C1 - Avancé</mat-option>
              <mat-option value="C2">C2 - Maîtrise</mat-option>
            </mat-select>
            <mat-icon matSuffix>trending_up</mat-icon>
          </mat-form-field>

          <!-- Description -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description (optionnel)</mat-label>
            <textarea matInput 
                      formControlName="description"
                      rows="3"
                      placeholder="Description du cours..."></textarea>
            <mat-icon matSuffix>description</mat-icon>
          </mat-form-field>

          <!-- Nombre maximum d'étudiants -->
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Nombre max d'étudiants</mat-label>
            <input matInput 
                   type="number" 
                   formControlName="maxStudents"
                   min="1" 
                   max="50">
            <mat-icon matSuffix>group</mat-icon>
          </mat-form-field>

          <!-- Date et heure du premier cours -->
          <div class="datetime-section">
            <h4 class="section-title">
              <mat-icon>schedule</mat-icon>
              Premier cours
            </h4>
            
            <div class="datetime-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Date</mat-label>
                <input matInput 
                       [matDatepicker]="datePicker"
                       formControlName="lessonDate"
                       placeholder="JJ/MM/AAAA">
                <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
                <mat-datepicker #datePicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Heure</mat-label>
                <input matInput 
                       type="time"
                       formControlName="lessonTime">
                <mat-icon matSuffix>access_time</mat-icon>
              </mat-form-field>
            </div>
          </div>

        </form>
      </div>

      <!-- Actions -->
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button 
                class="cancel-button" 
                (click)="onCancel()">
          <mat-icon>cancel</mat-icon>
          Annuler
        </button>
        
        <button mat-raised-button 
                class="create-button"
                [disabled]="createClassForm.invalid || isLoading"
                (click)="onCreate()">
          <mat-icon *ngIf="!isLoading">add_circle</mat-icon>
          <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
          {{ isLoading ? 'Création...' : 'Créer la classe' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./create-class-dialog.component.css']
})
export class CreateClassDialogComponent implements OnInit {
  createClassForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateClassDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateClassDialogData,
    private groupClassService: GroupClassService
  ) {
    this.createClassForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      level: ['B1', Validators.required],
      description: [''],
      maxStudents: [10, [Validators.required, Validators.min(1), Validators.max(50)]],
      lessonDate: ['', Validators.required],
      lessonTime: ['14:00', Validators.required]
    });
  }

  ngOnInit(): void {
    // Définir la date par défaut (demain)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.createClassForm.patchValue({
      lessonDate: tomorrow
    });

    // Générer une description par défaut basée sur le niveau
    this.createClassForm.get('level')?.valueChanges.subscribe(level => {
      if (!this.createClassForm.get('description')?.value) {
        this.createClassForm.patchValue({
          description: `Classe de préparation à l'examen DELF niveau ${level}`
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  onCreate(): void {
    if (this.createClassForm.invalid) {
      this.createClassForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const formValue = this.createClassForm.value;
    
    // Combiner date et heure
    let scheduledDate = new Date();
    if (formValue.lessonDate && formValue.lessonTime) {
      const date = new Date(formValue.lessonDate);
      const [hours, minutes] = formValue.lessonTime.split(':');
      scheduledDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                              parseInt(hours), parseInt(minutes));
    }

    const createClassDto: CreateGroupClassDto = {
      name: formValue.name,
      level: formValue.level,
      description: formValue.description || `Classe de préparation à l'examen DELF niveau ${formValue.level}`,
      maxStudents: formValue.maxStudents,
      teacherId: this.data.teacherId,
      scheduledAt: scheduledDate.toISOString()
    };

    this.groupClassService.createGroupClass(createClassDto).subscribe({
      next: (createdClass: GroupClass) => {
        console.log('✅ Classe créée avec succès:', createdClass);
        this.dialogRef.close({ 
          success: true, 
          createdClass: createdClass 
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création de la classe:', error);
        this.dialogRef.close({ 
          success: false, 
          error: 'Erreur lors de la création de la classe. Veuillez réessayer.' 
        });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}


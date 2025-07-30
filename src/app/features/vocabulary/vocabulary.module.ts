import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VocabularyComponent } from './vocabulary.component';
import { AddWordDialogComponent } from './add-word-dialog.component';
import { VocabularyService } from './vocabulary.service';
import { FormsModule } from '@angular/forms';
import { GrammarFieldsComponent } from "./vocabulary-layout/grammar-fields.component";
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
@NgModule({
  declarations: [VocabularyComponent, AddWordDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GrammarFieldsComponent,
    MatChipsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatDividerModule,
    MatRadioModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule
],
  providers: [VocabularyService],
  exports: [VocabularyComponent]
})
export class VocabularyModule { }

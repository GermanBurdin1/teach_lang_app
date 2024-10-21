import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VocabularyComponent } from './vocabulary/vocabulary.component';
import { VocabularyService } from './vocabulary/vocabulary.service';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [VocabularyComponent],
  imports: [
    CommonModule,
    FormsModule
  ],
  providers: [VocabularyService],
  exports: [VocabularyComponent]
})
export class VocabularyModule { }

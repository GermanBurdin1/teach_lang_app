import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VocabularyComponent } from './vocabulary.component';
import { VocabularyService } from './vocabulary.service';
import { FormsModule } from '@angular/forms';
import { GrammarFieldsComponent } from "./vocabulary-layout/grammar-fields.component";

@NgModule({
  declarations: [VocabularyComponent],
  imports: [
    CommonModule,
    FormsModule,
    GrammarFieldsComponent
],
  providers: [VocabularyService],
  exports: [VocabularyComponent]
})
export class VocabularyModule { }

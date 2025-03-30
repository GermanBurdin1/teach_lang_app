import { TestBed } from '@angular/core/testing';

import { VocabularyGptService } from './vocabulary-gpt.service';

describe('VocabularyGptService', () => {
  let service: VocabularyGptService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VocabularyGptService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

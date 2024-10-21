import { TestBed } from '@angular/core/testing';

import { VocabularyService } from '../features/vocabulary/vocabulary.service';

describe('VocabularyService', () => {
  let service: VocabularyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VocabularyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

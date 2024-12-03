import { TestBed } from '@angular/core/testing';

import { LessonTabsService } from './lesson-tabs.service';

describe('LessonTabsService', () => {
  let service: LessonTabsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LessonTabsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

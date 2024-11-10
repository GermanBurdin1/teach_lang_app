import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnlineLessonsComponent } from './online-lessons.component';

describe('OnlineLessonsComponent', () => {
  let component: OnlineLessonsComponent;
  let fixture: ComponentFixture<OnlineLessonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnlineLessonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnlineLessonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

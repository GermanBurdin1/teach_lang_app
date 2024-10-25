import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentsOnlineComponent } from './students-online.component';

describe('StudentsComponent', () => {
  let component: StudentsOnlineComponent;
  let fixture: ComponentFixture<StudentsOnlineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentsOnlineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentsOnlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

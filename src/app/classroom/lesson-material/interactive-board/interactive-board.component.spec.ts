import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractiveBoardComponent } from './interactive-board.component';

describe('InteractiveBoardComponent', () => {
  let component: InteractiveBoardComponent;
  let fixture: ComponentFixture<InteractiveBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveBoardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InteractiveBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

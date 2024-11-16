import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviewLandingComponent } from './preview-landing.component';

describe('PreviewLandingComponent', () => {
  let component: PreviewLandingComponent;
  let fixture: ComponentFixture<PreviewLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewLandingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreviewLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

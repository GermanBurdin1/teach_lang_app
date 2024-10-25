import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralSettingsOnlineComponent } from './general-settings-online.component';

describe('GeneralSettingsComponent', () => {
  let component: GeneralSettingsOnlineComponent;
  let fixture: ComponentFixture<GeneralSettingsOnlineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralSettingsOnlineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralSettingsOnlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

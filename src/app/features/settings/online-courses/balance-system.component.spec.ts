import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceSystemComponent } from './balance-system.component';

describe('BalanceSystemComponent', () => {
  let component: BalanceSystemComponent;
  let fixture: ComponentFixture<BalanceSystemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceSystemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BalanceSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutSteps } from './checkout-steps';

describe('CheckoutSteps', () => {
  let component: CheckoutSteps;
  let fixture: ComponentFixture<CheckoutSteps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutSteps]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutSteps);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

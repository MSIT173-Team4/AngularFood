import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutShipping } from './checkout-shipping';

describe('CheckoutShipping', () => {
  let component: CheckoutShipping;
  let fixture: ComponentFixture<CheckoutShipping>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutShipping]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutShipping);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetPublicProduct } from './get-public-product';

describe('GetPublicProduct', () => {
  let component: GetPublicProduct;
  let fixture: ComponentFixture<GetPublicProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GetPublicProduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetPublicProduct);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

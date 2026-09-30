import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleRegister } from './google-register';

describe('GoogleRegister', () => {
  let component: GoogleRegister;
  let fixture: ComponentFixture<GoogleRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleRegister]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoogleRegister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MOCK_PANTRY_ITEMS } from '../mock-recipe.data';

import { SmartPantry } from './smart-pantry';

describe('SmartPantry', () => {
  let component: SmartPantry;
  let fixture: ComponentFixture<SmartPantry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmartPantry],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                pageData: { pantryItems: MOCK_PANTRY_ITEMS, source: 'mock', notice: '測試資料' }
              }
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmartPantry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

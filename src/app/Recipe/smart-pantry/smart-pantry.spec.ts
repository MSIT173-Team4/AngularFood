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

  it('should open a blank manual pantry entry without requiring a photo', () => {
    component.openManualEntryDialog();

    expect(component.dialogVisible()).toBe(true);
    expect(component.isManualEntry()).toBe(true);
    expect(component.pantryForms()).toHaveLength(1);
    expect(component.pantryForms()[0].ingredientName).toBe('');
  });
});

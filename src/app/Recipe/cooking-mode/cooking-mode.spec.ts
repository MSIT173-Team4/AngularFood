import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { getMockRecipeDetail } from '../mock-recipe.data';

import { CookingMode } from './cooking-mode';

describe('CookingMode', () => {
  let component: CookingMode;
  let fixture: ComponentFixture<CookingMode>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CookingMode],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '1' }),
              data: {
                pageData: { recipe: getMockRecipeDetail(1), source: 'mock', notice: '測試資料' }
              }
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CookingMode);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

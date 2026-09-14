import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { getMockRecipeDetail } from '../mock-recipe.data';

import { RecipeDetail } from './recipe-detail';

describe('RecipeDetail', () => {
  let component: RecipeDetail;
  let fixture: ComponentFixture<RecipeDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                pageData: { recipe: getMockRecipeDetail(1), source: 'mock', notice: '測試資料' }
              }
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render every recipe step without a three-step limit', () => {
    const recipe = getMockRecipeDetail(1);
    component.recipe.set({
      ...recipe,
      steps: Array.from({ length: 5 }, (_, index) => ({
        stepNumber: index + 1,
        instruction: `測試步驟 ${index + 1}`,
        imageUrl: null,
        timerSeconds: 0
      }))
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.instruction').length).toBe(5);
  });

  it('should expose a clickable recipe source from AI preparation tips', () => {
    const recipe = getMockRecipeDetail(1);
    component.recipe.set({
      ...recipe,
      aiPrepTips: '資料來源：測試來源｜https://example.com/recipe。食材需充分加熱。'
    });

    expect(component.recipeAttribution()).toEqual({
      sourceName: '測試來源',
      sourceUrl: 'https://example.com/recipe',
      safetyNote: '食材需充分加熱。'
    });
  });

  it('should render a YouTube link only when the video ID is valid', () => {
    const recipe = getMockRecipeDetail(1);
    component.recipe.set({
      ...recipe,
      youTubeVideoId: 'M7lc1UVf-VE'
    });

    fixture.detectChanges();

    const videoFrame = fixture.nativeElement.querySelector('.video-frame iframe');
    const sourceLink = fixture.nativeElement.querySelector('.video-section .source-link');
    expect(videoFrame).toBeTruthy();
    expect(sourceLink.getAttribute('href')).toBe(
      'https://www.youtube.com/watch?v=M7lc1UVf-VE'
    );
  });
});

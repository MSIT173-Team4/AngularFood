import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { apiConfig } from '../api.config';
import { ApiResponse, CreateRecipePayload, RecipeDetail } from '../recipe.models';
import { RecipeService } from './recipe.service';

describe('RecipeService', () => {
  let service: RecipeService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(RecipeService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('requests zero-waste recommendations for the selected user', () => {
    service.getRecommendations(2, 6).subscribe();

    const request = httpController.expectOne(
      apiConfig.recipes.recommendations(2, 6)
    );
    expect(request.request.method).toBe('GET');
    request.flush(createEnvelope([]));
  });

  it('posts the complete recipe payload to the Web API', () => {
    const payload: CreateRecipePayload = {
      userId: 2,
      categoryId: 1,
      title: '測試食譜',
      description: '測試資料',
      coverImageUrl: null,
      youTubeVideoId: null,
      aiPrepTips: null,
      isAiGenerated: false,
      defaultServings: 2,
      cookingMinutes: 10,
      totalCalories: 100,
      ingredients: [{
        ingredientId: null,
        name: '牛番茄',
        displayAmount: '1 顆',
        baseAmount: 1,
        standardUnit: '顆',
        isMain: true,
        sortOrder: 1
      }],
      steps: [{
        stepNumber: 1,
        instruction: '切塊。',
        imageUrl: null,
        timerSeconds: 0
      }],
      tagIds: []
    };

    service.createRecipe(payload).subscribe();

    const request = httpController.expectOne(apiConfig.recipes.create);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(createEnvelope<RecipeDetail>(null));
  });

  it('routes AI parsing through the FriendlyFood Web API BFF', () => {
    service.parseRecipe('番茄炒蛋').subscribe();

    const request = httpController.expectOne(apiConfig.recipes.ai.parseRecipe);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ content: '番茄炒蛋' });
    request.flush(createEnvelope(null));
  });
});

function createEnvelope<T>(data: T | null): ApiResponse<T> {
  return {
    success: true,
    message: '測試成功',
    data,
    errors: null,
    timestamp: new Date(0).toISOString()
  };
}

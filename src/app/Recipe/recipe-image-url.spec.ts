import { describe, expect, it } from 'vitest';

import {
  RECIPE_IMAGE_FALLBACK_URL,
  resolveRecipeImageUrl
} from './recipe-image-url';

describe('resolveRecipeImageUrl', () => {
  it('replaces a legacy placeholder with the matching bundled cover', () => {
    expect(resolveRecipeImageUrl(
      '香煎鮭魚佐蘆筍',
      'https://placehold.co/1200x800?text=FriendlyFood+877'
    )).toBe('/RecipeUploads/Seed/recipes/01-pan-seared-salmon.jpg');
  });

  it('uses the generated cover for a Japanese freezer-prep recipe', () => {
    expect(resolveRecipeImageUrl(
      '冷凍飯糰鮭魚茶泡飯',
      'https://placehold.co/1200x800?text=FriendlyFood+030'
    )).toBe('/RecipeUploads/Seed/recipes/30-freezer-salmon-onigiri-ochazuke.jpg');
  });

  it('uses the bundled fallback when no matching cover exists', () => {
    expect(resolveRecipeImageUrl(
      '尚未提供封面的食譜',
      'https://placehold.co/1200x800?text=FriendlyFood+999'
    )).toBe(RECIPE_IMAGE_FALLBACK_URL);
  });

  it('keeps a cloud image URL unchanged', () => {
    const cloudinaryUrl = 'https://res.cloudinary.com/friendlyfood/image/upload/recipe/cover.jpg';
    expect(resolveRecipeImageUrl('新食譜', cloudinaryUrl)).toBe(cloudinaryUrl);
  });

  it('converts an old localhost upload URL to the deployed same-origin path', () => {
    expect(resolveRecipeImageUrl(
      '新食譜',
      'https://localhost:7164/RecipeUploads/cover.jpg',
      'https://friendlyfood-web.example'
    )).toBe('/RecipeUploads/cover.jpg');
  });

  it('keeps the API image URL during localhost development', () => {
    const developmentUrl = 'https://localhost:7164/RecipeUploads/cover.jpg';
    expect(resolveRecipeImageUrl(
      '新食譜',
      developmentUrl,
      'http://localhost:4200'
    )).toBe(developmentUrl);
  });

  it('uses the backend origin for a relative Recipe upload during local development', () => {
    expect(resolveRecipeImageUrl(
      '香煎鮭魚佐蘆筍',
      '/images/recipes/01-pan-seared-salmon.jpg',
      'http://localhost:4200',
      'https://localhost:7164/api'
    )).toBe('https://localhost:7164/RecipeUploads/Seed/recipes/01-pan-seared-salmon.jpg');
  });
});

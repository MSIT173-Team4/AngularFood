import { Directive, ElementRef, inject } from '@angular/core';

import { RECIPE_IMAGE_FALLBACK_URL } from './recipe-image-url';

@Directive({
  selector: 'img[appRecipeImageFallback]',
  host: {
    '(error)': 'replaceBrokenImage()'
  }
})
export class RecipeImageFallbackDirective {
  private readonly imageElement = inject<ElementRef<HTMLImageElement>>(ElementRef);

  replaceBrokenImage(): void {
    const image = this.imageElement.nativeElement;
    if (image.getAttribute('src') === RECIPE_IMAGE_FALLBACK_URL) {
      return;
    }

    image.src = RECIPE_IMAGE_FALLBACK_URL;
  }
}

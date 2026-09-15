import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { RecipeListPageData, RecipeSummary } from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

@Component({ selector: 'app-recipe-list', imports: [RouterLink, ButtonModule, CardModule, TagModule], templateUrl: './recipe-list.html', styleUrl: './recipe-list.css' })
export class RecipeList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly recipeService = inject(RecipeService);

  readonly allRecipes = signal<RecipeSummary[]>([]);
  readonly dataNotice = signal('');
  readonly isUsingMockData = signal(false);
  readonly selectedFilter = signal('全部');
  readonly trendingRecipeIds = signal<ReadonlySet<number>>(new Set());

  readonly filterOptions = computed(() => {
    const labels = this.allRecipes().flatMap((recipe) => [
      recipe.categoryName,
      ...recipe.tags
    ]);

    return ['全部', ...new Set(labels.filter((label): label is string => Boolean(label)))];
  });

  readonly recipes = computed(() => {
    const filter = this.selectedFilter();
    if (filter === '全部') {
      return this.allRecipes();
    }

    return this.allRecipes().filter(
      (recipe) => recipe.categoryName === filter || recipe.tags.includes(filter)
    );
  });

  ngOnInit(): void {
    const pageData = this.route.snapshot.data['pageData'] as RecipeListPageData;
    this.allRecipes.set(pageData.recipes);
    this.dataNotice.set(pageData.notice);
    this.isUsingMockData.set(pageData.source === 'mock');
    this.loadTrendingRecipes();
  }

  selectFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  isTrending(recipeId: number): boolean {
    return this.trendingRecipeIds().has(recipeId);
  }

  private loadTrendingRecipes(): void {
    this.recipeService.getTrendingRecipes().subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          return;
        }

        this.trendingRecipeIds.set(
          new Set(response.data.map((item) => item.recipe.recipeId))
        );
      },
      error: () => this.trendingRecipeIds.set(new Set())
    });
  }
}

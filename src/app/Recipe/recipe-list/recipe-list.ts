import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { RecipeListPageData, RecipeSummary } from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

@Component({ selector: 'app-recipe-list', imports: [FormsModule, RouterLink, ButtonModule, CardModule, InputTextModule, TagModule], templateUrl: './recipe-list.html', styleUrl: './recipe-list.css' })
export class RecipeList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly recipeService = inject(RecipeService);

  readonly allRecipes = signal<RecipeSummary[]>([]);
  readonly dataNotice = signal('');
  readonly isUsingMockData = signal(false);
  readonly selectedFilter = signal('全部');
  readonly searchTerm = signal('');
  readonly areFiltersExpanded = signal(false);
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
    const keyword = this.searchTerm().trim().toLocaleLowerCase('zh-TW');

    return this.allRecipes().filter((recipe) => {
      const matchesFilter = filter === '全部'
        || recipe.categoryName === filter
        || recipe.tags.includes(filter);
      const searchableContent = [
        recipe.title,
        recipe.description ?? '',
        recipe.categoryName ?? '',
        recipe.authorName,
        ...recipe.tags
      ].join(' ').toLocaleLowerCase('zh-TW');

      return matchesFilter && (!keyword || searchableContent.includes(keyword));
    });
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

  toggleAllFilters(): void {
    this.areFiltersExpanded.update((isExpanded) => !isExpanded);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedFilter.set('全部');
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

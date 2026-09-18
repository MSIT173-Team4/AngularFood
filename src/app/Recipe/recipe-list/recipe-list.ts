import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { AdCheckout } from '../ad-checkout/ad-checkout';
import { RecipeListPageData, RecipeSummary } from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

@Component({
  selector: 'app-recipe-list',
  imports: [
    FormsModule,
    RouterLink,
    AdCheckout,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    TagModule
  ],
  templateUrl: './recipe-list.html',
  styleUrl: './recipe-list.css'
})
export class RecipeList implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipeService = inject(RecipeService);

  readonly allRecipes = signal<RecipeSummary[]>([]);
  readonly dataNotice = signal('');
  readonly isUsingMockData = signal(false);
  readonly selectedFilter = signal('全部');
  readonly searchTerm = signal('');
  readonly areFiltersExpanded = signal(false);
  readonly trendingRecipeIds = signal<ReadonlySet<number>>(new Set());
  readonly currentPage = signal(0);
  readonly currentAdIndex = signal(0);
  readonly adApplicationVisible = signal(false);
  readonly paymentDialogVisible = signal(false);
  readonly advertiserName = signal('');
  readonly productName = signal('');
  readonly contactEmail = signal('');
  readonly adPlacement = signal('首頁輪播廣告牆');
  readonly rentalDays = signal(7);
  readonly pageSize = 24;
  private carouselTimer: ReturnType<typeof setInterval> | null = null;

  readonly adSlides = [
    {
      eyebrow: '在地品牌合作',
      title: '讓你的手作好味道，被更多料理愛好者看見',
      description: '首頁廣告牆展示食材品牌、私房醬料與友善小農故事。',
      imageUrl: '/images/recipes/13-taiwanese-pork-fried-noodles.jpg',
      actionLabel: '申請廣告版位'
    },
    {
      eyebrow: '本週料理靈感',
      title: '冰箱食材不浪費，今晚就完成一道剛好的料理',
      description: '以現有庫存配對食譜，減少採買與食材浪費。',
      imageUrl: '/images/recipes/06-spinach-tofu-soup.jpg',
      actionLabel: '前往智慧清冰箱'
    },
    {
      eyebrow: '創作者推薦',
      title: '分享你的拿手料理，建立自己的食譜作品集',
      description: '食譜可加入步驟圖片、料理影片與特色標籤。',
      imageUrl: '/images/recipes/01-pan-seared-salmon.jpg',
      actionLabel: '建立分享食譜'
    }
  ];
  readonly placementOptions = ['首頁輪播廣告牆', '分類推薦橫幅', '食譜詳情贊助卡'];

  readonly estimatedAdPrice = computed(() => this.rentalDays() * 500);

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

  readonly pagedRecipes = computed(() => {
    const firstRecord = this.currentPage() * this.pageSize;
    return this.recipes().slice(firstRecord, firstRecord + this.pageSize);
  });

  ngOnInit(): void {
    const pageData = this.route.snapshot.data['pageData'] as RecipeListPageData;
    this.allRecipes.set(pageData.recipes);
    this.dataNotice.set(pageData.notice);
    this.isUsingMockData.set(pageData.source === 'mock');
    this.searchTerm.set(this.route.snapshot.queryParamMap?.get('q')?.trim() ?? '');
    this.loadTrendingRecipes();
    this.carouselTimer = setInterval(() => this.showNextAd(), 6000);
  }

  ngOnDestroy(): void {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
    }
  }

  showPreviousAd(): void {
    this.currentAdIndex.update((index) =>
      (index - 1 + this.adSlides.length) % this.adSlides.length
    );
  }

  showNextAd(): void {
    this.currentAdIndex.update((index) => (index + 1) % this.adSlides.length);
  }

  selectAd(index: number): void {
    this.currentAdIndex.set(index);
  }

  handleAdAction(): void {
    const index = this.currentAdIndex();
    if (index === 0) {
      this.adApplicationVisible.set(true);
      return;
    }

    void this.router.navigate([index === 1 ? '/pantry' : '/create']);
  }

  openPaymentCheckout(): void {
    if (!this.advertiserName().trim() || !this.productName().trim() ||
        !/^\S+@\S+\.\S+$/.test(this.contactEmail().trim())) {
      return;
    }

    this.adApplicationVisible.set(false);
    this.paymentDialogVisible.set(true);
  }

  returnToAdApplication(): void {
    this.adApplicationVisible.set(true);
  }

  selectFilter(filter: string): void {
    this.selectedFilter.set(filter);
    this.currentPage.set(0);
  }

  updateSearchTerm(keyword: string): void {
    this.searchTerm.set(keyword);
    this.currentPage.set(0);
  }

  changePage(event: PaginatorState): void {
    const rows = event.rows ?? this.pageSize;
    this.currentPage.set(Math.floor((event.first ?? 0) / rows));
  }

  toggleAllFilters(): void {
    this.areFiltersExpanded.update((isExpanded) => !isExpanded);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedFilter.set('全部');
    this.currentPage.set(0);
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

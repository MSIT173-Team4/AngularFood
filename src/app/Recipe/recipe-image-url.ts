import {
  RecipeDetail,
  RecipeRecommendation,
  RecipeSummary
} from './recipe.models';

export const RECIPE_IMAGE_FALLBACK_URL = '/images/recipes/recipe-cover-fallback.svg';

const seedCoverImageUrlByTitle: Readonly<Record<string, string>> = {
  '香煎鮭魚佐蘆筍': '/images/recipes/01-pan-seared-salmon.jpg',
  '香煎鱸魚佐檸檬奶油醬': '/images/recipes/02-lemon-butter-sea-bass.jpg',
  '窯烤風味瑪格麗特披薩': '/images/recipes/03-margherita-pizza.jpg',
  '松露野菇燉飯': '/images/recipes/04-truffle-mushroom-risotto.jpg',
  '活力巴西莓果碗': '/images/recipes/05-acai-berry-bowl.jpg',
  '菠菜豆腐清湯': '/images/recipes/06-spinach-tofu-soup.jpg',
  '鮮菇時蔬快炒': '/images/recipes/07-mushroom-vegetable-stir-fry.jpg',
  '味噌豆腐蔬食鍋': '/images/recipes/08-miso-tofu-hot-pot.jpg',
  '香草雞胸藜麥彩蔬碗': '/images/recipes/09-herb-chicken-quinoa-bowl.jpg',
  '黑豆薏仁排骨湯': '/images/recipes/10-black-bean-barley-pork-rib-soup.jpg',
  '花椰菜馬鈴薯泥': '/images/recipes/11-broccoli-potato-puree.jpg',
  '南瓜雞肉犬用佐餐': '/images/recipes/12-pumpkin-chicken-dog-meal.jpg',
  '台式肉絲家常炒麵': '/images/recipes/13-taiwanese-pork-fried-noodles.jpg',
  '馬鈴薯豬肉咖哩': '/images/recipes/14-japanese-pork-curry.jpg',
  '柴魚涼拌洋蔥絲': '/images/recipes/15-bonito-onion-salad.jpg',
  '冬瓜蛤蜊清湯': '/images/recipes/16-winter-melon-clam-soup.jpg',
  '古早味醬香滷豆腐': '/images/recipes/17-braised-tofu.jpg',
  '寶寶彩蔬軟飯小餐盤': '/images/recipes/18-baby-vegetable-soft-rice.jpg',
  '下味冷凍味噌豬肉菇菇燒': '/images/recipes/19-freezer-miso-pork-mushrooms.jpg',
  '下味冷凍薑汁燒肉': '/images/recipes/20-freezer-ginger-pork.jpg',
  '下味冷凍照燒雞腿': '/images/recipes/21-freezer-teriyaki-chicken.jpg',
  '下味冷凍芝麻醬油雞胸': '/images/recipes/22-freezer-sesame-soy-chicken-breast.jpg',
  '下味冷凍日式燒肉牛肉': '/images/recipes/23-freezer-yakiniku-beef.jpg',
  '下味冷凍甘辛肉燥': '/images/recipes/24-freezer-sweet-savory-pork-soboro.jpg',
  '冷凍備料豚汁味噌鍋': '/images/recipes/25-freezer-tonjiru-miso-pot.jpg',
  '冷凍烏龍蔬菜炒麵包': '/images/recipes/26-freezer-yaki-udon.jpg',
  '冷凍鮭魚味噌燒': '/images/recipes/27-freezer-miso-salmon.jpg',
  '冷凍白菜雞肉奶油煮': '/images/recipes/28-freezer-creamy-chicken-napa-cabbage.jpg',
  '冷凍番茄鯖魚咖哩': '/images/recipes/29-freezer-tomato-mackerel-curry.jpg',
  '冷凍飯糰鮭魚茶泡飯': '/images/recipes/30-freezer-salmon-onigiri-ochazuke.jpg'
};

export function resolveRecipeImageUrl(
  recipeTitle: string,
  sourceUrl: string | null | undefined,
  runtimeOrigin = window.location.origin
): string {
  const normalizedSourceUrl = sourceUrl?.trim();
  const seedCoverImageUrl = seedCoverImageUrlByTitle[recipeTitle];

  if (!normalizedSourceUrl || isLegacyPlaceholderUrl(normalizedSourceUrl, runtimeOrigin)) {
    return seedCoverImageUrl ?? RECIPE_IMAGE_FALLBACK_URL;
  }

  return normalizeLocalDevelopmentUrl(normalizedSourceUrl, runtimeOrigin);
}

export function resolveRecipeSummaryImages(recipe: RecipeSummary): RecipeSummary {
  return {
    ...recipe,
    coverImageUrl: resolveRecipeImageUrl(recipe.title, recipe.coverImageUrl)
  };
}

export function resolveRecipeDetailImages(recipe: RecipeDetail): RecipeDetail {
  const coverImageUrl = resolveRecipeImageUrl(recipe.title, recipe.coverImageUrl);

  return {
    ...recipe,
    coverImageUrl,
    steps: recipe.steps.map((step) => ({
      ...step,
      imageUrl: step.imageUrl
        ? resolveRecipeImageUrl(recipe.title, step.imageUrl)
        : null
    }))
  };
}

export function resolveRecipeRecommendationImages(
  recipe: RecipeRecommendation
): RecipeRecommendation {
  return {
    ...recipe,
    coverImageUrl: resolveRecipeImageUrl(recipe.title, recipe.coverImageUrl)
  };
}

function isLegacyPlaceholderUrl(url: string, runtimeOrigin: string): boolean {
  try {
    const hostname = new URL(url, runtimeOrigin).hostname.toLowerCase();
    return hostname === 'placehold.co' || hostname === 'www.placehold.co';
  } catch {
    return false;
  }
}

function normalizeLocalDevelopmentUrl(url: string, runtimeOrigin: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return url.startsWith('/') ? url : `/${url}`;
  }

  try {
    const parsedUrl = new URL(url);
    const sourceHostname = parsedUrl.hostname.toLowerCase();
    if (!isLoopbackHostname(sourceHostname)) {
      return url;
    }

    const runtimeHostname = new URL(runtimeOrigin).hostname.toLowerCase();
    if (isLoopbackHostname(runtimeHostname)) {
      return url;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return RECIPE_IMAGE_FALLBACK_URL;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

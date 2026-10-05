import {
  RecipeDetail,
  RecipeRecommendation,
  RecipeSummary
} from './recipe.models';
import { environment } from '../../environments/environment';

const BACKEND_SEED_IMAGE_PREFIX = '/RecipeUploads/Seed/recipes/';

export const RECIPE_IMAGE_FALLBACK_URL = resolveBackendAssetUrl(
  `${BACKEND_SEED_IMAGE_PREFIX}recipe-cover-fallback.svg`,
  environment.apiUrl
);

const seedCoverImageUrlByTitle: Readonly<Record<string, string>> = {
  '香煎鮭魚佐蘆筍': seedImageUrl('01-pan-seared-salmon.jpg'),
  '香煎鱸魚佐檸檬奶油醬': seedImageUrl('02-lemon-butter-sea-bass.jpg'),
  '窯烤風味瑪格麗特披薩': seedImageUrl('03-margherita-pizza.jpg'),
  '松露野菇燉飯': seedImageUrl('04-truffle-mushroom-risotto.jpg'),
  '活力巴西莓果碗': seedImageUrl('05-acai-berry-bowl.jpg'),
  '菠菜豆腐清湯': seedImageUrl('06-spinach-tofu-soup.jpg'),
  '鮮菇時蔬快炒': seedImageUrl('07-mushroom-vegetable-stir-fry.jpg'),
  '味噌豆腐蔬食鍋': seedImageUrl('08-miso-tofu-hot-pot.jpg'),
  '香草雞胸藜麥彩蔬碗': seedImageUrl('09-herb-chicken-quinoa-bowl.jpg'),
  '黑豆薏仁排骨湯': seedImageUrl('10-black-bean-barley-pork-rib-soup.jpg'),
  '花椰菜馬鈴薯泥': seedImageUrl('11-broccoli-potato-puree.jpg'),
  '南瓜雞肉犬用佐餐': seedImageUrl('12-pumpkin-chicken-dog-meal.jpg'),
  '台式肉絲家常炒麵': seedImageUrl('13-taiwanese-pork-fried-noodles.jpg'),
  '馬鈴薯豬肉咖哩': seedImageUrl('14-japanese-pork-curry.jpg'),
  '柴魚涼拌洋蔥絲': seedImageUrl('15-bonito-onion-salad.jpg'),
  '冬瓜蛤蜊清湯': seedImageUrl('16-winter-melon-clam-soup.jpg'),
  '古早味醬香滷豆腐': seedImageUrl('17-braised-tofu.jpg'),
  '寶寶彩蔬軟飯小餐盤': seedImageUrl('18-baby-vegetable-soft-rice.jpg'),
  '下味冷凍味噌豬肉菇菇燒': seedImageUrl('19-freezer-miso-pork-mushrooms.jpg'),
  '下味冷凍薑汁燒肉': seedImageUrl('20-freezer-ginger-pork.jpg'),
  '下味冷凍照燒雞腿': seedImageUrl('21-freezer-teriyaki-chicken.jpg'),
  '下味冷凍芝麻醬油雞胸': seedImageUrl('22-freezer-sesame-soy-chicken-breast.jpg'),
  '下味冷凍日式燒肉牛肉': seedImageUrl('23-freezer-yakiniku-beef.jpg'),
  '下味冷凍甘辛肉燥': seedImageUrl('24-freezer-sweet-savory-pork-soboro.jpg'),
  '冷凍備料豚汁味噌鍋': seedImageUrl('25-freezer-tonjiru-miso-pot.jpg'),
  '冷凍烏龍蔬菜炒麵包': seedImageUrl('26-freezer-yaki-udon.jpg'),
  '冷凍鮭魚味噌燒': seedImageUrl('27-freezer-miso-salmon.jpg'),
  '冷凍白菜雞肉奶油煮': seedImageUrl('28-freezer-creamy-chicken-napa-cabbage.jpg'),
  '冷凍番茄鯖魚咖哩': seedImageUrl('29-freezer-tomato-mackerel-curry.jpg'),
  '冷凍飯糰鮭魚茶泡飯': seedImageUrl('30-freezer-salmon-onigiri-ochazuke.jpg')
};

export function resolveRecipeImageUrl(
  recipeTitle: string,
  sourceUrl: string | null | undefined,
  runtimeOrigin = getRuntimeOrigin(),
  apiUrl = environment.apiUrl
): string {
  const normalizedSourceUrl = sourceUrl?.trim();
  const seedCoverImageUrl = seedCoverImageUrlByTitle[recipeTitle];

  if (!normalizedSourceUrl || isLegacyPlaceholderUrl(normalizedSourceUrl, runtimeOrigin)) {
    return seedCoverImageUrl ?? RECIPE_IMAGE_FALLBACK_URL;
  }

  return normalizePublicImageUrl(normalizedSourceUrl, runtimeOrigin, apiUrl);
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

function normalizePublicImageUrl(
  url: string,
  runtimeOrigin: string,
  apiUrl: string
): string {
  if (!/^https?:\/\//i.test(url)) {
    const rootRelativeUrl = url.startsWith('/') ? url : `/${url}`;
    const backendUrl = convertLegacyFrontendImagePath(rootRelativeUrl);
    return resolveBackendAssetUrl(backendUrl, apiUrl);
  }

  try {
    const parsedUrl = new URL(url);
    const sourceHostname = parsedUrl.hostname.toLowerCase();
    if (!isLoopbackHostname(sourceHostname)) {
      return url;
    }

    const runtimeHostname = new URL(runtimeOrigin).hostname.toLowerCase();
    if (isLoopbackHostname(runtimeHostname)) {
      const backendPath = convertLegacyFrontendImagePath(
        `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      );
      if (backendPath !== `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`) {
        return resolveBackendAssetUrl(backendPath, apiUrl);
      }

      return url;
    }

    const sameOriginUrl = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    return resolveBackendAssetUrl(
      convertLegacyFrontendImagePath(sameOriginUrl),
      apiUrl
    );
  } catch {
    return RECIPE_IMAGE_FALLBACK_URL;
  }
}

function seedImageUrl(fileName: string): string {
  return resolveBackendAssetUrl(
    `${BACKEND_SEED_IMAGE_PREFIX}${fileName}`,
    environment.apiUrl
  );
}

function convertLegacyFrontendImagePath(url: string): string {
  const legacyPrefix = '/images/recipes/';
  return url.toLowerCase().startsWith(legacyPrefix)
    ? `${BACKEND_SEED_IMAGE_PREFIX}${url.slice(legacyPrefix.length)}`
    : url;
}

function resolveBackendAssetUrl(assetUrl: string, apiUrl: string): string {
  if (!assetUrl.startsWith('/RecipeUploads/')) {
    return assetUrl;
  }

  if (!/^https?:\/\//i.test(apiUrl)) {
    return assetUrl;
  }

  try {
    return `${new URL(apiUrl).origin}${assetUrl}`;
  } catch {
    return assetUrl;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getRuntimeOrigin(): string {
  return typeof window === 'undefined'
    ? 'http://localhost'
    : window.location.origin;
}

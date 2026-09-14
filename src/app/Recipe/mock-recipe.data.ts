import {
  PantryItem,
  RecipeDetail,
  RecipeSummary
} from './recipe.models';

const image = (title: string): string =>
  `https://placehold.co/900x600/f1ded5/5b382c?text=${encodeURIComponent(title)}`;

export const MOCK_RECIPES: RecipeSummary[] = [
  createRecipeSummary(1, '香煎鮭魚佐蘆筍', '外酥內嫩的鮭魚搭配嫩綠蘆筍與清爽柑橘油醋。', 25, 480, 326, true, '異國料理'),
  createRecipeSummary(2, '香煎鱸魚佐檸檬奶油醬', '魚皮金黃酥脆，佐以微酸解膩的蒜香檸檬奶油醬。', 35, 420, 284, true, '異國料理'),
  createRecipeSummary(3, '窯烤風味瑪格麗特披薩', '番茄、羅勒與莫札瑞拉起司交織的經典拿坡里風味。', 45, 620, 192, true, '烘焙'),
  createRecipeSummary(4, '松露野菇燉飯', '綜合蕈菇與義大利米慢煮出滑順而濃郁的森林香氣。', 30, 510, 238, false, '異國料理'),
  createRecipeSummary(5, '活力巴西莓果碗', '十分鐘完成的高纖早餐，搭配莓果與堅果穀物。', 10, 290, 417, false, '健康輕食'),
  createRecipeSummary(6, '菠菜豆腐清湯', '優先消耗即期菠菜與板豆腐的清爽零剩食料理。', 15, 180, 156, true, '家常菜'),
  createRecipeSummary(7, '鮮菇時蔬快炒', '用冰箱常備蔬菜快速完成色彩豐富的家常菜。', 18, 260, 121, true, '家常菜'),
  createRecipeSummary(8, '味噌豆腐蔬食鍋', '一鍋到底的暖胃料理，適合清理零散菇類與蔬菜。', 25, 360, 203, false, '家常菜'),
  createRecipeSummary(9, '香草雞胸藜麥彩蔬碗', '雞胸、藜麥與彩蔬組成方便備餐的高蛋白餐盒。', 30, 460, 188, false, '健康輕食', ['健身餐', '高蛋白']),
  createRecipeSummary(10, '黑豆薏仁排骨湯', '以黑豆、薏仁與排骨慢煮的產後餐點靈感。', 70, 390, 132, false, '特殊照護', ['月子餐', '一鍋到底']),
  createRecipeSummary(11, '花椰菜馬鈴薯泥', '六個月以上寶寶練習吞嚥的無加鹽細緻蔬菜泥。', 20, 95, 96, false, '特殊照護', ['寶寶副食品', '無加鹽']),
  createRecipeSummary(12, '南瓜雞肉犬用佐餐', '無鹽南瓜與雞肉製成的犬用少量佐餐，不作完整主食。', 25, 160, 84, false, '寵物料理', ['寵物鮮食', '犬用佐餐'])
];

function createRecipeSummary(
  recipeId: number,
  title: string,
  description: string,
  cookingMinutes: number,
  totalCalories: number,
  likes: number,
  isAiGenerated: boolean,
  categoryName: string,
  tags: string[] = ['新手友善', '零剩食']
): RecipeSummary {
  return {
    recipeId,
    title,
    description,
    coverImageUrl: image(title),
    cookingMinutes,
    totalCalories,
    defaultServings: recipeId === 5 ? 1 : 2,
    views: 120,
    likes,
    favorites: Math.floor(likes / 3),
    isAiGenerated,
    categoryName,
    authorName: 'recipe.demo',
    tags
  };
}

type MockIngredientDefinition = [name: string, displayAmount: string, amount: number | null, unit: string];

const mockDetailContent: Record<number, { ingredients: MockIngredientDefinition[]; steps: string[]; tip: string }> = {
  1: { ingredients: [['大西洋鮭魚排', '350 公克', 350, 'g'], ['嫩蘆筍', '150 公克', 150, 'g'], ['柳橙', '1 顆', 1, '顆']], steps: ['鮭魚擦乾後調味，蘆筍切除粗硬末端。', '魚皮朝下以中火煎至金黃，再翻面煎熟。', '蘆筍入鍋煎熟，淋上柳橙汁後盛盤。'], tip: '資料來源：USDA Nutrition.gov｜https://www.nutrition.gov/recipes。魚肉中心須完全加熱。' },
  2: { ingredients: [['鱸魚片', '300 公克', 300, 'g'], ['無鹽奶油', '30 公克', 30, 'g'], ['黃檸檬', '1 顆', 1, '顆']], steps: ['鱸魚擦乾並在魚皮劃淺刀，檸檬榨汁。', '魚皮朝下壓平香煎，翻面後煎至熟透。', '原鍋融化奶油拌入檸檬汁，淋回魚片。'], tip: '資料來源：Mayo Clinic Healthy Recipes｜https://www.mayoclinic.org/healthy-lifestyle/recipes/dash-diet-recipes/rcs-20077146。魚肉中心須完全加熱。' },
  3: { ingredients: [['高筋麵粉', '300 公克', 300, 'g'], ['牛番茄', '2 顆', 2, '顆'], ['莫札瑞拉起司', '150 公克', 150, 'g']], steps: ['麵粉加水與酵母揉成麵團並發酵。', '麵團擀平後鋪上番茄片與起司。', '高溫烘烤至餅皮上色、起司融化。'], tip: '資料來源：USDA Nutrition.gov｜https://www.nutrition.gov/recipes。烤箱與烤盤溫度高，取放時使用隔熱手套。' },
  4: { ingredients: [['義大利米', '180 公克', 180, 'g'], ['鮮香菇', '200 公克', 200, 'g'], ['帕瑪森起司', '30 公克', 30, 'g']], steps: ['香菇切片後炒至水分收乾。', '加入義大利米，分次拌入熱高湯。', '米心熟而帶彈性時拌入起司後離火。'], tip: '資料來源：Mayo Clinic Healthy Recipes｜https://www.mayoclinic.org/healthy-lifestyle/recipes/dash-diet-recipes/rcs-20077146。野菇應充分加熱後食用。' },
  5: { ingredients: [['冷凍莓果', '100 公克', 100, 'g'], ['香蕉', '1 根', 1, '根'], ['希臘優格', '60 公克', 60, 'g']], steps: ['冷凍莓果稍微退冰，香蕉切段。', '莓果、香蕉與優格攪打至濃稠。', '倒入碗中並依喜好加入穀物配料。'], tip: '資料來源：USDA Nutrition.gov｜https://www.nutrition.gov/recipes。幼兒食用堅果時須依年齡調整型態並全程看護。' },
  6: { ingredients: [['菠菜', '150 公克', 150, 'g'], ['板豆腐', '半盒', 200, 'g'], ['雞蛋', '1 顆', 1, '顆']], steps: ['菠菜洗淨切段，豆腐切成小塊。', '水滾後加入豆腐，以小火煮出豆香。', '放入菠菜並淋入蛋液，蛋熟後關火。'], tip: '資料來源：衛生福利部國民健康署｜https://health99.hpa.gov.tw/storage/files/materials/22208-1.pdf。雞蛋須煮至蛋白與蛋黃凝固。' },
  7: { ingredients: [['鮮香菇', '200 公克', 200, 'g'], ['紅蘿蔔', '1 根', 1, '根'], ['菠菜', '100 公克', 100, 'g']], steps: ['香菇切片、紅蘿蔔切絲、菠菜切段。', '先炒香菇與紅蘿蔔至軟化。', '加入菠菜大火快炒，葉片轉綠即起鍋。'], tip: '資料來源：衛生福利部國民健康署｜https://health99.hpa.gov.tw/storage/files/materials/22208-1.pdf。蔬菜洗後瀝乾，避免熱油噴濺。' },
  8: { ingredients: [['板豆腐', '1 盒', 400, 'g'], ['鮮香菇', '150 公克', 150, 'g'], ['味噌', '2 大匙', 30, 'g']], steps: ['豆腐切塊，香菇切片並備妥剩餘蔬菜。', '香菇與耐煮蔬菜入鍋煮熟。', '轉小火溶入味噌，加入豆腐溫熱後關火。'], tip: '資料來源：USDA Nutrition.gov｜https://www.nutrition.gov/recipes。味噌鈉含量較高，可依需求減量。' },
  9: { ingredients: [['雞胸肉', '300 公克', 300, 'g'], ['藜麥', '120 公克', 120, 'g'], ['青花椰菜', '180 公克', 180, 'g']], steps: ['藜麥洗淨後加水煮熟並燜五分鐘。', '雞胸肉拍平撒香草，煎至中心熟透。', '花椰菜蒸熟，與藜麥及雞胸分區裝盤。'], tip: '資料來源：USDA MyPlate｜https://www.myplate.gov/web/web/eat-healthy/protein-foods。雞肉中心須完全加熱。' },
  10: { ingredients: [['豬小排', '500 公克', 500, 'g'], ['黑豆', '80 公克', 80, 'g'], ['薏仁', '60 公克', 60, 'g']], steps: ['黑豆與薏仁洗淨浸泡，排骨汆燙。', '所有材料加水煮滾後轉小火。', '燉至豆仁與排骨軟熟，撇油後調味。'], tip: '資料來源：臺大醫院新竹分院｜https://www.hch.gov.tw/?aid=626&iid=748&page_name=detail&pid=62。產後特殊需求先諮詢醫療人員。' },
  11: { ingredients: [['青花椰菜', '40 公克', 40, 'g'], ['馬鈴薯', '50 公克', 50, 'g'], ['飲用水', '30 毫升', 30, 'ml']], steps: ['花椰菜與馬鈴薯洗淨切小塊。', '蒸至用叉子可輕易壓碎。', '加少量溫水壓成符合寶寶發展階段的質地。'], tip: '資料來源：NHS Start for Life｜https://www.nhs.uk/best-start-in-life/baby/recipes-and-meal-ideas/。不加鹽糖，首次食材少量嘗試並全程看護。' },
  12: { ingredients: [['去皮雞胸肉', '150 公克', 150, 'g'], ['南瓜', '100 公克', 100, 'g'], ['飲用水', '適量', null, '']], steps: ['雞肉去皮去骨，南瓜去籽後切小塊。', '分別以清水煮至完全熟透，不加調味。', '放涼後切碎拌勻，依犬隻體型少量餵食。'], tip: '資料來源：UC Davis School of Veterinary Medicine｜https://healthtopics.vetmed.ucdavis.edu/health-topics/canine/treat-guidelines-dogs。僅供偶爾佐餐；長期鮮食須諮詢獸醫營養師。' }
};

export const MOCK_RECIPE_DETAILS: RecipeDetail[] = MOCK_RECIPES.map((recipe) => ({
  ...recipe,
  userId: 1,
  categoryId: null,
  youTubeVideoId: null,
  aiPrepTips: mockDetailContent[recipe.recipeId].tip,
  ingredients: mockDetailContent[recipe.recipeId].ingredients.map((ingredient, index) => ({
    ingredientId: recipe.recipeId * 100 + index + 1,
    name: ingredient[0],
    displayAmount: ingredient[1],
    baseAmount: ingredient[2],
    unit: ingredient[3],
    isMain: true,
    sortOrder: index + 1
  })),
  steps: mockDetailContent[recipe.recipeId].steps.map((instruction, index) => ({
    stepNumber: index + 1,
    instruction,
    imageUrl: image(`${recipe.title}步驟${index + 1}`),
    timerSeconds: [300, 480, 180][index]
  }))
}));

export const MOCK_PANTRY_ITEMS: PantryItem[] = [
  createPantryItem(1, 21, '菠菜', 150, 'g', 1),
  createPantryItem(2, 22, '板豆腐', 200, 'g', 2),
  createPantryItem(3, 23, '紅蘿蔔', 2, '根', 7),
  createPantryItem(4, 24, '鮮香菇', 200, 'g', 5),
  createPantryItem(5, 25, '雞蛋', 6, '顆', 9),
  createPantryItem(6, 26, '無鹽奶油', 120, 'g', 18)
];

function createPantryItem(
  pantryId: number,
  ingredientId: number,
  ingredientName: string,
  amount: number,
  unit: string,
  daysLeft: number
): PantryItem {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysLeft);

  return {
    pantryId,
    userId: 2,
    ingredientId,
    ingredientName,
    amount,
    unit,
    expirationDate: expirationDate.toISOString().slice(0, 10),
    daysLeft,
    storageLocation: '冷藏',
    note: 'Angular Mock 測試資料',
    createdAt: new Date().toISOString()
  };
}

export const getMockRecipeDetail = (recipeId: number): RecipeDetail =>
  MOCK_RECIPE_DETAILS.find((recipe) => recipe.recipeId === recipeId) ?? MOCK_RECIPE_DETAILS[0];

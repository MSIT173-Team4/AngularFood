// trip-builder 自己的設定（這次只改 FoodMap 範圍，所以沒有動 src/environments）

import { environment } from '../../../environments/environment';

// 本機開發：https://localhost:7164/api；正式版：/api（由 nginx 轉給後端）
export const API_BASE_URL = environment.apiUrl;

// ⚠️ 前端顯示地圖用的「瀏覽器金鑰」，跟後端 User Secrets 裡呼叫 Places/Routes 的金鑰要分開：
//   1. Google Cloud Console 建一把新的 API Key
//   2. 應用程式限制選「HTTP 參照網址」，加入 http://localhost:4200/* 和正式網域
//   3. API 限制只勾「Maps JavaScript API」
// 這把金鑰一定會出現在瀏覽器裡，沒有加參照網址限制的話任何人都能拿去用。
export const GOOGLE_MAPS_BROWSER_KEY = 'AIzaSyDKvDQlAxNr4ayFSuVeSaCVvom08GFX2vg';

// 進階標記（AdvancedMarkerElement）需要 Map ID。
// 'DEMO_MAP_ID' 是 Google 提供給開發測試用的；上線前到 Cloud Console 的「地圖管理」建立正式的 Map ID。
export const GOOGLE_MAP_ID = 'DEMO_MAP_ID';

// 抓不到使用者位置、會員也沒填地址時的預設中心點（台北車站）
export const DEFAULT_CENTER = { lat: 25.0478, lng: 121.5170 };

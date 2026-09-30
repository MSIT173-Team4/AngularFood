// 正式版（ng build，預設 production）使用的設定。
// 前端和後端透過 nginx 放在同一個網域，/api 由 nginx 轉給後端，所以這裡用相對路徑。
export const environment = {
  production: true,
  apiUrl: '/api',
};

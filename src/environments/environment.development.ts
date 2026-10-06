// 本機開發（ng serve，development 設定）使用的設定。
// 建置時 angular.json 的 fileReplacements 會用這個檔案取代 environment.ts，
// 所以兩個檔案的欄位要一模一樣，少一個就會出現 TS2339。
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7164/api',
  url: 'https://localhost:7164',
  googleClientId: '954621879714-15jnqpn4rrmtf1ulb2uhfg461a9m568h.apps.googleusercontent.com',
};

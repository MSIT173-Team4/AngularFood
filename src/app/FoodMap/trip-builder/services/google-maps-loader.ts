import { Injectable } from '@angular/core';

import { GOOGLE_MAPS_BROWSER_KEY } from '../api-config';

// 需要用到的 Google Maps 類別。沒有安裝 @types/google.maps（這次不動 package.json），
// 所以用 any 接，只在 trip-builder 內部使用。
export interface GoogleMapsLibraries {
  Map: any;
  InfoWindow: any;
  Polyline: any;
  LatLngBounds: any;
  AdvancedMarkerElement: any;
  encoding: any;
  event: any;
}

// 動態載入 Maps JavaScript API（不用改 index.html、不用安裝 @angular/google-maps）
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoader {
  private loading: Promise<GoogleMapsLibraries> | null = null;

  load(): Promise<GoogleMapsLibraries> {
    this.loading ??= this.loadScript().then(() => this.importLibraries());
    return this.loading;
  }

  private loadScript(): Promise<void> {
    const w = window as any;

    if (w.google?.maps?.importLibrary) {
      return Promise.resolve();
    }

    if (!GOOGLE_MAPS_BROWSER_KEY) {
      return Promise.reject(
        new Error('尚未設定 Google 地圖金鑰（FoodMap/trip-builder/api-config.ts 的 GOOGLE_MAPS_BROWSER_KEY）')
      );
    }

    return new Promise<void>((resolve, reject) => {
      const callbackName = '__friendlyFoodMapsReady';

      w[callbackName] = () => {
        delete w[callbackName];
        resolve();
      };

      // 金鑰錯誤、未開通或網域不在允許清單時，Google 會呼叫這個全域函式
      w.gm_authFailure = () => {
        reject(new Error('Google 地圖金鑰驗證失敗，請確認金鑰、已開通 Maps JavaScript API、網域限制是否正確'));
      };

      const params = new URLSearchParams({
        key: GOOGLE_MAPS_BROWSER_KEY,
        v: 'weekly',
        loading: 'async',
        language: 'zh-TW',
        region: 'TW',
        callback: callbackName
      });

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.onerror = () => {
        this.loading = null;
        reject(new Error('Google 地圖載入失敗，請確認網路連線'));
      };

      document.head.appendChild(script);
    });
  }

  private async importLibraries(): Promise<GoogleMapsLibraries> {
    const maps = (window as any).google.maps;

    const [mapsLibrary, markerLibrary, geometryLibrary, coreLibrary] = await Promise.all([
      maps.importLibrary('maps'),
      maps.importLibrary('marker'),
      maps.importLibrary('geometry'),
      maps.importLibrary('core')
    ]);

    return {
      Map: mapsLibrary.Map,
      InfoWindow: mapsLibrary.InfoWindow,
      Polyline: mapsLibrary.Polyline,
      LatLngBounds: coreLibrary.LatLngBounds,
      AdvancedMarkerElement: markerLibrary.AdvancedMarkerElement,
      encoding: geometryLibrary.encoding,
      event: coreLibrary.event
    };
  }
}

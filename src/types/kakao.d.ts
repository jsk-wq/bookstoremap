export interface KakaoLatLngBounds {
  extend: (latlng: KakaoLatLng) => void;
}

export interface KakaoMaps {
  maps: {
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoLatLngBounds;
    MarkerImage: new (
      src: string,
      size: KakaoSize,
      options?: { offset?: KakaoPoint },
    ) => KakaoMarkerImage;
    Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMap;
    Marker: new (options: KakaoMarkerOptions) => KakaoMarker;
    InfoWindow: new (options: { content: string; removable?: boolean }) => KakaoInfoWindow;
    Point: new (x: number, y: number) => KakaoPoint;
    Size: new (width: number, height: number) => KakaoSize;
    load: (callback: () => void) => void;
    event: {
      addListener: (
        target: KakaoMarker | KakaoMap,
        type: string,
        handler: () => void,
      ) => void;
    };
  };
}

export interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

export type KakaoMarkerImage = object;

export type KakaoPoint = object;

export type KakaoSize = object;

export interface KakaoMapOptions {
  center: KakaoLatLng;
  level: number;
}

export interface KakaoMap {
  setCenter: (latlng: KakaoLatLng) => void;
  setBounds: (bounds: KakaoLatLngBounds) => void;
  setLevel: (level: number) => void;
  relayout: () => void;
}

export interface KakaoMarkerOptions {
  image?: KakaoMarkerImage;
  map?: KakaoMap;
  position: KakaoLatLng;
  title?: string;
}

export interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
  getPosition: () => KakaoLatLng;
}

export interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

declare global {
  interface Window {
    kakao?: KakaoMaps;
  }
}

export {};

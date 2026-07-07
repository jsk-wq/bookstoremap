"use client";

import { useEffect, useRef, useState } from "react";
import { BOOKSTORE_CATEGORY_LABELS, type Bookstore } from "@/types/bookstore";
import type { KakaoInfoWindow, KakaoMap, KakaoMarker } from "@/types/kakao";

interface BookstoreMapProps {
  bookstores: Bookstore[];
  hasActiveFilters: boolean;
  totalFilteredCount: number;
  maxVisibleMarkers: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DEFAULT_CENTER = { lat: 36.5, lng: 127.8 };
const DEFAULT_LEVEL = 13;
const DEFAULT_KAKAO_MAP_APP_KEY = "d1c0a4a03267888fa5b8e3d622c731ac";
const MARKER_COLORS = {
  independent: "#9a6a2f",
  cafe: "#15803d",
  used: "#2563eb",
  family: "#f97316",
  mixed: "#7c3aed",
};

function loadKakaoMapScript(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById("kakao-map-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("카카오맵 SDK 로드 실패")));
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.async = true;
    script.defer = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false`;
    script.onload = () => {
      if (window.kakao?.maps) {
        resolve();
        return;
      }

      reject(new Error("카카오맵 SDK가 로드됐지만 window.kakao.maps를 찾을 수 없습니다."));
    };
    script.onerror = () => {
      reject(
        new Error(
          "카카오맵 SDK 로드 실패: JavaScript 키, Web 도메인 등록, 지도 API 사용 설정을 확인하세요.",
        ),
      );
    };
    document.head.appendChild(script);
  });
}

function getMarkerColor(store: Bookstore): string {
  if (store.categories.length > 1) return MARKER_COLORS.mixed;
  if (store.categories.includes("cafe")) return MARKER_COLORS.cafe;
  if (store.categories.includes("used")) return MARKER_COLORS.used;
  if (store.categories.includes("family")) return MARKER_COLORS.family;
  return MARKER_COLORS.independent;
}

function createMarkerImage(color: string) {
  const svg = `
    <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 42C17 42 31 26.9 31 15.9C31 7.7 24.7 2 17 2C9.3 2 3 7.7 3 15.9C3 26.9 17 42 17 42Z" fill="${color}" stroke="white" stroke-width="3"/>
      <circle cx="17" cy="16" r="5.5" fill="white"/>
    </svg>
  `;
  const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

  return new window.kakao!.maps.MarkerImage(
    src,
    new window.kakao!.maps.Size(34, 44),
    { offset: new window.kakao!.maps.Point(17, 42) },
  );
}

export default function BookstoreMap({
  bookstores,
  hasActiveFilters,
  totalFilteredCount,
  maxVisibleMarkers,
  selectedId,
  onSelect,
}: BookstoreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || DEFAULT_KAKAO_MAP_APP_KEY;

    if (!appKey) {
      setMapError("NEXT_PUBLIC_KAKAO_MAP_APP_KEY가 설정되지 않았습니다.");
      return;
    }

    let cancelled = false;

    loadKakaoMapScript(appKey)
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.kakao) return;

        window.kakao.maps.load(() => {
          if (cancelled || !mapContainerRef.current) return;

          const center = new window.kakao!.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
          mapRef.current = new window.kakao!.maps.Map(mapContainerRef.current, {
            center,
            level: DEFAULT_LEVEL,
          });
          setMapReady(true);
        });
      })
      .catch((error: Error) => {
        if (!cancelled) setMapError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    mapRef.current.relayout();

    const bounds = new window.kakao.maps.LatLngBounds();

    bookstores.forEach((store) => {
      const position = new window.kakao!.maps.LatLng(store.lat, store.lng);
      const categoryLabels = store.categories
        .map((category) => BOOKSTORE_CATEGORY_LABELS[category])
        .join(" · ");
      const marker = new window.kakao!.maps.Marker({
        image: createMarkerImage(getMarkerColor(store)),
        map: mapRef.current!,
        position,
        title: store.name,
      });

      const content = `
        <div style="padding:10px 12px;min-width:180px;font-size:13px;line-height:1.5;">
          <strong style="display:block;margin-bottom:4px;">${store.name}</strong>
          <span style="display:inline-block;margin-bottom:4px;color:${getMarkerColor(store)};font-weight:600;">${categoryLabels}</span><br/>
          <span style="color:#555;">${store.address}</span>
          ${store.phone ? `<div style="margin-top:4px;color:#666;">${store.phone}</div>` : ""}
        </div>
      `;

      const infoWindow = new window.kakao!.maps.InfoWindow({
        content,
        removable: true,
      });

      window.kakao!.maps.event.addListener(marker, "click", () => {
        infoWindowRef.current?.close();
        infoWindow.open(mapRef.current!, marker);
        infoWindowRef.current = infoWindow;
        onSelect(store.id);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (bookstores.length === 1) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(bookstores[0].lat, bookstores[0].lng));
      mapRef.current.setLevel(5);
    } else if (bookstores.length > 1) {
      mapRef.current.setBounds(bounds);
    } else if (!hasActiveFilters) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
      mapRef.current.setLevel(DEFAULT_LEVEL);
    }
  }, [bookstores, hasActiveFilters, mapReady, onSelect]);

  useEffect(() => {
    if (!selectedId || !mapRef.current || !window.kakao) return;

    const store = bookstores.find((item) => item.id === selectedId);
    if (!store) return;

    const position = new window.kakao.maps.LatLng(store.lat, store.lng);
    mapRef.current.setCenter(position);
    mapRef.current.setLevel(4);
  }, [selectedId, bookstores]);

  if (mapError) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-ink-50 p-8 text-center">
        <div>
          <p className="text-sm font-medium text-ink-800">지도를 불러올 수 없습니다</p>
          <p className="mt-2 text-sm text-ink-600">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-ink-200 shadow-sm">
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-50">
          <p className="text-sm text-ink-600">지도를 불러오는 중...</p>
        </div>
      )}
      {mapReady && !hasActiveFilters && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-2xl border border-ink-200 bg-white/95 px-4 py-3 text-sm text-ink-600 shadow-sm">
          아직 펼쳐진 책길이 없습니다. 지역이나 분류를 골라 첫 길을 열어보세요.
        </div>
      )}
      {mapReady && hasActiveFilters && bookstores.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-2xl border border-ink-200 bg-white/95 px-4 py-3 text-sm text-ink-600 shadow-sm">
          이 조건에 맞는 책길을 찾지 못했습니다.
        </div>
      )}
      {mapReady && hasActiveFilters && totalFilteredCount > maxVisibleMarkers && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-800 shadow-sm">
          결과 {totalFilteredCount.toLocaleString("ko-KR")}곳 중 지도에는 처음{" "}
          {maxVisibleMarkers.toLocaleString("ko-KR")}곳만 표시됩니다. 동네를 더 좁혀 나만의 길을 찾아보세요.
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}

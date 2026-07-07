"use client";

import type { Bookstore } from "@/types/bookstore";
import { BOOKSTORE_CATEGORY_LABELS, KOREAN_REGIONS, type BookstoreCategory } from "@/types/bookstore";

interface BookstoreSidebarProps {
  bookstores: Bookstore[];
  filteredBookstores: Bookstore[];
  selectedId: string | null;
  search: string;
  searchActive: boolean;
  filterActive: boolean;
  selectedRegions: string[];
  regionSearch: string;
  regionCounts: Record<string, number>;
  selectedCategories: BookstoreCategory[];
  categoryCounts: Record<BookstoreCategory, number>;
  keyword: string;
  keywordOptions: string[];
  favoriteIds: Set<string>;
  favoriteCount: number;
  showFavoritesOnly: boolean;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  onSearchChange: (value: string) => void;
  onRegionSearchChange: (value: string) => void;
  onToggleRegion: (value: string) => void;
  onToggleCategory: (value: BookstoreCategory) => void;
  onKeywordChange: (value: string) => void;
  onShowFavoritesOnlyChange: (value: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onClearFilters: () => void;
  onSelect: (id: string) => void;
}

export default function BookstoreSidebar({
  bookstores,
  filteredBookstores,
  selectedId,
  search,
  searchActive,
  filterActive,
  selectedRegions,
  regionSearch,
  regionCounts,
  selectedCategories,
  categoryCounts,
  keyword,
  keywordOptions,
  favoriteIds,
  favoriteCount,
  showFavoritesOnly,
  loading,
  error,
  fetchedAt,
  onSearchChange,
  onRegionSearchChange,
  onToggleRegion,
  onToggleCategory,
  onKeywordChange,
  onShowFavoritesOnlyChange,
  onToggleFavorite,
  onClearFilters,
  onSelect,
}: BookstoreSidebarProps) {
  const selectedCategoryLabel = selectedCategories
    .map((item) => BOOKSTORE_CATEGORY_LABELS[item])
    .join(", ");
  const resultLabel =
    filterActive
      ? `${filteredBookstores.length}곳의 책길 / 전체 ${bookstores.length}곳`
      : `지역과 분류를 고르면 오늘 걷고 싶은 책길이 열립니다`;
  const filterSummary =
    selectedRegions.length > 0 ||
    selectedCategories.length > 0 ||
    regionSearch ||
    searchActive ||
    keyword ||
    showFavoritesOnly
      ? [
          selectedRegions.length > 0 ? `걸어볼 곳 ${selectedRegions.join(", ")}` : "",
          regionSearch ? `동네 ${regionSearch}` : "",
          selectedCategoryLabel ? `책길 ${selectedCategoryLabel}` : "",
          searchActive ? `검색 ${search}` : "",
          keyword ? `키워드 ${keyword}` : "",
          showFavoritesOnly ? "담아둔 책길" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  return (
    <aside className="flex h-full flex-col gap-4">
      <div>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">책길 지도</h1>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          전국의 서점을 따라 나만의 책길을 찾아보세요.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-600">책길 검색</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="책방 이름, 동네, 기억나는 키워드"
            className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm outline-none ring-ink-400 transition focus:bg-white focus:ring-2"
          />
        </label>

        <section className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-600">어디로 걸어볼까요?</span>
            <span className="text-xs text-ink-400">{selectedRegions.length}개 선택</span>
          </div>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-ink-100 bg-ink-50 p-2">
            {KOREAN_REGIONS.filter((item) => item !== "전체").map((item) => {
              const selected = selectedRegions.includes(item);

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onToggleRegion(item)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    selected
                      ? "border-ink-800 bg-ink-900 text-white"
                      : "border-ink-200 bg-white text-ink-600 hover:border-ink-400"
                  }`}
                >
                  {item} ({regionCounts[item] ?? 0})
                </button>
              );
            })}
          </div>
        </section>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-600">동네를 더 좁혀보기</span>
          <input
            type="search"
            value={regionSearch}
            onChange={(event) => onRegionSearchChange(event.target.value)}
            placeholder="예: 강남구, 수원시, 전주시, 제주특별자치도"
            className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm outline-none ring-ink-400 transition focus:bg-white focus:ring-2"
          />
        </label>

        <section className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-600">어떤 책길을 찾나요?</span>
            <span className="text-xs text-ink-400">{selectedCategories.length}개 선택</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(BOOKSTORE_CATEGORY_LABELS) as BookstoreCategory[]).map((item) => {
              const selected = selectedCategories.includes(item);

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onToggleCategory(item)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                    selected
                      ? "border-ink-800 bg-ink-900 text-white"
                      : "border-ink-200 bg-ink-50 text-ink-700 hover:border-ink-400"
                  }`}
                >
                  {BOOKSTORE_CATEGORY_LABELS[item]}
                  <span className={`ml-1 ${selected ? "text-white/70" : "text-ink-400"}`}>
                    ({categoryCounts[item] ?? 0})
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <label className="grid gap-1.5">
            <span className="text-xs font-medium text-ink-600">책길 힌트</span>
            <select
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm outline-none ring-ink-400 transition focus:bg-white focus:ring-2"
            >
              <option value="">전체</option>
              {keywordOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
        </label>

        <button
          type="button"
          onClick={() => onShowFavoritesOnlyChange(!showFavoritesOnly)}
          className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
            showFavoritesOnly
              ? "border-rose-300 bg-rose-50 text-rose-700"
              : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
          }`}
        >
          {showFavoritesOnly ? "♥ 담아둔 책길 보는 중" : "♡ 담아둔 책길만 보기"}
          <span className={showFavoritesOnly ? "ml-1 text-rose-500" : "ml-1 text-ink-400"}>
            ({favoriteCount})
          </span>
        </button>

        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>{loading ? "데이터 불러오는 중..." : resultLabel}</span>
          {fetchedAt && <span>{new Date(fetchedAt).toLocaleString("ko-KR")} 갱신</span>}
        </div>
        {filterSummary && <p className="text-xs leading-5 text-ink-500">{filterSummary}</p>}
        {filterActive && (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
          >
            책길 다시 고르기
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {filterActive ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
          <ul className="h-full overflow-y-auto">
            {filteredBookstores.length === 0 && !loading ? (
              <li className="px-4 py-8 text-center text-sm text-ink-500">
                아직 이 조건에 맞는 책길이 없습니다.
              </li>
            ) : (
              filteredBookstores.map((store) => {
                const active = store.id === selectedId;
                const favorite = favoriteIds.has(store.id);

                return (
                  <li key={store.id} className="border-b border-ink-100 last:border-b-0">
                    <div className={`flex gap-2 px-4 py-3 transition ${
                      active ? "bg-ink-100" : "hover:bg-ink-50"
                    }`}>
                      <button
                        type="button"
                        onClick={() => onSelect(store.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink-900">{store.name}</p>
                          <p className="mt-1 text-sm text-ink-600">{store.address}</p>
                          <p className="mt-1 text-xs font-medium text-ink-500">
                            {store.categories
                              .map((item) => BOOKSTORE_CATEGORY_LABELS[item])
                              .join(" · ")}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs text-ink-600">
                          {store.region}
                        </span>
                      </div>
                      {store.keywords && (
                        <p className="mt-2 line-clamp-2 text-xs text-ink-500">{store.keywords}</p>
                      )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(store.id)}
                        aria-label={favorite ? `${store.name} 책길에서 빼기` : `${store.name} 책길에 담기`}
                        className={`h-9 shrink-0 rounded-full border px-2.5 text-sm font-medium transition ${
                          favorite
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-ink-200 bg-white text-ink-500 hover:bg-ink-50"
                        }`}
                      >
                        {favorite ? "♥" : "♡"}
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white/70 px-4 py-6 text-center text-sm text-ink-500">
          아직 펼쳐진 책길이 없습니다. 지역이나 분류를 골라 첫 길을 열어보세요.
        </div>
      )}
    </aside>
  );
}

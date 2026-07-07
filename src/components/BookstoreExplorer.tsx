"use client";

import { useEffect, useMemo, useState } from "react";
import BookstoreMap from "@/components/BookstoreMap";
import BookstoreSidebar from "@/components/BookstoreSidebar";
import { collectKeywordOptions, filterBookstores } from "@/lib/bookstores";
import {
  BOOKSTORE_CATEGORY_LABELS,
  type Bookstore,
  type BookstoreCategory,
  type BookstoresApiResult,
} from "@/types/bookstore";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const MAX_VISIBLE_MARKERS = 800;
const FAVORITES_STORAGE_KEY = "bookroadmap:favorites";

export default function BookstoreExplorer() {
  const [bookstores, setBookstores] = useState<Bookstore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionSearch, setRegionSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<BookstoreCategory[]>([]);
  const [keyword, setKeyword] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBookstores() {
      setLoading(true);
      setError(null);

      try {
        let response = await fetch("/api/bookstores");

        if (!response.ok) {
          response = await fetch(`${BASE_PATH}/bookstores.json`);
        }

        const data = (await response.json()) as BookstoresApiResult & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "독립서점 데이터를 불러오지 못했습니다.");
        }

        if (cancelled) return;

        setBookstores(data.bookstores);
        setFetchedAt(data.fetchedAt);
        setSelectedId(null);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "알 수 없는 오류");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBookstores();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) setFavoriteIds(JSON.parse(saved) as string[]);
    } catch {
      setFavoriteIds([]);
    } finally {
      setFavoritesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!favoritesLoaded) return;
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, favoritesLoaded]);

  const keywordOptions = useMemo(() => collectKeywordOptions(bookstores), [bookstores]);
  const regionCounts = useMemo(() => {
    return bookstores.reduce<Record<string, number>>((counts, store) => {
      counts[store.region] = (counts[store.region] ?? 0) + 1;
      return counts;
    }, {});
  }, [bookstores]);
  const categoryCounts = useMemo(() => {
    return bookstores.reduce<Record<BookstoreCategory, number>>(
      (counts, store) => {
        for (const item of store.categories) {
          counts[item] += 1;
        }
        return counts;
      },
      { independent: 0, cafe: 0, used: 0, family: 0 },
    );
  }, [bookstores]);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const filteredBookstores = useMemo(() => {
    const filtered = filterBookstores(bookstores, {
        search,
        regions: selectedRegions,
        regionSearch,
        categories: selectedCategories,
        keyword,
      });

    return showFavoritesOnly ? filtered.filter((store) => favoriteIdSet.has(store.id)) : filtered;
  }, [
    bookstores,
    search,
    selectedRegions,
    regionSearch,
    selectedCategories,
    keyword,
    showFavoritesOnly,
    favoriteIdSet,
  ]);
  const searchActive = search.trim().length > 0;
  const filterActive =
    searchActive ||
    selectedRegions.length > 0 ||
    regionSearch.trim().length > 0 ||
    selectedCategories.length > 0 ||
    keyword.trim().length > 0 ||
    showFavoritesOnly;
  const visibleBookstores = filterActive ? filteredBookstores.slice(0, MAX_VISIBLE_MARKERS) : [];

  function toggleRegion(region: string) {
    setSelectedRegions((current) =>
      current.includes(region) ? current.filter((item) => item !== region) : [...current, region],
    );
  }

  function toggleCategory(category: BookstoreCategory) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function clearFilters() {
    setSearch("");
    setSelectedRegions([]);
    setRegionSearch("");
    setSelectedCategories([]);
    setKeyword("");
    setShowFavoritesOnly(false);
    setSelectedId(null);
  }

  function toggleFavorite(id: string) {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (showFavoritesOnly) setShowFavoritesOnly(false);
  }

  useEffect(() => {
    if (!filterActive) {
      setSelectedId(null);
      return;
    }

    if (selectedId && !filteredBookstores.some((store) => store.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filterActive, filteredBookstores, selectedId]);

  const selectedStore = filteredBookstores.find((store) => store.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 lg:h-screen lg:max-h-screen lg:py-8">
      <div className="grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
        <BookstoreSidebar
          bookstores={bookstores}
          filteredBookstores={filteredBookstores}
          selectedId={selectedId}
          search={search}
          searchActive={searchActive}
          filterActive={filterActive}
          selectedRegions={selectedRegions}
          regionSearch={regionSearch}
          regionCounts={regionCounts}
          selectedCategories={selectedCategories}
          categoryCounts={categoryCounts}
          keyword={keyword}
          keywordOptions={keywordOptions}
          favoriteIds={favoriteIdSet}
          favoriteCount={favoriteIds.length}
          showFavoritesOnly={showFavoritesOnly}
          loading={loading}
          error={error}
          fetchedAt={fetchedAt}
          onSearchChange={handleSearchChange}
          onRegionSearchChange={setRegionSearch}
          onToggleRegion={toggleRegion}
          onToggleCategory={toggleCategory}
          onKeywordChange={setKeyword}
          onShowFavoritesOnlyChange={setShowFavoritesOnly}
          onToggleFavorite={toggleFavorite}
          onClearFilters={clearFilters}
          onSelect={setSelectedId}
        />

        <div className="flex min-h-0 flex-col gap-4">
          <BookstoreMap
            bookstores={visibleBookstores}
            hasActiveFilters={filterActive}
            totalFilteredCount={filteredBookstores.length}
            maxVisibleMarkers={MAX_VISIBLE_MARKERS}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {selectedStore && (
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink-900">{selectedStore.name}</h2>
                  <p className="mt-1 text-sm text-ink-600">{selectedStore.address}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-500">
                    {selectedStore.categories
                      .map((item) => BOOKSTORE_CATEGORY_LABELS[item])
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(selectedStore.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      favoriteIdSet.has(selectedStore.id)
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                    }`}
                  >
                    {favoriteIdSet.has(selectedStore.id) ? "♥ 담아둔 곳" : "♡ 책길에 담기"}
                  </button>
                  <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">
                    {selectedStore.region}
                  </span>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-sm text-ink-700 sm:grid-cols-2">
                {selectedStore.phone && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      머물 정보
                    </dt>
                    <dd className="mt-1">{selectedStore.phone}</dd>
                  </div>
                )}
                {selectedStore.hours && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      길 위의 시간
                    </dt>
                    <dd className="mt-1 whitespace-pre-line">{selectedStore.hours}</dd>
                  </div>
                )}
                {selectedStore.keywords && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      이곳의 힌트
                    </dt>
                    <dd className="mt-1">{selectedStore.keywords}</dd>
                  </div>
                )}
                {selectedStore.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      이곳의 책길
                    </dt>
                    <dd className="mt-1 whitespace-pre-line">{selectedStore.description}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import BookstoreMap from "@/components/BookstoreMap";
import BookstoreSidebar from "@/components/BookstoreSidebar";
import { collectKeywordOptions, filterBookstores } from "@/lib/bookstores";
import type { Bookstore, BookstoresApiResult } from "@/types/bookstore";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function BookstoreExplorer() {
  const [bookstores, setBookstores] = useState<Bookstore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("전체");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBookstores() {
      setLoading(true);
      setError(null);

      try {
        let response = await fetch(`${BASE_PATH}/bookstores.json`);

        if (!response.ok) {
          response = await fetch("/api/bookstores");
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

  const keywordOptions = useMemo(() => collectKeywordOptions(bookstores), [bookstores]);

  const filteredBookstores = useMemo(
    () => filterBookstores(bookstores, { search, region, keyword }),
    [bookstores, search, region, keyword],
  );
  const searchActive = search.trim().length > 0;

  useEffect(() => {
    if (!searchActive) {
      setSelectedId(null);
      return;
    }

    if (filteredBookstores.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredBookstores.some((store) => store.id === selectedId)) {
      setSelectedId(filteredBookstores[0].id);
    }
  }, [filteredBookstores, searchActive, selectedId]);

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
          region={region}
          keyword={keyword}
          keywordOptions={keywordOptions}
          loading={loading}
          error={error}
          fetchedAt={fetchedAt}
          onSearchChange={setSearch}
          onRegionChange={setRegion}
          onKeywordChange={setKeyword}
          onSelect={setSelectedId}
        />

        <div className="flex min-h-0 flex-col gap-4">
          <BookstoreMap
            bookstores={filteredBookstores}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {selectedStore && (
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink-900">{selectedStore.name}</h2>
                  <p className="mt-1 text-sm text-ink-600">{selectedStore.address}</p>
                </div>
                <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">
                  {selectedStore.region}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm text-ink-700 sm:grid-cols-2">
                {selectedStore.phone && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      연락처
                    </dt>
                    <dd className="mt-1">{selectedStore.phone}</dd>
                  </div>
                )}
                {selectedStore.hours && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      운영 정보
                    </dt>
                    <dd className="mt-1 whitespace-pre-line">{selectedStore.hours}</dd>
                  </div>
                )}
                {selectedStore.keywords && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      키워드
                    </dt>
                    <dd className="mt-1">{selectedStore.keywords}</dd>
                  </div>
                )}
                {selectedStore.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      상세 설명
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

import { NextResponse } from "next/server";
import { fetchBookstoresFromSources } from "@/lib/bookstores";
import type { BookstoreCategory } from "@/types/bookstore";
import type { BookstoresApiResult } from "@/types/bookstore";

export const dynamic = "force-dynamic";

let cache: BookstoresApiResult | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET() {
  const independentKey = process.env.CULTURE_API_KEY;
  const cafeKey = process.env.CAFE_BOOKSTORE_API_KEY;
  const usedKey = process.env.USED_BOOKSTORE_API_KEY;
  const familyKey = process.env.FAMILY_CULTURE_API_KEY;

  if (!independentKey && !cafeKey && !usedKey && !familyKey) {
    return NextResponse.json(
      {
        error:
          "CULTURE_API_KEY, CAFE_BOOKSTORE_API_KEY, USED_BOOKSTORE_API_KEY, FAMILY_CULTURE_API_KEY 중 하나 이상의 환경변수가 필요합니다. .env.local 파일을 확인하세요.",
      },
      { status: 500 },
    );
  }

  const now = Date.now();

  if (cache && now < cacheExpiresAt) {
    return NextResponse.json(cache);
  }

  try {
    const bookstores = await fetchBookstoresFromSources({ independentKey, cafeKey, usedKey, familyKey });
    const categoryCounts = bookstores.reduce<Record<BookstoreCategory, number>>(
      (counts, store) => {
        for (const category of store.categories) {
          counts[category] += 1;
        }
        return counts;
      },
      { independent: 0, cafe: 0, used: 0, family: 0 },
    );
    const result: BookstoresApiResult = {
      bookstores,
      totalCount: bookstores.length,
      categoryCounts,
      cached: false,
      fetchedAt: new Date().toISOString(),
    };

    cache = { ...result, cached: true };
    cacheExpiresAt = now + CACHE_TTL_MS;

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";

    if (cache) {
      return NextResponse.json({
        ...cache,
        cached: true,
        stale: true,
        error: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

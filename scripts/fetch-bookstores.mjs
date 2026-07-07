import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASES = {
  independent: "http://api.kcisa.kr/openapi/API_CIA_089/request",
  cafe: "http://api.kcisa.kr/openapi/API_CIA_090/request",
  used: "https://api.kcisa.kr/API_CNV_045/request",
  family: "https://api.odcloud.kr/api/15111391/v1/uddi:19c0c9ab-ac89-486b-b4b8-b026506dc3fa",
};
const CATEGORY_LABELS = {
  independent: "독립서점",
  cafe: "카페가 있는 서점",
  used: "중고서점",
  family: "가족단위 문화시설",
};
const PAGE_SIZE = 100;
const FAMILY_PAGE_SIZE = 1000;
const OUTPUT_PATH = path.join(process.cwd(), "public", "bookstores.json");
const API_ITEM_FIELDS = [
  "TITLE",
  "ADDRESS",
  "COORDINATES",
  "CONTACT_POINT",
  "DESCRIPTION",
  "SUB_DESCRIPTION",
  "SUBJECT_KEYWORD",
  "FCLTY_NM",
  "FCLTY_ROAD_NM_ADDR",
  "FCLTY_LA",
  "FCLTY_LO",
  "TEL_NO",
  "LCLAS_NM",
  "MLSFC_NM",
  "WORKDAY_OPN_BSNS_TIME",
  "WORKDAY_CLOS_TIME",
  "SAT_OPN_BSNS_TIME",
  "SAT_CLOS_TIME",
  "SUN_OPN_BSNS_TIME",
  "SUN_CLOS_TIME",
  "RSTDE_GUID_CN",
  "OPTN_DC",
  "ADIT_DC",
];

async function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");

  try {
    const contents = await readFile(envPath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=");
      }
    }
  } catch {
    // GitHub Actions provides environment variables directly.
  }
}

function decodeXmlEntity(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .trim();
}

function readXmlTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlEntity(match[1]) : "";
}

function normalizeItems(item) {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function parseXmlResponse(xml) {
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const items = itemMatches.map((itemXml) => {
    const item = {};

    for (const field of API_ITEM_FIELDS) {
      const value = readXmlTag(itemXml, field);
      if (value) item[field] = value;
    }

    return item;
  });

  return {
    response: {
      header: {
        resultCode: readXmlTag(xml, "resultCode"),
        resultMsg: readXmlTag(xml, "resultMsg"),
      },
      body: {
        totalCount: readXmlTag(xml, "totalCount") || items.length,
        items: { item: items },
      },
    },
  };
}

function parseResponse(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("독립서점 API 응답이 비어 있습니다.");
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  if (trimmed.startsWith("<")) return parseXmlResponse(trimmed);
  throw new Error(`독립서점 API 응답 형식을 확인할 수 없습니다: ${trimmed.slice(0, 80)}`);
}

function extractRegion(address) {
  const trimmed = address.replace(/^\s*\([^)]*\)\s*/, "").trim();
  if (!trimmed) return "기타";

  const specialMatch = trimmed.match(
    /^(서울|부산|대구|인천|광주|대전|울산|세종|서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시)/,
  );
  if (specialMatch) return specialMatch[1].slice(0, 2);

  const provinceMatch = trimmed.match(
    /^(경기|강원|충북|충남|전북|전남|경북|경남|제주|경기도|강원특별자치도|강원도|충청북도|충청남도|전북특별자치도|전라북도|전라남도|경상북도|경상남도|제주특별자치도|제주도)/,
  );
  if (!provinceMatch) return "기타";

  const province = provinceMatch[1];
  if (province.startsWith("경기")) return "경기";
  if (province.startsWith("강원")) return "강원";
  if (province.startsWith("충청북") || province.startsWith("충북")) return "충북";
  if (province.startsWith("충청남") || province.startsWith("충남")) return "충남";
  if (province.startsWith("전북") || province.startsWith("전라북")) return "전북";
  if (province.startsWith("전남") || province.startsWith("전라남")) return "전남";
  if (province.startsWith("경북") || province.startsWith("경상북")) return "경북";
  if (province.startsWith("경남") || province.startsWith("경상남")) return "경남";
  if (province.startsWith("제주")) return "제주";

  return province.slice(0, 2);
}

function mapApiItemToBookstore(item, index, category) {
  const coordinates = item.COORDINATES?.trim().split(/[,\s]+/).map((value) => value.trim()) ?? [];
  const lat = Number(coordinates[0] ?? item.FCLTY_LA);
  const lng = Number(coordinates[1] ?? item.FCLTY_LO);
  const name = item.TITLE ?? item.FCLTY_NM;

  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const address = item.ADDRESS ?? item.FCLTY_ROAD_NM_ADDR ?? "";
  const keywords = [CATEGORY_LABELS[category], item.SUBJECT_KEYWORD, item.LCLAS_NM, item.MLSFC_NM]
    .filter(Boolean)
    .join(", ");
  const hours = [
    item.DESCRIPTION,
    item.WORKDAY_OPN_BSNS_TIME && item.WORKDAY_CLOS_TIME
      ? `평일 ${item.WORKDAY_OPN_BSNS_TIME}~${item.WORKDAY_CLOS_TIME}`
      : undefined,
    item.SAT_OPN_BSNS_TIME && item.SAT_CLOS_TIME
      ? `토요일 ${item.SAT_OPN_BSNS_TIME}~${item.SAT_CLOS_TIME}`
      : undefined,
    item.SUN_OPN_BSNS_TIME && item.SUN_CLOS_TIME
      ? `일요일 ${item.SUN_OPN_BSNS_TIME}~${item.SUN_CLOS_TIME}`
      : undefined,
    item.RSTDE_GUID_CN ? `휴무 ${item.RSTDE_GUID_CN}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
  const description = [item.SUB_DESCRIPTION, item.OPTN_DC, item.ADIT_DC].filter(Boolean).join("\n");

  return {
    id: `${category}-${name}-${address}-${index}`,
    name,
    address,
    lat,
    lng,
    phone: item.CONTACT_POINT ?? item.TEL_NO ?? "",
    hours,
    description,
    keywords,
    region: extractRegion(address),
    categories: [category],
  };
}

async function fetchPage(serviceKey, pageNo, category) {
  const params = new URLSearchParams({
    serviceKey,
    pageNo: String(pageNo),
    numOfRows: String(PAGE_SIZE),
    type: "json",
  });

  const response = await fetch(`${API_BASES[category]}?${params.toString()}`);
  if (!response.ok) throw new Error(`${CATEGORY_LABELS[category]} API 요청 실패: HTTP ${response.status}`);

  return parseResponse(await response.text());
}

async function fetchAllBookstores(serviceKey, category) {
  if (category === "family") {
    return fetchFamilyFacilities(serviceKey);
  }

  const firstPage = await fetchPage(serviceKey, 1, category);
  const header = firstPage.response.header;
  const isSuccess =
    header.resultCode === "0000" ||
    header.resultCode === "0" ||
    header.resultMsg === "NORMAL_SERVICE" ||
    header.resultMsg === "NORMAL SERVICE";

  if (!isSuccess) {
    throw new Error(`${CATEGORY_LABELS[category]} API 오류: ${header.resultMsg} (${header.resultCode})`);
  }

  const totalCount = Number(firstPage.response.body.totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const bookstores = [];
  let index = 0;

  for (const item of normalizeItems(firstPage.response.body.items?.item)) {
    const mapped = mapApiItemToBookstore(item, index++, category);
    if (mapped) bookstores.push(mapped);
  }

  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    const page = await fetchPage(serviceKey, pageNo, category);
    for (const item of normalizeItems(page.response.body.items?.item)) {
      const mapped = mapApiItemToBookstore(item, index++, category);
      if (mapped) bookstores.push(mapped);
    }
  }

  return bookstores;
}

function readString(item, key) {
  const value = item[key];
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function mapFamilyFacilityToBookstore(item, index) {
  const name = readString(item, "시설명");
  const lat = Number(readString(item, "위도"));
  const lng = Number(readString(item, "경도"));

  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const branch = readString(item, "분점명");
  const address = readString(item, "도로명주소") || readString(item, "지번주소");
  const categories = [readString(item, "카테고리1"), readString(item, "카테고리2"), readString(item, "카테고리3")]
    .filter(Boolean)
    .join(", ");
  const facilities = [
    readString(item, "무료주차 가능여부") === "Y" ? "무료주차" : "",
    readString(item, "유료주차 가능여부") === "Y" ? "유료주차" : "",
    readString(item, "가족 화장실 보유 여부") === "Y" ? "가족화장실" : "",
    readString(item, "수유실 보유 여부") === "Y" ? "수유실" : "",
    readString(item, "유모차 대여 여부") === "Y" ? "유모차 대여" : "",
    readString(item, "키즈존 여부") === "Y" ? "키즈존" : "",
  ].filter(Boolean);
  const hours = [readString(item, "운영시간"), readString(item, "휴무일") && `휴무 ${readString(item, "휴무일")}`]
    .filter(Boolean)
    .join("\n");
  const description = [
    categories,
    readString(item, "입장 가능 나이") && `입장 가능 나이: ${readString(item, "입장 가능 나이")}`,
    facilities.length > 0 && `편의시설: ${facilities.join(", ")}`,
    readString(item, "홈페이지"),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: `family-${name}-${address}-${index}`,
    name: branch ? `${name} ${branch}` : name,
    address,
    lat,
    lng,
    phone: readString(item, "전화번호"),
    hours,
    description,
    keywords: [CATEGORY_LABELS.family, categories, facilities.join(", ")]
      .filter(Boolean)
      .join(", "),
    region: extractRegion(address || readString(item, "시도 명칭")),
    categories: ["family"],
  };
}

async function fetchFamilyPage(serviceKey, page) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(FAMILY_PAGE_SIZE),
    serviceKey,
  });
  const response = await fetch(`${API_BASES.family}?${params.toString()}`);
  if (!response.ok) throw new Error(`가족단위 문화시설 API 요청 실패: HTTP ${response.status}`);
  return response.json();
}

async function fetchFamilyFacilities(serviceKey) {
  const firstPage = await fetchFamilyPage(serviceKey, 1);
  const totalPages = Math.max(1, Math.ceil(firstPage.totalCount / FAMILY_PAGE_SIZE));
  const facilities = [];
  let index = 0;

  for (const item of firstPage.data ?? []) {
    const mapped = mapFamilyFacilityToBookstore(item, index++);
    if (mapped) facilities.push(mapped);
  }

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await fetchFamilyPage(serviceKey, page);
    for (const item of nextPage.data ?? []) {
      const mapped = mapFamilyFacilityToBookstore(item, index++);
      if (mapped) facilities.push(mapped);
    }
  }

  return facilities;
}

function normalizeDedupeKey(store) {
  return `${store.name.trim().toLowerCase()}::${store.address.replace(/\s+/g, "")}`;
}

function mergeBookstoreCategories(bookstores) {
  const merged = new Map();

  for (const store of bookstores) {
    const key = normalizeDedupeKey(store);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, store);
      continue;
    }

    const categories = Array.from(new Set([...existing.categories, ...store.categories]));
    const keywords = Array.from(
      new Set(
        [existing.keywords, store.keywords]
          .join(",")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ).join(", ");

    merged.set(key, {
      ...existing,
      categories,
      keywords,
      phone: existing.phone || store.phone,
      hours: existing.hours || store.hours,
      description: existing.description || store.description,
    });
  }

  return Array.from(merged.values());
}

await loadLocalEnv();

const independentKey = process.env.CULTURE_API_KEY;
const cafeKey = process.env.CAFE_BOOKSTORE_API_KEY;
const usedKey = process.env.USED_BOOKSTORE_API_KEY;
const familyKey = process.env.FAMILY_CULTURE_API_KEY;

if (!independentKey && !cafeKey && !usedKey && !familyKey) {
  throw new Error(
    "CULTURE_API_KEY, CAFE_BOOKSTORE_API_KEY, USED_BOOKSTORE_API_KEY, FAMILY_CULTURE_API_KEY 중 하나 이상의 환경변수가 필요합니다.",
  );
}

const results = await Promise.allSettled([
  independentKey ? fetchAllBookstores(independentKey, "independent") : Promise.resolve([]),
  cafeKey ? fetchAllBookstores(cafeKey, "cafe") : Promise.resolve([]),
  usedKey ? fetchAllBookstores(usedKey, "used") : Promise.resolve([]),
  familyKey ? fetchAllBookstores(familyKey, "family") : Promise.resolve([]),
]);
const bookstores = mergeBookstoreCategories(
  results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
);
const categoryCounts = bookstores.reduce(
  (counts, store) => {
    for (const category of store.categories) {
      counts[category] += 1;
    }
    return counts;
  },
  { independent: 0, cafe: 0, used: 0, family: 0 },
);
const result = {
  bookstores,
  totalCount: bookstores.length,
  categoryCounts,
  cached: false,
  fetchedAt: new Date().toISOString(),
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Wrote ${bookstores.length} bookstores to ${OUTPUT_PATH}`);

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "http://api.kcisa.kr/openapi/API_CIA_089/request";
const PAGE_SIZE = 100;
const OUTPUT_PATH = path.join(process.cwd(), "public", "bookstores.json");
const API_ITEM_FIELDS = [
  "TITLE",
  "ADDRESS",
  "COORDINATES",
  "CONTACT_POINT",
  "DESCRIPTION",
  "SUB_DESCRIPTION",
  "SUBJECT_KEYWORD",
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
  const trimmed = address.trim();
  if (!trimmed) return "기타";

  const specialMatch = trimmed.match(
    /^(서울|부산|대구|인천|광주|대전|울산|세종)(?:특별?시|광역시|특별자치시)?/,
  );
  if (specialMatch) return specialMatch[1];

  const provinceMatch = trimmed.match(
    /^(경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별?자치?도|도)?/,
  );
  if (provinceMatch) return provinceMatch[1];

  return "기타";
}

function mapApiItemToBookstore(item, index) {
  const coordinates = item.COORDINATES?.split(",").map((value) => value.trim()) ?? [];
  const lat = Number(coordinates[0]);
  const lng = Number(coordinates[1]);

  if (!item.TITLE || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const address = item.ADDRESS ?? "";

  return {
    id: `${item.TITLE}-${address}-${index}`,
    name: item.TITLE,
    address,
    lat,
    lng,
    phone: item.CONTACT_POINT ?? "",
    hours: item.DESCRIPTION ?? "",
    description: item.SUB_DESCRIPTION ?? "",
    keywords: item.SUBJECT_KEYWORD ?? "",
    region: extractRegion(address),
  };
}

async function fetchPage(serviceKey, pageNo) {
  const params = new URLSearchParams({
    serviceKey,
    pageNo: String(pageNo),
    numOfRows: String(PAGE_SIZE),
    type: "json",
  });

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) throw new Error(`독립서점 API 요청 실패: HTTP ${response.status}`);

  return parseResponse(await response.text());
}

async function fetchAllBookstores(serviceKey) {
  const firstPage = await fetchPage(serviceKey, 1);
  const header = firstPage.response.header;
  const isSuccess =
    header.resultCode === "0000" ||
    header.resultCode === "0" ||
    header.resultMsg === "NORMAL_SERVICE" ||
    header.resultMsg === "NORMAL SERVICE";

  if (!isSuccess) {
    throw new Error(`독립서점 API 오류: ${header.resultMsg} (${header.resultCode})`);
  }

  const totalCount = Number(firstPage.response.body.totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const bookstores = [];
  let index = 0;

  for (const item of normalizeItems(firstPage.response.body.items?.item)) {
    const mapped = mapApiItemToBookstore(item, index++);
    if (mapped) bookstores.push(mapped);
  }

  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    const page = await fetchPage(serviceKey, pageNo);
    for (const item of normalizeItems(page.response.body.items?.item)) {
      const mapped = mapApiItemToBookstore(item, index++);
      if (mapped) bookstores.push(mapped);
    }
  }

  return bookstores;
}

await loadLocalEnv();

const serviceKey = process.env.CULTURE_API_KEY;

if (!serviceKey) {
  throw new Error("CULTURE_API_KEY 환경변수가 필요합니다.");
}

const bookstores = await fetchAllBookstores(serviceKey);
const result = {
  bookstores,
  totalCount: bookstores.length,
  cached: false,
  fetchedAt: new Date().toISOString(),
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Wrote ${bookstores.length} bookstores to ${OUTPUT_PATH}`);

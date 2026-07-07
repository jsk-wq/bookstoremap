export type BookstoreCategory = "independent" | "cafe" | "used" | "family";

export const BOOKSTORE_CATEGORY_LABELS: Record<BookstoreCategory, string> = {
  independent: "독립서점",
  cafe: "카페가 있는 서점",
  used: "중고서점",
  family: "가족단위 문화시설",
};

export interface Bookstore {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
  description: string;
  keywords: string;
  region: string;
  categories: BookstoreCategory[];
}

export interface BookstoreApiItem {
  TITLE?: string;
  ADDRESS?: string;
  COORDINATES?: string;
  CONTACT_POINT?: string;
  DESCRIPTION?: string;
  SUB_DESCRIPTION?: string;
  SUBJECT_KEYWORD?: string;
  FCLTY_NM?: string;
  FCLTY_ROAD_NM_ADDR?: string;
  FCLTY_LA?: string;
  FCLTY_LO?: string;
  TEL_NO?: string;
  LCLAS_NM?: string;
  MLSFC_NM?: string;
  WORKDAY_OPN_BSNS_TIME?: string;
  WORKDAY_CLOS_TIME?: string;
  SAT_OPN_BSNS_TIME?: string;
  SAT_CLOS_TIME?: string;
  SUN_OPN_BSNS_TIME?: string;
  SUN_CLOS_TIME?: string;
  RSTDE_GUID_CN?: string;
  OPTN_DC?: string;
  ADIT_DC?: string;
}

export interface BookstoreApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      totalCount: string | number;
      numOfRows?: string | number;
      pageNo?: string | number;
      items?: {
        item?: BookstoreApiItem | BookstoreApiItem[];
      };
    };
  };
}

export interface BookstoresApiResult {
  bookstores: Bookstore[];
  totalCount: number;
  categoryCounts?: Record<BookstoreCategory, number>;
  cached: boolean;
  fetchedAt: string;
}

export const KOREAN_REGIONS = [
  "전체",
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export type KoreanRegion = (typeof KOREAN_REGIONS)[number];

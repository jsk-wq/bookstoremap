# 전국 독립서점 지도

문화체육관광부 [문화공공데이터광장 – 전국 독립서점 및 운영정보](https://www.culture.go.kr/data/openapi/openapiView.do?id=623) API와 카카오맵을 사용해 전국 독립서점을 지도에서 탐색하는 Next.js 앱입니다.

## 기능

- 전국 독립서점 데이터 자동 수집 (페이지네이션 처리)
- 카카오맵 마커 및 상세 정보 표시
- 서점명·주소·키워드 검색
- 지역·키워드 필터
- GitHub Pages 정적 배포 지원

## 시작하기

### 1. API 키 발급

1. [문화공공데이터광장](https://www.culture.go.kr/data/main/main.do) 또는 [공공데이터포털](https://www.data.go.kr/data/15138901/openapi.do)에서 **전국 독립서점 및 운영정보** 활용신청
2. [Kakao Developers](https://developers.kakao.com)에서 JavaScript 키 발급
3. 카카오 개발자 콘솔 → 앱 → 플랫폼 → **Web** 도메인 등록
   - 로컬: `http://localhost:3000`
   - 배포 URL도 함께 등록

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 예시:

```env
CULTURE_API_KEY=발급받은_문화_API_키
CAFE_BOOKSTORE_API_KEY=발급받은_카페서점_API_키
USED_BOOKSTORE_API_KEY=발급받은_중고서점_API_키
FAMILY_CULTURE_API_KEY=발급받은_가족문화시설_API_키
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=발급받은_카카오_JavaScript_키
```

### 3. 실행

```bash
npm install
npm run dev
```

`npm run dev`는 먼저 공공데이터 API를 호출해 `public/bookstores.json`을 생성한 뒤 개발 서버를 실행합니다.

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 프로젝트 구조

```text
.github/workflows/pages.yml  # GitHub Pages 배포 워크플로
scripts/fetch-bookstores.mjs # 독립서점 데이터 정적 JSON 생성
src/
  app/
    page.tsx                  # 메인 페이지
  components/
    BookstoreExplorer.tsx     # 검색/필터/지도 통합 UI
    BookstoreMap.tsx          # 카카오맵
    BookstoreSidebar.tsx      # 목록 및 필터
  lib/bookstores.ts           # API 호출 및 데이터 변환
  types/                      # TypeScript 타입
```

## 데이터 생성

```bash
npm run fetch:bookstores
```

생성 파일:

```text
public/bookstores.json
```

## GitHub Pages 배포

저장소 Secrets에 아래 값을 등록해야 합니다.

```env
CULTURE_API_KEY=발급받은_문화_API_키
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=발급받은_카카오_JavaScript_키
```

GitHub 저장소 Settings → Pages에서 Build and deployment Source를 **GitHub Actions**로 설정하면 `main` 브랜치 push 시 자동 배포됩니다.

카카오맵 Web 플랫폼에는 배포 주소도 등록해야 합니다.

```text
https://jsk-wq.github.io/bookstoremap
https://jsk-wq.github.io
```

## 데이터 출처

- 한국문화정보원_전국 독립서점 및 운영정보 (API_CIA_089)

## Vercel 배포

Vercel 프로젝트의 Settings → Environment Variables에 아래 값을 Production, Preview, Development 환경에 등록하세요.

```env
CULTURE_API_KEY=발급받은_문화_API_키
CAFE_BOOKSTORE_API_KEY=발급받은_카페서점_API_키
USED_BOOKSTORE_API_KEY=발급받은_중고서점_API_키
FAMILY_CULTURE_API_KEY=발급받은_가족문화시설_API_키
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=발급받은_카카오_JavaScript_키
```

환경변수를 추가하거나 수정한 뒤에는 Vercel에서 반드시 Redeploy를 실행해야 새 값이 반영됩니다. 카카오맵을 사용하려면 Kakao Developers의 Web 플랫폼에도 Vercel 배포 도메인을 추가해야 합니다.

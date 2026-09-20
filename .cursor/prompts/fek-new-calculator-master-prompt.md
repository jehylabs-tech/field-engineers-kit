# FEK 신규 계산기 마스터 프롬프트 (Pattern B · Zero-Rework 목표)

> **사용법**  
> 1) 아래 **「스펙 기입란」만** 채운다 (빈 칸으로 시작 금지).  
> 2) 이 파일 **전체**를 Cursor Agent에 붙여넣는다.  
> 3) Agent는 스펙 + 본 규칙을 따라 **한 계산기만** end-to-end 등록한다.  
> 4) 「완료 게이트」를 전부 통과하기 전에는 Done 선언 금지.

---

## 역할

너는 Field Engineers Kit (FEK) 저장소의 시니어 구현 에이전트다.  
목표는 **등록 직후 추가 UX/SEO/타입/수치 수정이 필요 없을 정도**로 신규 계산기를 완성하는 것이다.  
추측으로 ASME/표 수치·슬러그를 만들지 말고, **레포의 기존 엔진·JSON·유사 계산기**와 교차 검증한다.

---

## 스펙 기입란 (필수 — 비우면 작업 중단하고 질문)

```text
[FEK 신규 계산기 스펙]
이름:
카테고리: piping | mechanical | procurement | gaskets | …
CalculatorType (kebab, 코드 유니온용):
공개 슬러그 (URL):
규격/근거 (ASME/API/HI/ISA 등, 조항 단위까지):
핵심 수식 (LaTeX + 변수 정의):
입력 (필드명 · 단위 · 기본값 · 허용 범위):
출력 (hero · summary · rows 섹션 · export · 단위):
경고/한계 (callouts 톤 포함):
데이터 소스: (재사용할 JSON/loader 함수명, 없으면 “신규 표 필요” + 근거)
UX 레이아웃: formula | lookup-chart | custom-resultPanel
시각화: 없음 | BoltCircle | FlangeSchematic | 기타(파일명)
참조 계산기 (복제 템플릿, 필수 1개 이상):
  - UI: (예: flange-dimension / bolt-wrench-lookup / pump-tdh)
  - Engine/pSEO: (예: bolt-torque / multi-pump · SEO 풀 레이아웃 참고: pipe-wall-thickness / valve-cv-sizing)
기본 듀티 (defaults):
pSEO 예시 케이스 (metric/imperial 각 ≥2):
  - spec 경로:
    query:
    기대 hero/핵심값: (참고용 — 엔진 assert와 불일치 시 물리/표 수치를 채택하고 기대값을 고친다)
관련 계산기 슬러그 (related + carry):
SEO primary keyword / secondary keywords:
SEO materialLimitations 모드: metallurgy | applicability
  (metallurgy = 재질/등급 표 · applicability = 유체/체제/적용한계 — CS/SS 날조 금지)
```

---

## 절대 규칙 (위반 시 구현 중단)

### Pattern B / 라우팅
- URL: `/calculator/{slug}/{spec}` **단일 spec만**
- `[spec1]/[spec2]` 금지
- `sitemap.ts` 수동 수정 금지 → `listAllSpecRoutes` 자동
- SEO **canonical에 query 금지** (path only)
- 계산기 페이지 **`col-span-*` / `grid-cols-*` / CalculatorBaseLayout 그리드 비율 변경 금지**
- 한 프롬프트로 **전 계산기 일괄 리팩터 금지** (이 계산기만)

### 로컬/빌드
- 기본: `npm run dev` (Turbopack). `npm run preview` / `next build` / 포트 킬은 **사용자가 프로덕션 리빌딩을 명시한 경우만**
- 완료 전 최소 게이트: 해당 파일 `tsc` 관련 오류 없음 + 해당 계산기 vitest (전용 `tests/{slug}.test.ts` 또는 `tests/calculators.test.ts -t "<type-or-slug>"`)

### 공학/데이터 (물리 우선)
- 수식·표·예시는 **레포 데이터 또는 명시 규격과 100% 정합**
- 이미 `flangeDimension.json` / pipe schedule / boltTorque 등에 있으면 **재사용** (중복 테이블 금지)
- B16.5 vs B16.47, Sch 40 vs STD ID 등 **표기 혼동 금지** (예: 14" ID 13.250" = STD)
- ASME 심볼은 `.cursor/rules/calculator-global-standards.mdc` 준수 (`t` / `t_min` / `t_nom_req` / blind `t_m` 혼용 금지)
- 잘못된 공개 슬러그 추측 금지 → `CALCULATOR_TYPE_SLUG` / `localSeed` / 기존 페이지와 대조
- **스펙의「기대 hero/핵심값」이 엔진·표와 다르면 LLM/스펙 기대값을 버리고 물리·표 수치를 채택**한다. SEO `tableRows` / `workedExample` / tests는 **엔진 assert 결과**와 일치해야 한다.
- `tableFootnote`·FAQ·callout에 **내부 메모**(예: “Spec LLM…”, “superseded by…”)를 쓰지 말 것 — 현장 Technical English만.

### 브랜드/카피
- 타이틀 브랜드는 **`FieldEngineersKit`** (약칭 `FEK`만 단독 브랜드로 쓰지 말 것)
- 현장 엔지니니션용 **Technical English** (과장 마케팅 카피 금지)
- Screening vs code/OEM chart 구분 callout 유지

---

## 필수 등록 체크리스트 (전부 완료)

### Create
- [ ] `src/lib/calculators/engines/{type}.ts` — inputs, defaults, `calculate*()` → `CalculatorOutput`
- [ ] `src/lib/calculators/url-configs/{type}.ts` — `ParamConfig`
- [ ] `src/lib/calculators/pseo/{type}-routes.ts` **또는** 기존 `npsClassRoutes` 등 공유 헬퍼 (Pattern B)
- [ ] `src/components/calculator/calculators/{Name}Calculator.tsx`
- [ ] `src/app/{category}/{slug}/page.tsx` → `redirect("/calculator/{slug}")`

### Edit
- [ ] `src/lib/calculators/definitions.ts` — `CalculatorType` 유니온
- [ ] `src/components/calculator/CalculatorShell.tsx` — `CALCULATOR_VIEWS` dynamic import
- [ ] `src/lib/calculators/spec-routes.ts`
  - `listSpecRoutesForSlug` case
  - `parseSpecToQuery` (필요 시)
  - `findSpecRouteForInputs` (facing 등 path-owned 키 정확 매칭)
  - `buildSpecSeoCopy` 분기 (title/description/h1/h2)
- [ ] `src/lib/calculators/url-sync-path-owned.ts` — `PATH_OWNED_PARAMS`에 path 키 추가
- [ ] `src/lib/plant-context/tags.ts` — `CALCULATOR_TYPE_SLUG` + `CALCULATOR_PLANT_TAGS`
- [ ] `src/lib/plant-context/bindings.ts` — `applyPlantContext` case (NPS/class/schedule carry)
- [ ] `data/calculators/localSeed.json` — published row (`formula_json.type` = CalculatorType)
- [ ] `data/calculatorSeoData.ts` — **완전** `CalculatorSeoEntry` (아래 스키마 · **풀 레이아웃 필수**)
- [ ] `src/lib/home/ui.ts` — `CATALOG_SEO_BLURBS[slug]`
- [ ] `src/lib/home/workstation.ts` — 카드 + **listed SpecRoute** href
- [ ] `src/lib/unitConverter.ts` — **새 필드명**이 있을 때만 companion sync
- [ ] `tests/{slug}.test.ts` 또는 `tests/calculators.test.ts` — engine 수치 + Pattern B resolve/findSpec 테스트

### Do not touch unless required
- `sitemap.ts` 수동 목록
- 타 계산기 grid/layout
- 공유 셸 대규모 리팩터

---

## CalculatorSeoEntry 필수 스키마 (누락 = 실패)

`data/calculatorSeoData.ts` 키 = **공개 슬러그**.

### 필수 필드 (전부 채울 것 — optional 아님)

- `slug`, `formulaTitle`, `formulaHtml`, `formulaLatex`, `formulaNotes`
- `formulaBadges` (권장)
- `variables[]`, `standards[]`
- `tableCaption`, `tableHeaders`, `tableRows`, `tableFootnote` (권장)
- **`allowancesAndTolerances` 필수** — `{ title?, summary, items[{ label, value?, description }] }`  
  이 계산기가 실제로 적용하는 screening 규칙 / 기본 듀티 / out-of-scope
- **`materialLimitations` 필수** — `{ title?, summary, items[{ materialGroup, temperatureLimit?, stressLimit?, notes }], codeRestrictions? }`
- **`workedExample` 필수** — `{ title, scenario, designConditions, steps, conclusion }` · 수치는 **엔진과 일치**
- **`...howTo("How to …", [{ name, text }, …])` 필수** (`howToName` + `howToSteps`)
- **`faq[]` 최소 3개** (`question` / `answer`, 필요 시 `**bold**`)

### 풀 레이아웃 게이트 (코드 동작 — 반드시 이해)

`CalculatorSeoContent`는  
`allowancesAndTolerances` **AND** `materialLimitations` **AND** `workedExample`  
가 **모두** 있을 때만 **풀 가이드**(§1 Formula → §2 Allowances+표 → §3 Material/Applicability → §4 Worked Example → §5 HowTo → §6 FAQ)를 렌더한다.  
하나라도 빠지면 **슬림 4섹션**으로 떨어지고, `workedExample`이 데이터에만 있고 **화면에 안 나온다**.  
→ **세 필드를 빼는 것은 zero-rework 실패**다.

### `materialLimitations` 해석 (야금이 없어도 필수)

- **metallurgy 모드** (두께·플랜지·합금·스팬 등): 실제 재질/등급/S 한도.
- **applicability 모드** (PSV·NC·slope·물성·노이즈 등):  
  `title`을 `"Applicability & …"` / `"Fluid & Service Limits"` / `"Regime & Trim Limits"` 등으로 두고  
  `materialGroup`에 **유체·체제·적용범위·fitting 유형**을 넣는다.  
  **없는 재질표(CS/SS)를 날조하지 말 것.**
- `title`을 채우면 화면 H2에 반영된다 (고정 “Material & Code Limitations”만 쓰지 말 것).

### 기타 SEO 규칙

- lookup 도구면 SEO 표 = **사이즈/클래스 스캔 차트** (예시 5행만으로 끝내지 말 것)
- imperial 프리셋이 있으면 `applyPreset` 타입을  
  `(typeof METRIC_PRESETS)[number] | (typeof IMPERIAL_PRESETS)[number]` 로 잡고  
  `flowUnit: "gpm" | "m3h"` 유니온을 깨지 말 것 (Vercel `tsc` 실패 방지)
- SEO 참조 템플릿: **풀 OK** 계산기 (`pipe-wall-thickness`, `valve-cv-sizing`)를 Read.  
  최근 lean 엔진이어도 SEO는 풀 스키마를 채운다.

---

## UX / 디자인 (FEK 기존 패턴)

### 레이아웃
- 기본: `CalculatorBaseLayout` + `layout="formula"`  
- lookup/차트형: `wideResult` + `resultDashboard` + 필요 시 `afterHero={chart}`  
  (히어로 → **차트** → 상세 표. 차트는 결과 맨 아래에 두지 말 것)
- 입력 카드: **중복 장문 안내·hero와 같은 미리보기 박스 금지** (컨트롤만)
- 내부 그리드/`col-span` 변경 금지. `afterHero` / `chart` / `footerPanel` / `resultPanel` 슬롯만 사용

### Lean results (결과 패널)
- Hero = 현장 1초 값 1개 (필요 시 양 단위)
- `heroBadges` / summary = 보조 칩만 (hero 문장 복붙 금지)
- `rows` = 핵심 소수 (보통 ≤4) · 섹션 라벨 유지
- `callouts` = 보통 **1개** screening/warn (장문 중복 금지)
- Export rows는 상세 가능 · 화면 rows와 혼동하지 말 것

### Hero / callouts
- 현장 1초 조회 값 = hero (예: `1-1/4 in · 32 mm`, `API 526 “H” · 506 mm²`)
- Screening / OEM / certified 한계는 callout `tone: "info" | "warn"`

### 단위
- `unitSystem` + navbar `UnitSwitcher`와 충돌 없이
- 길이/압력/온도 포맷은 기존 `formatLength` / unit helpers 사용
- 프리셋 적용 시 imperial이면 `unitSystem: "imperial"`도 같이 세팅
- 새 입력 필드명은 `syncCompanionUnits`에 **필요할 때만** 추가

### 시각화 SEO (있을 때만)
- 래퍼/`<svg>`: `role="img"`
- `aria-label="{Spec or duty} {Diagram|Sequence|Chart} per {Standard}"`
- 의미 있는 `<title>` (롱테일: pattern / sequence / chart / bolt numbering 등)
- 다이어그램 없는 계산기는 **억지 SVG 금지**

### 참조 UI
스펙의 「참조 계산기」를 **먼저 Read**한 뒤 동일한 FieldGroup / chips / Export / ResultPane 패턴을 복제한다.

---

## Programmatic SEO (Pattern B)

### Spec 경로
- `{nps}inch-{class}lb-{facing}` / `{n}p-…` 등 **기존 패밀리 컨벤션**을 따를 것
- `list*PseoRoutes`에 넣은 spec만 SSG (`dynamicParams = false`)
- `findSpecRouteForInputs`: facing 등 path-owned 키가 다르면 **다른 face 경로로 폴백하지 말 것**

### Metadata (`buildSpecSeoCopy` + generateMetadata)
- `title`: `{ShortTitle} — {Focus} | FieldEngineersKit` 또는 기존 헬퍼 포맷과 일치  
  (예: `Flange Bolt Tightening Sequence — 12-Bolt Star Pattern | FieldEngineersKit`)
- `description`: **150–160자** 영문, 규격명 + 유저 의도
- `h1` / `h2`: `buildSpecSeoCopy`가 생성하는 값과 Spec 패널이 맞물르게
- Open Graph는 페이지 템플릿이 처리 — canonical path only

### On-page (기존 컴포넌트에 맞출 것 — 유령 H2 신설 금지)
현재 파이프라인:
1. `SpecProgrammaticPanel` — spec `h2` + 시드 요약  
2. `CalculatorSeoContent` — **풀** formula / allowances+표 / material·applicability / workedExample / how-to / FAQ / JSON-LD  

Agent 할 일:
- Spec별 카피는 **`buildSpecSeoCopy` 분기**로 넣는다
- 하단 long-tail은 **`calculatorSeoData`의 allowances + material + workedExample + faq + tableRows`**로 흡수한다
- “## {Spec} Specification & Reference Guidelines”를 **마크다운으로 페이지에 하드코딩하지 말고**,  
  동일 정보를 SEO entry / Spec 패널 카피로 충족한다  
  (정말 Spec-only 블록이 필요하면 `SpecProgrammaticPanel` 확장안을 **별도 승인 후** 최소 변경)

### JSON-LD
- `CalculatorSeoContent`가 FAQPage / HowTo / TechArticle 생성 → `faq`·`howToSteps` 비우지 말 것

---

## 구현 순서 (이 순서만)

1. Engine + 단위 헬퍼 + **표 교차검증** (worked example / default duty를 코드로 assert)  
2. url-config + pseo routes  
3. UI (참조 계산기 복제 · lean results) + url sync  
4. definitions → Shell → tags → bindings → `url-sync-path-owned` → spec-routes  
5. localSeed + **calculatorSeoData 풀 스키마**(allowances·material·workedExample·howTo·faq) + home + redirect  
6. tests  
7. 완료 게이트 실행 후 짧은 요약 보고

---

## 완료 게이트 (전부 체크 후 Done)

- [ ] 공개 URL `/calculator/{slug}` 및 대표 `/calculator/{slug}/{spec}` 가 listed SpecRoute
- [ ] localSeed `type` ↔ definitions ↔ Shell 키 일치
- [ ] SEO entry에 **`allowancesAndTolerances` + `materialLimitations` + `workedExample` 모두 존재** (풀 레이아웃)
- [ ] SEO entry에 `howToSteps` + `faq` ≥ 3
- [ ] `workedExample` / `tableRows` 핵심 수치가 **엔진 assert와 일치** (스펙 기대값과 충돌 시 물리 채택)
- [ ] `materialLimitations`가 도메인에 맞음 (야금 없으면 applicability · CS/SS 날조 없음)
- [ ] imperial/metric 프리셋 있으면 applyPreset 유니온 타입 OK (`tsc` 통과)
- [ ] 해당 계산기 vitest describe 통과
- [ ] hero/차트/입력이 중복 카피로 지저분하지 않음 (lean results)
- [ ] 관련 계산기 related 링크 슬러그가 **실제 공개 슬러그**
- [ ] 그리드/`col-span` 미변경
- [ ] canonical/query/sitemap 규칙 준수

보고 형식 (짧게):
1. 슬러그 · type · 대표 spec URL  
2. 건드린 파일 목록  
3. 테스트 결과 · 채택한 hero 핵심값 (물리)  
4. 남은 위험/의도적 범위 밖 (B16.47 미표 등)

---

## Agent 금지 사항

- 스펙 공란을 추측으로 채우기
- 존재하지 않는 calculator URL 슬러그 발명
- 전체 계산기 리팩터 / 공유 grid 변경
- 사용자 요청 없는 production `next build` / preview 루프
- “대략 맞음” 수치로 SEO 표·worked example 작성
- **`allowances` / `material` / `workedExample` 중 하나라도 생략** (슬림 SEO 레이아웃 유발)
- 야금이 없는 도구에 **가짜 재질표** 작성
- 스펙 LLM 기대값을 엔진과 다르게 SEO/테스트에 고정

---

## (선택) 한 줄 실행 헤더

스펙을 채운 뒤 Agent 첫 줄에 붙인다:

```text
FEK Pattern B 신규 계산기 — `.cursor/prompts/fek-new-calculator-master-prompt.md` 준수, 스펙 기입란 기준 zero-rework 등록. 그리드 변경·sitemap 수동·canonical query 금지. SEO는 allowances+material+workedExample 풀 레이아웃 필수(야금 없으면 applicability). 기대값과 물리 불일치 시 엔진 assert 채택.
```

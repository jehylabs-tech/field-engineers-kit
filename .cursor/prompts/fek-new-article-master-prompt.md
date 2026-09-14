# FEK 신규 아티클 마스터 프롬프트 (Docs/Blog MDX · Zero-Rework 목표)

> **사용법**  
> 1) 아래 **「스펙 기입란」만** 채운다 (빈 칸으로 시작 금지).  
> 2) 이 파일 **전체**를 Cursor Agent에 붙여넣는다.  
> 3) Agent는 **하나의** `content/blog/{slug}.mdx`만 작성·저장한다.  
> 4) 「완료 게이트」통과 전 Done 선언 금지.  
> 5) 계산기 코드 변경이 필요하면 **별도 승인** 없이 하지 말고, 글에서 screening 한계로 명시하거나 질문한다.

**페어 문서:** 신규 계산기는 `.cursor/prompts/fek-new-calculator-master-prompt.md` 사용.

---

## 역할

너는 Field Engineers Kit (FEK)의 기술 문서 에이전트다.  
목표는 `/docs/{slug}`에 게시될 MDX 아티클을 **기존 우수 글 구조·계산기 수치·SEO**에 맞춰, 게시 후 링크/수치/섹션 수정이 거의 없도록 작성하는 것이다.

추측으로 ASME 표·카탈로그·계산기 URL을 만들지 마라.  
반드시 `localSeed` / `CALCULATOR_TYPE_SLUG` / 엔진·JSON / 기존 `content/blog/*.mdx`를 Read·대조한다.

---

## 스펙 기입란 (필수 — 비우면 작업 중단하고 질문)

```text
[FEK 신규 아티클 스펙]
제목 (영문, 주 키워드 포함):
파일 슬러그 제안: (kebab-case, content/blog/{slug}.mdx — 없으면 제목에서 도출)
날짜: YYYY-MM-DD
카테고리: Piping Engineering | ASME Standards | Cryogenic | Equipment
태그 (3–6개):
관련 계산기 공개 슬러그: (CALCULATOR_TYPE_SLUG / localSeed 실존 값)
관련 계산기 URL: /calculator/{slug}  (또는 대표 /calculator/{slug}/{spec})
관련 계산기 이름: (UI/localSeed title과 일치)
주 키워드:
연관 롱테일 (H2/H3·FAQ용, 3개 이상):
정합 소스 (필수):
  - 엔진 파일:
  - 카탈로그/JSON (있으면):
  - 참조 계산기 worked example / defaults:
필수 교차검증 수치 (표에 넣을 값 — 엔진으로 재현 가능해야 함):
Worked example 시나리오 (입력 → 기대 결과):
내부 교차 링크 계산기 (1–2개 추가 권장):
톤 메모 / 면책 (OEM 브랜드, screening vs code):
중복 주의: (유사 기존 글 slug가 있으면 통합·갱신 vs 신규 여부 명시)
```

---

## 절대 규칙

### 파일 / 라우팅
- 경로: `content/blog/{slug}.mdx` **한 파일**
- 공개 URL: `/docs/{slug}` (MDX 자동 수집 — `sitemap.ts` 수동 등록 금지)
- 파일명 = slug = URL 세그먼트 (이미 있으면 덮어쓰기 전 사용자 확인)
- 동일 주제 초안이 두 파일로 갈라지지 않게 (SEO 카니발라이제이션 금지)

### Frontmatter (기존과 100% 동일 스키마)
```yaml
---
title: "…"
description: "…"          # 150–160자 영문, 주 키워드 + 규격 의도
date: "YYYY-MM-DD"
category: "Piping Engineering"   # BLOG_CATEGORIES만 허용
tags:
  - Tag One
  - Tag Two
relatedCalculatorUrl: "/calculator/…"
relatedCalculatorName: "…"
---
```
- `category`는 **정확히** 다음 중 하나:  
  `Piping Engineering` | `ASME Standards` | `Cryogenic` | `Equipment`  
  (오타 시 파서가 기본값으로 떨어짐 → 실패로 간주)
- `relatedCalculatorUrl`은 **실제 공개 경로**만. `/calculators/…` **금지**.  
  `tags.ts` / `localSeed.json` / 기존 글과 대조. 추측 slug 금지  
  (예: Link-Seal = `/calculator/link-seal-penetration-sleeve` ≠ `…-sleeve-sizing`)

### 수치 / 공학
- 수식·표·worked example·FAQ 숫자는 **지정 엔진/JSON과 100% 정합** (환각 금지)
- Sch 40 vs STD, B16.5 vs B16.47, RF vs RTJ stud length, heavy hex vs standard hex 등 **FEK가 이미 구분한 규칙**을 따를 것
- 계산기 공식과 다른 “인터넷 통설” 수식이면: FEK 식을 본문으로 쓰고, 통설은 왜 틀리는지 짧게 설명
- 브랜드 도구(Link-Seal® 등): screening 고지 + **not affiliated** 문구 (기존 Link-Seal 글 톤)

### 링크
- 내부 계산기: `[Name](/calculator/{slug})` 또는 listed spec 경로
- 상대 `/docs/…` 교차 링크는 기존 글이 있을 때만
- 외부 OEM 차트는 “confirm current chart” 수준 — 저작권 표 전문 복제 금지

### 컴포넌트
- MDX에서 `<Callout title="…" variant="info|warning|tip">…</Callout>` 사용 가능 (기존 글과 동일)
- 임의 React 컴포넌트/이미지 파이프라인 신설 금지
- `#` H1 본문 사용 금지 — 페이지 H1은 레이아웃/`title`이 담당. 본문은 `##` / `###`만

### 로컬
- 글만 작성할 때 production build 금지. 필요 시 파일 저장만으로 충분

---

## 본문 필수 구조 (순서 고정)

기존 우수 글(`asme-pcc-1-…`, `pipe-penetration-sleeve-link-seal-…`) + Article SEO 규칙을 병합한 **고정 골격**:

1. **(선택, ≤2문장) Hook** — 현장 문제 한 줄. 길면 TL;DR을 가리므로 짧게.
2. **`## Quick Summary (TL;DR)` — 본문 상단 필수**  
   - **추천 스니펫용:** 바로 아래에 **핵심 결론 / 대표 수식 / 핵심 규격**을 **3줄 bullet**로 먼저 배치  
   - 이어서 FEK 표준 **TL;DR 표** (`| Item | Field takeaway |`)로 규칙·패스·한계 요약 (5–8행)  
   - 표만 있고 3줄 bullet이 없으면 SEO 규칙 미달
3. **Intro & Field Context** (`##` — 주 키워드 자연 포함)  
   - 왜 중요한지, 실패 모드, 계산기 deep-link 1회  
   - `<Callout variant="info">` screening vs code/OEM
4. **Core formulas & parameter definitions** (`##` / `###`)  
   - LaTeX `$$ … $$`  
   - Parameter definitions 표  
   - 필요 시 재료/모델/패스 표 (엔진 카탈로그와 동일 숫자)
5. **Worked example** (`##` — 롱테일 질문형 H2 권장)  
   - 입력 표 → Step 1…n → Field callout  
   - **모든 중간 숫자를 엔진/표로 재현 가능해야 함**  
   - 계산기 CTA: 입력 힌트 (`od=…`, spec path 등) 포함
6. **Interactive tool CTA** (`##`)  
   - `<Callout variant="tip">` + 관련 계산기 링크 + 보조 계산기 1개
7. **FAQ** (`## Frequently Asked Questions (FAQ)`)  
   - **최소 3개** `### Qn. …` (롱테일 질문 = H3)  
   - ASME/ISO/API 또는 FEK 엔진 근거  
   - 최소 1개는 “왜 인터넷/통설 값과 다른가” 또는 범위 한계

섹션 번호는 `## 1. …` 형태여도 되고, 키워드형 H2여도 된다.  
**금지:** 필수 섹션 생략, TL;DR을 맨 아래로 내리기, `/calculators/` 링크.

---

## Article SEO 강제 규칙

### 1) TL;DR 상단 (featured-snippet)
- `## Quick Summary (TL;DR)`를 Intro보다 **위**에 둔다 (hook 1–2문장만 예외적으로 TL;DR 위 허용)
- 3줄 bullet 예시 형식:
  - `- **Takeaway:** …`
  - `- **Governing relation:** $…$`
  - `- **Code / basis:** ASME …`

### 2) H2/H3 키워드
- 주 키워드를 title + 최소 1개 H2에 자연스럽게 포함
- FAQ H3 = 검색 질문형 (“How much…”, “Can Link-Seal…”, “Why does…”)
- 키워드 스터핑·부자연스러운 제목 금지
- TOC는 `##`/`###`에서 자동 추출 → 제목을 의미 있게

### 3) description / title
- `title`: 주 키워드 + 규격/유스케이스 (기존 글처럼 colon 서브타이틀 가능)
- `description`: **150–160자**, 규격명 + 의도 + 결과물(sequence, clearance, wrench 등)
- 브랜드: 본문에서 FieldEngineersKit / 계산기 이름 자연스럽게 (과한 반복 금지)

### 4) 내부 링크 SEO
- 본문 초반 1회 + CTA 섹션 1회 + FAQ/예 contxt 1회 정도로 관련 계산기 링크
- listed **spec URL**이 있으면 worked example에 사용 (Pattern B 랜딩과 정렬)

---

## 작성 전 조사 (필수)

1. `content/blog/`에서 유사 제목/주제 검색 → 중복이면 신규 대신 **기존 글 갱신** 제안  
2. `data/calculators/localSeed.json` + `src/lib/plant-context/tags.ts`로 **관련 계산기 URL 확정**  
3. 엔진/JSON에서 worked example 수치 재계산 또는 표 row Read  
4. 참조 글 1편 Read (구조·Callout·표 톤 복제)  
   - 볼팅: `asme-pcc-1-flange-bolt-tightening-sequence-torque-guide.mdx`  
   - 슬리브/실: `pipe-penetration-sleeve-link-seal-sizing-guide.mdx`

---

## 구현 순서

1. 스펙 검증 (URL·카테고리·수치 소스)  
2. frontmatter 작성  
3. TL;DR (3 bullets + 표) → Intro + Callout → 수식/표 → Worked example → CTA → FAQ  
4. 링크 `/calculator/` only 전수 검색  
5. 완료 게이트 → 짧은 보고

---

## 완료 게이트

- [ ] `content/blog/{slug}.mdx` 존재, frontmatter 파싱 가능
- [ ] `category` ∈ BLOG_CATEGORIES
- [ ] `relatedCalculatorUrl`이 레포에 실존 (`/calculator/…` only)
- [ ] TL;DR이 상단 + **3줄 bullet** + 요약 표
- [ ] Intro / 수식·표 / Worked example / CTA / FAQ(≥3) 모두 존재
- [ ] Worked example 수치가 엔진/JSON과 일치 (최소 1개 핵심 결과 재현)
- [ ] 본문에 `#` H1 없음; `/calculators/` 문자열 없음
- [ ] Callout으로 screening 한계 명시
- [ ] 유사 글과 제목/의도 중복 없음 (또는 기존 글 업데이트로 처리)

보고 형식:
1. `/docs/{slug}` · 관련 `/calculator/…`  
2. 정합에 사용한 엔진/JSON  
3. Worked example 핵심 결과 한 줄  
4. 의도적 범위 밖 (미표 규격 등)

---

## Agent 금지 사항

- 존재하지 않는 calculator slug 발명
- 엔진과 다른 카탈로그 숫자를 “관례”로 우기기
- sitemap 수동 수정, 계산기 코드 무단 변경
- 동일 주제 두 번째 MDX로 SEO 중복 생성
- 한국어 본문 (톤은 **Technical English**)
- 프로덕션 빌드로 “확인” 루프

---

## (선택) 한 줄 실행 헤더

```text
FEK 신규 아티클 — `.cursor/prompts/fek-new-article-master-prompt.md` 준수. 스펙 기입란 기준 MDX 1편 zero-rework 작성. /calculators/ 금지, 엔진·JSON 수치 100% 정합, TL;DR 상단.
```

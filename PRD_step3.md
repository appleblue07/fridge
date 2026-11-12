# [PRD 3단계] 사용자 프로필 관리 및 개인화 레시피 보관함 (User Profile & Recipe Storage)

---

## 1. 개요 (Overview)
- **문서 버전:** v1.0.0
- **작성일:** 2026-11-12
- **프로젝트 명:** AI 냉장고 파먹기 & 레시피 추천 반응형 웹앱 (가칭: *FridgeChef AI*)
- **단계 목표:** 사용자가 자신만의 프로필과 식습관/알레르기 취향을 설정하고, 1~2단계에서 생성된 맞춤형 레시피를 보관함에 저장·분류·관리할 수 있는 개인화 시스템을 구축한다.

---

## 2. 배경 및 목적 (Background & Objectives)
- **배경:**
  1. 1~2단계를 통해 생성된 유용한 레시피가 세션 종료 후 휘발되면 사용자가 다음에 다시 요리하고 싶을 때 찾을 수 없음.
  2. 가구원 수, 알레르기 유발 물질, 매운맛 기호 등 개인별 특성이 매번 반영되지 않으면 생성된 레시피를 매번 수정해야 하는 불편함이 발생.
- **목적:**
  1. 사용자 프로필(가구원 수, 기피/알레르기 재료, 매운맛 선호도 등)을 등록하여 2단계 레시피 생성 시 자동 반영되는 '초개인화' 경험 제공.
  2. 마음에 든 레시피를 영구 저장하고 나만의 팁, 평점, 폴더를 구성할 수 있는 '나만의 레시피북' 기능 구현.

---

## 3. 핵심 목표 및 범위 (Goals & Non-Goals)

### 3.1 포함 범위 (Goals)
1. **사용자 인증 및 프로필 생성 (Auth & Profile):**
   - 간편 소셜 로그인 (Google, Kakao 등) 및 게스트 모드(Local Storage) 지원.
   - 프로필 설정: 닉네임, 프로필 캐릭터/아바타, 가구 형태(1인 가구, 2인, 4인 이상 등).
2. **개인화 맞춤 식단 설정 (Dietary Preferences):**
   - 알레르기 유발 식재료 체크 (갑각류, 견과류, 유제품, 메밀, 대두, 복숭아 등).
   - 식단 성향 (일반식, 비건, 락토-오보, 저탄고지/키토, 헬스/고단백).
   - 매운맛 수용도 (1단계 순한맛 ~ 5단계 극강의 매운맛).
   - *이 설정값은 2단계의 Gemma 모델 프롬프트에 자동으로 주입되어 필터링됨.*
3. **레시피 저장 및 북마크 (Save & Bookmark):**
   - 2단계 상세 화면 및 카드에서 원클릭 북마크 (★ 토글).
   - 비로그인 상태에서 저장 시 로컬 스토리지에 임시 저장 후, 회원가입/로그인 시 계정으로 자동 동기화(Migration).
4. **내 레시피 보관함 (My Cookbook Dashboard):**
   - 저장된 레시피 목록 뷰 (최신순, 조리시간순, 평점순 정렬).
   - 커스텀 태그 및 폴더링 기능 (예: "초스피드 야식", "주말 요리", "다이어트 식단").
   - 키워드 검색 (재료명, 요리명).
5. **요리 기록 및 나만의 메모 (Cooking Log & Notes):**
   - '실제 요리해봄' 체크 및 별점(1~5점) 평가.
   - 개인 메모 작성 (예: "다음엔 설탕을 반 큰술 덜 넣기", "청양고추 1개 추가하니 더 맛있음").
6. **레시피 공유 기능:**
   - 웹 공유 API(Web Share API) 또는 링크 복사를 통한 레시피 외부 공유.

### 3.2 제외 범위 (Non-Goals)
- 사용자 간 커뮤니티 SNS 피드 및 댓글 소통 기능 (추후 v2.0 로드맵으로 이관).
- 전자상거래/장바구니 식재료 바로 구매 결제 연동.

---

## 4. 유저 스토리 (User Stories)
1. **사용자 A (알레르기가 있는 사용자):** "갑각류 알레르기가 있는데 프로필에 한 번 설정해두면 냉장고에 새우가 있어도 나를 위한 대체 조리법이나 안전한 레시피만 골라줬으면 좋겠다."
2. **사용자 B (자취생):** "지난번에 냉장고 재료로 추천받아 만든 파기름 볶음밥이 너무 맛있었는데, 보관함에 저장해두고 내 입맛에 맞춘 양념 비율을 메모해두고 싶다."
3. **사용자 C (간편한 사용을 원하는 유저):** "처음에는 로그인 없이 편하게 써보다가, 마음에 드는 레시피를 계속 모아보고 싶을 때 구글 계정으로 3초 만에 가입하고 싶다."

---

## 5. 상세 기능 요구사항 (Functional Requirements)

### 5.1 인증 및 온보딩 플로우 (Authentication & Onboarding)
- **온보딩 모달/화면:**
  - 첫 가입 시 3스텝 퀵 설문:
    1. 선호 닉네임 및 가구원 수 (1인/2인/다인)
    2. 알레르기 및 기피 재료 선택 (다중 선택 칩)
    3. 선호 식단 및 매운맛 취향 슬라이더
- **게스트(비로그인) 지원 정책:**
  - 로그인 없이도 1단계(인식), 2단계(생성), 로컬 북마크(최대 5개) 이용 가능.
  - 6개 이상 저장 시도 또는 기기 간 동기화 필요 시 소셜 로그인 모달 팝업.

### 5.2 사용자 프로필 및 취향 관리 설정 페이지
- **프로필 정보 수정:**
  - 닉네임, 프로필 이미지 변경.
- **취향 설정 패널:**
  - [알레르기 재료]: 칩 토글 + 직접 텍스트 입력 추가.
  - [매운맛 단계]: 1단(안 매움) ~ 5단(매우 매움).
  - [기본 조미료 보유 여부 체크]: 간장, 고추장, 된장, 설탕, 소금, 식용유, 마늘 등.
- **2단계 프롬프트 자동 연동:**
  - 2단계 호출 시 유저 프로필이 있을 경우:
    `"사용자 제약 조건: {allergies: ['갑각류'], spicy_level: 1, servings: '1인분'}을 반드시 준수하여 레시피를 생성할 것"` 문구가 프롬프트에 자동 주입됨.

### 5.3 내 레시피 보관함 (My Cookbook UI)
- **헤더 & 필터 바:**
  - 검색창 (요리명, 재료명 실시간 인라인 필터).
  - 카테고리 탭 (전체 / 내가 한 요리 / 즐겨찾기 / 폴더별).
  - 정렬 옵션 (최근 저장순, 조리시간 짧은순, 높은 평점순).
- **레시피 카드 컴포넌트:**
  - 2단계의 레시피 카드에 [저장 날짜], [내 평점 ⭐], [작성한 메모 배지] 추가.
  - 저장 취소(휴지통/별 해제) 버튼.
- **상세 메모 & 후기 작성 팝업:**
  - 별점 매기기 (1~5점).
  - 한 줄 메모 입력창 ("나만의 조리 팁").
  - "요리 완료" 체크박스 (완료 시 배지 획득 및 통계 반영).

---

## 6. 데이터베이스 설계 및 기술 아키텍처

### 6.1 추천 기술 스택 (Tech Stack Options)
- **Frontend:** Next.js (App Router), Tailwind CSS, Lucide Icons, Zustand
- **Backend / BaaS:** Supabase (PostgreSQL + Auth + Storage) 또는 Firebase
- **ORM / Client:** Supabase-js Client with Row Level Security (RLS)

### 6.2 데이터 모델 (Entity Relationship Model)

#### Tables Schema (PostgreSQL 기준)
```sql
-- 1. 사용자 프로필 테이블
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(50) NOT NULL,
  household_size INT DEFAULT 1,
  allergies TEXT[] DEFAULT '{}',
  dietary_preference VARCHAR(30) DEFAULT '일반',
  spicy_level INT DEFAULT 2, -- 1~5
  pantry_staples TEXT[] DEFAULT '{"소금", "설탕", "식용유", "간장"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 저장된 레시피 테이블
CREATE TABLE public.saved_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(150) NOT NULL,
  summary TEXT,
  cooking_time_minutes INT,
  difficulty VARCHAR(20),
  cuisine_type VARCHAR(30),
  servings VARCHAR(20),
  used_ingredients JSONB NOT NULL, -- 사용된 재료 목록
  steps JSONB NOT NULL,            -- 단계별 조리법 JSON
  chef_tip TEXT,
  folder_name VARCHAR(50) DEFAULT '기본 보관함',
  is_cooked BOOLEAN DEFAULT FALSE, -- 실제 조리 여부
  rating INT CHECK (rating >= 1 AND rating <= 5),
  user_note TEXT,                  -- 사용자 개인 메모
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정: 본인 데이터만 읽기/쓰기 가능
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" 
ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own saved recipes" 
ON public.saved_recipes FOR ALL USING (auth.uid() = user_id);
```

#### TypeScript 타입 정의
```typescript
export interface UserProfile {
  id: string;
  nickname: string;
  householdSize: number; // 1, 2, 4 등
  allergies: string[]; // ['새우', '땅콩']
  dietaryPreference: '일반' | '비건' | '락토오보' | '키토' | '고단백';
  spicyLevel: number; // 1~5
  pantryStaples: string[];
}

export interface SavedRecipeItem {
  id: string;
  userId: string;
  recipeData: Recipe; // 2단계에서 정의한 Recipe 모델
  folderName: string;
  isCooked: boolean;
  rating?: number; // 1~5
  userNote?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. 예외 처리 및 비기능 요구사항 (Non-Functional Requirements)

1. **데이터 마이그레이션 (Guest to User Migration):**
   - 비로그인 상태에서 로컬스토리지에 저장된 레시피 목록(`fridge_guest_recipes`)이 존재할 경우, 로그인 직후 사용자 동의를 얻어 클라우드 DB로 자동 일괄 동기화(Batch Upsert) 후 로컬 캐시 정리.
2. **반응형 대시보드 인터페이스:**
   - 모바일: 하단 고정 내비게이션 바 [냉장고 스캔 (1단계)] / [추천 레시피 (2단계)] / [보관함 (3단계)] / [프로필].
   - 데스크톱: 좌측 사이드바 형태의 모던 웹 대시보드 레이아웃.
3. **보안 및 프라이버시 (Security):**
   - Supabase/Firebase의 RLS(Row Level Security) 정책을 엄격히 적용하여 다른 사용자의 저장 레시피 및 개인 메모 접근 원천 차단.

---

## 8. 인수 조건 (Acceptance Criteria)

- [ ] **AC 1:** 프로필 설정에서 알레르기 항목(예: '땅콩')과 맵기 레벨(1단계)을 저장한 후, 2단계에서 레시피를 생성하면 해당 조건이 반영된 레시피만 추천된다.
- [ ] **AC 2:** 2단계 레시피 상세 화면에서 '저장(북마크)' 버튼을 누르면 해당 레시피가 '내 레시피 보관함'에 즉시 추가된다.
- [ ] **AC 3:** 비로그인 상태에서 레시피를 저장한 후 로그인하면, 비로그인 시 저장했던 레시피들이 내 계정 보관함으로 자동 연동된다.
- [ ] **AC 4:** 보관함에서 요리명 또는 재료명으로 검색했을 때 실시간으로 일치하는 레시피 카드만 필터링되어 노출된다.
- [ ] **AC 5:** 저장된 레시피에 별점(1~5점)과 개인 조리 메모를 작성하고 저장하면, 새로고침 후에도 유지된다.
- [ ] **AC 6:** 모바일 환경에서 하단 탭바를 통해 1단계(스캔), 2단계(레시피), 3단계(보관함) 간의 이동이 매끄럽게 동작한다.

---

## 9. 전체 서비스 통합 유저 저니 (End-to-End User Journey)

```
[1단계: 냉장고 촬영/업로드]
      │ (카메라 촬영 / 브라우저 이미지 압축)
      ▼
[OpenRouter Gemma 비전 모델] ───> 식재료 자동 인식 목록 (오인식 수정 & 직접 추가)
                                              │
                                              ▼
                                 [사용자 프로필 취향 자동 병합]
                                 (알레르기, 가구원수, 맵기 선호도)
                                              │
                                              ▼
                                 [2단계: Gemma 모델 레시피 생성]
                                 (시간/도구/종류 맞춤 2~3종 레시피)
                                              │
                                              ▼
                                 [레시피 상세 확인 및 타이머 요리]
                                              │
                                              ▼ (★ 원클릭 저장)
                                 [3단계: 내 레시피 보관함]
                                 (폴더 분류, 별점, 나만의 팁 메모)
```

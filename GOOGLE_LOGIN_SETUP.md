# 구글 로그인 설정 가이드

## 1. 환경 변수 설정

`.env` 또는 `.env.local` 파일에 다음 값을 입력하세요:

```env
PUBLIC_SUPABASE_URL=https://urkkpcqijrcadmcrlthe.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVya2twY3FpanJjYWRtY3JsdGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNzI2MTQsImV4cCI6MjA1OTk0ODYxNH0.94wZkO268KF2FHe3EBXbQFPRfZKayOJvxHzjNBb7CsY
```

## 2. Supabase에서 Google OAuth 설정

### 2-1. Google Cloud Console에서 OAuth 클라이언트 ID 만들기

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 프로젝트 생성 또는 선택
3. 좌측 메뉴에서 **"API 및 서비스" > "사용자 인증 정보"** 선택
4. **"사용자 인증 정보 만들기" > "OAuth 클라이언트 ID"** 클릭
5. 애플리케이션 유형: **"웹 애플리케이션"** 선택
6. 이름 입력 (예: BullGaze Web)
7. **승인된 자바스크립트 원본** 추가:
   - `http://localhost:5173` (개발용)
   - `https://urkkpcqijrcadmcrlthe.supabase.co` (Supabase)
   - 배포 URL (예: `https://yourdomain.com`)

8. **승인된 리디렉션 URI** 추가:
   - `https://urkkpcqijrcadmcrlthe.supabase.co/auth/v1/callback`

9. **만들기** 클릭
10. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사 (나중에 사용)

### 2-2. Supabase에서 Google Provider 활성화

1. [Supabase Dashboard](https://supabase.com/dashboard/project/urkkpcqijrcadmcrlthe)에 접속
2. 좌측 메뉴에서 **"Authentication" > "Providers"** 선택
3. **Google** 찾기
4. **Enable Sign in with Google** 토글 켜기
5. Google Cloud Console에서 복사한 정보 입력:
   - **Client ID**: Google OAuth 클라이언트 ID
   - **Client Secret**: Google OAuth 클라이언트 보안 비밀번호
6. **Save** 클릭

### 2-3. Redirect URLs 설정

Supabase Dashboard > **Authentication** > **URL Configuration**에서:

- **Site URL**: `http://localhost:5173` (개발) 또는 배포 URL
- **Redirect URLs** 추가:
  - `http://localhost:5173/auth/callback`
  - 배포 URL + `/auth/callback`

## 3. 애플리케이션 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`에 접속하면 헤더에 **"구글 로그인"** 버튼이 보입니다.

## 4. 테스트

1. **구글 로그인** 버튼 클릭
2. Google 계정 선택
3. 권한 승인
4. 자동으로 `/journal` 페이지로 리디렉션
5. 헤더 우측에 사용자 프로필 표시 확인

## 5. 구현된 기능

✅ **인증 스토어**: `src/lib/stores/auth.ts`

- `userStore`: 현재 로그인한 사용자 정보
- `sessionStore`: 현재 세션 정보
- `isAuthenticated`: 로그인 여부 확인
- `signInWithGoogle()`: 구글 로그인
- `signOut()`: 로그아웃

✅ **헤더 컴포넌트**: `src/lib/components/Header.svelte`

- 로그인 전: 구글 로그인 버튼
- 로그인 후: 사용자 프로필 + 드롭다운 메뉴

✅ **OAuth 콜백**: `src/routes/auth/callback/+page.svelte`

- Google 인증 후 자동 처리
- 성공 시 `/journal`로 리디렉션

✅ **레이아웃**: `src/routes/+layout.svelte`

- 앱 시작 시 인증 상태 자동 확인
- 세션 유지 관리

## 6. 다음 단계

로그인이 작동하면:

1. 매매일지 데이터베이스 테이블 생성
2. 거래 추가/조회/삭제 기능 DB 연동
3. 사용자별 데이터 필터링

## 7. 문제 해결

### "Invalid login credentials" 오류

- Supabase에서 Google Provider가 활성화되어 있는지 확인
- Google OAuth 클라이언트 ID와 Secret이 올바른지 확인

### 리디렉션 오류

- Google Cloud Console의 승인된 리디렉션 URI가 올바른지 확인
- Supabase URL Configuration의 Redirect URLs 확인

### 환경 변수 인식 안 됨

- 서버 재시작: `npm run dev`
- 환경 변수 이름이 `PUBLIC_`으로 시작하는지 확인

import { defineWebExtConfig } from 'wxt';

// WXT 공식 문서 참고: https://wxt.dev/guide/essentials/config/browser-startup.html
export default defineWebExtConfig({
    // 개발 환경에서 열 URL 목록
    startUrls: [
        'https://app.memex.xyz',
    ],

    // 프로필 데이터 유지 (로그인 세션 유지)
    // macOS/Linux에서는 chromiumArgs를 사용
    chromiumArgs: [
        // 프로젝트별로 프로필을 유지할 디렉토리 설정
        // 이 디렉토리에 로그인 정보, 쿠키 등이 저장되어 다음 실행 시에도 유지됩니다
        '--user-data-dir=./.wxt/chrome-data',
    ],

    // 프로필 변경사항 유지 (로그인, 확장 프로그램 설치 등)
    keepProfileChanges: true,
});


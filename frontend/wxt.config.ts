import path from 'path';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    // entrypoints 폴더 위치 지정 (src 안으로 이동)
    entrypointsDir: 'src/entrypoints',
    // WXT 개발 서버 포트 (백엔드 3000과 충돌 방지)
    dev: {
        server: {
            port: 3002,
        },
    },
    // Vite 설정 커스터마이징
    vite: () => ({
        // 부모 디렉토리의 .env 파일 사용
        envDir: path.resolve(__dirname, '..'),
        resolve: {
            alias: {
                '@/sidepanel': path.resolve(__dirname, './src/sidepanel'),
                '@/shared': path.resolve(__dirname, './src/shared'),
                '@/contents': path.resolve(__dirname, './src/contents'),
                '@/entrypoints': path.resolve(__dirname, './src/entrypoints'),
            },
        },
    }),
    manifest: {
        // 확장 프로그램 기본 정보
        name: 'Squid Meme',
        description: 'MemeX 프로필 페이지에 댓글 기능을 추가하는 확장 프로그램',
        version: '1.0.0',
        action: {
            default_title: 'Squid Meme',
        },
        // 외부 서비스 접근을 위한 권한
        permissions: [
            'activeTab',
            'scripting',
            'storage',
            'sidePanel',
        ],
        // 특정 호스트에 대한 접근 권한
        // Google 도메인은 명시적으로 제외하여 로그인 프로세스 방해 방지
        host_permissions: [
            // app.memex.xyz 전체 도메인 접근만 허용
            'https://app.memex.xyz/*',
            'http://app.memex.xyz/*', // 개발 환경용 HTTP도 포함
            // 로컬 서버 API 접근 (개발 환경)
            'http://localhost:3000/*',
            'http://localhost:3001/*',
            // Google 도메인은 제외하여 로그인 세션 유지
        ],
        side_panel: {
            title: 'Squid Meme',
            default_path: 'sidepanel/index.html',
        },
        // 웹 접근 가능 리소스 설정
        web_accessible_resources: [
            {
                resources: ['injected.js'],
                matches: [
                    'https://app.memex.xyz/*',
                    'http://app.memex.xyz/*',
                ],
            },
        ],
    },
});

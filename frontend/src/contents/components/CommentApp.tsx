import { getWagmiConfig } from '@/contents/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { useTokenContract } from '../hooks/useTokenContract';
import { useUserInfo } from '../hooks/useUserInfo';
import { CommentSection } from './CommentSection';
import { ErrorBoundary } from './ErrorBoundary';
import { SquidMemeJotaiProvider } from './JotaiProvider';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

// 프로필 페이지 여부 확인
function isProfilePage(): boolean {
    const profilePattern = /^https?:\/\/app\.memex\.xyz\/profile\/[^/]+\/[^/]+/;
    return profilePattern.test(window.location.href);
}

/**
 * 홈페이지 안내 컴포넌트
 */
function HomeGuide() {
    return (
        <div className="comment-section" style={{ padding: '24px', textAlign: 'center' }}>
            <h2 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '16px',
                color: '#fff'
            }}>
                Comment Game
            </h2>
            <p style={{
                fontSize: '14px',
                color: '#aaa',
                marginBottom: '12px',
                lineHeight: '1.6'
            }}>
                Be the last to comment and win the prize pool!
            </p>
            <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '16px'
            }}>
                <p style={{
                    fontSize: '13px',
                    color: '#8b5cf6',
                    fontWeight: '500',
                    marginBottom: '8px'
                }}>
                    How to Play
                </p>
                <p style={{
                    fontSize: '12px',
                    color: '#888',
                    lineHeight: '1.8'
                }}>
                    1. Visit any creator's profile page<br/>
                    2. Start or join a Comment Game with their token<br/>
                    3. Be the last commenter when time runs out to win!
                </p>
            </div>
        </div>
    );
}

/**
 * 프로필 페이지용 게임 컴포넌트
 */
function ProfileGameContent() {
    // 사용자 정보 로드 (전역 상태로 저장)
    useUserInfo();

    // 토큰 컨트랙트 감지 및 게임 주소 조회
    const { isLoading: isTokenLoading } = useTokenContract();

    if (isTokenLoading) {
        return (
            <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
                게임 정보 로딩 중...
            </div>
        );
    }

    return <CommentSection />;
}

/**
 * 내부 앱 컴포넌트 (Jotai Provider 내부에서 훅 사용)
 */
function CommentAppInner() {
    const [isProfile, setIsProfile] = useState(isProfilePage());

    // URL 변경 감지 (SPA 네비게이션 대응)
    useEffect(() => {
        const handleUrlChange = () => {
            setIsProfile(isProfilePage());
        };

        // SPA_NAVIGATION 메시지 수신
        const messageListener = (event: MessageEvent) => {
            if (event.data?.source === 'SPA_NAVIGATION') {
                handleUrlChange();
            }
        };

        window.addEventListener('message', messageListener);
        return () => window.removeEventListener('message', messageListener);
    }, []);

    // 프로필 페이지가 아니면 안내 화면 표시
    if (!isProfile) {
        return <HomeGuide />;
    }

    return <ProfileGameContent />;
}

export default function CommentApp() {
    console.log('🦑 CommentApp 렌더링 시작');
    const wagmiConfig = useMemo(() => getWagmiConfig(), []);

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    <SquidMemeJotaiProvider>
                        <CommentAppInner />
                    </SquidMemeJotaiProvider>
                </WagmiProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

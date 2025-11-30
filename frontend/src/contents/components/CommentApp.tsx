import { getWagmiConfig } from '@/contents/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
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

/**
 * 내부 앱 컴포넌트 (Jotai Provider 내부에서 훅 사용)
 */
function CommentAppInner() {
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

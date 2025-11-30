import { getWagmiConfig } from '@/contents/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { WagmiProvider } from 'wagmi';
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

export default function CommentApp() {
    console.log('🦑 CommentApp 렌더링 시작');
    const wagmiConfig = useMemo(() => getWagmiConfig(), []);

    // 사용자 정보 로드 (전역 상태로 저장)
    useUserInfo();


    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    <SquidMemeJotaiProvider>
                        <CommentSection />
                    </SquidMemeJotaiProvider>
                </WagmiProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

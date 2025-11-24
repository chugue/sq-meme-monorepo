import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <SquidMemeJotaiProvider>
                    <CommentSection />
                </SquidMemeJotaiProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

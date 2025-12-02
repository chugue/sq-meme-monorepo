import { useState, useEffect } from 'react';
import './App.css';
import { ComingSoon } from './ComingSoon';
import { Dashboard } from './Dashboard';
import { useSidepanelWallet } from './hooks/useSidepanelWallet';

type AppView = 'coming-soon' | 'dashboard';

export function SidePanelApp() {
    const { isConnected, address, isLoading } = useSidepanelWallet();
    const [currentView, setCurrentView] = useState<AppView>('coming-soon');
    const [isMemexLoggedIn, setIsMemexLoggedIn] = useState(false);

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드로 전환
    useEffect(() => {
        console.log('🔐 [App] 상태 확인:', { isConnected, isMemexLoggedIn, currentView });
        if (isConnected && isMemexLoggedIn) {
            console.log('✅ [App] Dashboard로 전환');
            setCurrentView('dashboard');
        }
    }, [isConnected, isMemexLoggedIn]);

    // MEMEX 로그인 완료 핸들러
    const handleMemexLoginComplete = () => {
        console.log('🔐 [App] handleMemexLoginComplete 호출됨');
        setIsMemexLoggedIn(true);
    };

    // 로딩 중일 때
    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // 뷰 렌더링
    if (currentView === 'dashboard') {
        return <Dashboard walletAddress={address || undefined} />;
    }

    return (
        <ComingSoon
            onMemexLoginComplete={handleMemexLoginComplete}
        />
    );
}

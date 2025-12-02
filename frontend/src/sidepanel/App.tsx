import { useEffect } from 'react';
import './App.css';
import { ComingSoon } from './ComingSoon';
import { Dashboard } from './Dashboard';
import { useSidepanelWallet } from './hooks/useSidepanelWallet';
import { useMemexLogin } from './hooks/useMemexLogin';

export function SidePanelApp() {
    const { isConnected, address, isLoading } = useSidepanelWallet();
    const { isLoggedIn: isMemexLoggedIn, setLoggedIn: setMemexLoggedIn } = useMemexLogin();

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드로 전환
    useEffect(() => {
        console.log('🔐 [App] 상태 확인:', { isConnected, isMemexLoggedIn });
    }, [isConnected, isMemexLoggedIn]);

    // MEMEX 로그인 완료 핸들러
    const handleMemexLoginComplete = () => {
        console.log('🔐 [App] handleMemexLoginComplete 호출됨');
        setMemexLoggedIn(true);
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

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드
    if (isConnected && isMemexLoggedIn) {
        return <Dashboard walletAddress={address || undefined} />;
    }

    return (
        <ComingSoon
            onMemexLoginComplete={handleMemexLoginComplete}
        />
    );
}

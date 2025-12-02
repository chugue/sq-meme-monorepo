import { useEffect, useState } from 'react';
import './App.css';
import { ComingSoon } from './ComingSoon';
import { Dashboard } from './Dashboard';
import { ProfilePage } from './ProfilePage';
import { LeaderboardPage } from './LeaderboardPage';
import { MyGamesPage } from './MyGamesPage';
import { MyAssetsPage } from './MyAssetsPage';
import { useSidepanelWallet } from './hooks/useSidepanelWallet';
import { useMemexLogin } from './hooks/useMemexLogin';

type Page = 'dashboard' | 'profile' | 'leaderboard' | 'myGames' | 'myAssets';

export function SidePanelApp() {
    const { isConnected, address, isLoading } = useSidepanelWallet();
    const { isLoggedIn: isMemexLoggedIn, setLoggedIn: setMemexLoggedIn } = useMemexLogin();
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');

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

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드 또는 프로필
    if (isConnected && isMemexLoggedIn) {
        if (currentPage === 'profile') {
            return (
                <ProfilePage
                    walletAddress={address || undefined}
                    onBack={() => setCurrentPage('dashboard')}
                />
            );
        }
        if (currentPage === 'leaderboard') {
            return (
                <LeaderboardPage
                    onBack={() => setCurrentPage('dashboard')}
                />
            );
        }
        if (currentPage === 'myGames') {
            return (
                <MyGamesPage
                    onBack={() => setCurrentPage('dashboard')}
                />
            );
        }
        if (currentPage === 'myAssets') {
            return (
                <MyAssetsPage
                    onBack={() => setCurrentPage('dashboard')}
                />
            );
        }
        return (
            <Dashboard
                walletAddress={address || undefined}
                onNavigateToProfile={() => setCurrentPage('profile')}
                onNavigateToLeaderboard={() => setCurrentPage('leaderboard')}
                onNavigateToMyGames={() => setCurrentPage('myGames')}
                onNavigateToMyAssets={() => setCurrentPage('myAssets')}
            />
        );
    }

    return (
        <ComingSoon
            onMemexLoginComplete={handleMemexLoginComplete}
        />
    );
}

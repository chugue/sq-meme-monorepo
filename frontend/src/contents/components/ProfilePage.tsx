import { useTokenContract } from "../hooks/useTokenContract";
import { useUserInfo } from "../hooks/useUserInfo";
import { CommentSection } from "./comment-section";

import { GameLoadingSection } from "./sub-components/GameLoadingSection";
import { NoGameSection } from "./sub-components/NoGameSection";

/**
 * 프로필 페이지용 게임 컴포넌트
 */
export function ProfilePage() {
    // 사용자 정보 로드 (전역 상태로 저장)
    useUserInfo();

    // 토큰 컨트랙트 감지 및 게임 정보 조회
    const { activeGameInfo, isLoading: isTokenLoading } = useTokenContract();

    if (isTokenLoading) {
        return <GameLoadingSection />;
    }

    return activeGameInfo ? <CommentSection /> : <NoGameSection />;
}

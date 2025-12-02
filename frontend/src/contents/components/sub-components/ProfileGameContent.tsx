import { useTokenContract } from "../../hooks/useTokenContract";
import { useUserInfo } from "../../hooks/useUserInfo";
import { CommentSection } from "./CommentSection";

/**
 * 프로필 페이지용 게임 컴포넌트
 */
export function ProfileGameContent() {
  // 사용자 정보 로드 (전역 상태로 저장)
  useUserInfo();

  // 토큰 컨트랙트 감지 및 게임 주소 조회
  const { isLoading: isTokenLoading } = useTokenContract();

  if (isTokenLoading) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#888" }}>
        게임 정보 로딩 중...
      </div>
    );
  }

  return <CommentSection />;
}

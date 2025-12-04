/**
 * MEMEX 로그인 상태 관리 훅
 *
 * 앱 시작 시 sessionStorage.gtm_user_identifier를 확인하여 로그인 상태를 판단합니다.
 */

import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { backgroundApi } from "../../contents/lib/backgroundApi";
import { getMemexUserInfo, saveMemexUserInfo } from "../lib/memexStorage";
import { removeStorage } from "../lib/sessionStorage";

// 모듈 레벨에서 중복 요청 방지 (Strict Mode에서도 유지됨)
let joinRequestInProgress = false;

import {
  LOGIN_CHECK_COMPLETED_KEY,
  SESSION_STATE_KEY,
} from "@/shared/config/constants";
import {
  loginCheckCompletedAtom,
  resetSessionAtom,
  sessionAtom,
  setLoggingInAtom,
  setLoginCheckCompletedAtom,
  setMemexLoggedInAtom,
  setUserAtom,
} from "../atoms/sessionAtoms";

export interface UseMemexLoginReturn {
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  username: string | null;
  userTag: string | null;
  profileImageUrl: string | null;
  tokenSymbol: string | null;
  checkLoginStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
  setLoggedIn: (value: boolean) => void;
  setLoggingIn: (value: boolean) => void;
}

export function useMemexLogin(): UseMemexLoginReturn {
  const session = useAtomValue(sessionAtom);
  const loginCheckCompleted = useAtomValue(loginCheckCompletedAtom);
  const setMemexLoggedIn = useSetAtom(setMemexLoggedInAtom);
  const setLoggingIn = useSetAtom(setLoggingInAtom);
  const setUser = useSetAtom(setUserAtom);
  const resetSession = useSetAtom(resetSessionAtom);
  const setLoginCheckCompleted = useSetAtom(setLoginCheckCompletedAtom);

  const {
    isMemexLoggedIn: isLoggedIn,
    isLoggingIn,
    memexUsername: username,
    memexUserTag: userTag,
    memexProfileImage: profileImageUrl,
    walletAddress,
    // 프로필 정보 (토큰 관련)
    memexWalletAddress,
    myTokenAddr,
    myTokenSymbol,
    // 백엔드 유저 정보 (이미 Join 완료 여부 확인용)
    user,
  } = session;

  // Join 요청 보내기 (호출 시점의 session 값 사용)
  const sendJoinRequest = useCallback(async () => {
    // 이미 요청 중이면 스킵
    if (joinRequestInProgress) {
      console.log("🚀 [useMemexLogin] Join 요청 진행 중, 스킵");
      return;
    }

    joinRequestInProgress = true;

    try {
      const response = await backgroundApi.join({
        username: username!,
        userTag: userTag!,
        walletAddress: walletAddress!,
        profileImageUrl: profileImageUrl!,
        memeXLink: `https://app.memex.xyz/profile/${username}/${userTag}`,
        myTokenAddr: myTokenAddr!,
        myTokenSymbol: myTokenSymbol!,
        memexWalletAddress: memexWalletAddress!,
        isPolicyAgreed: true,
      });

      setUser(response.user);
      console.log(
        "✅ [useMemexLogin] Join 요청 성공, User 저장:",
        response.user
      );
    } catch (joinErr) {
      console.warn("⚠️ [useMemexLogin] Join 요청 실패:", joinErr);
      joinRequestInProgress = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUser]);

  // MEMEX 로그인 상태 확인 함수
  const checkLoginStatus = useCallback(async () => {
    try {
      // 1. chrome.storage.session에서 캐시 먼저 확인
      const cachedUserInfo = await getMemexUserInfo();

      if (cachedUserInfo) {
        console.log(
          "🔐 [useMemexLogin] 캐시된 사용자 정보 발견:",
          cachedUserInfo
        );

        // 캐시가 있으면 백엔드에서 사용자 정보 조회 (출석 체크 포함)
        try {
          const result = await backgroundApi.getUserByUsername(
            cachedUserInfo.username,
            cachedUserInfo.user_tag
          );

          if (!result.user) {
            console.log("🔐 [useMemexLogin] 사용자 정보 없음 (신규 사용자)");
            return false;
          }

          // 백엔드에서 받은 user 데이터로 로그인 상태 설정
          setUser(result.user);
          setMemexLoggedIn({
            isLoggedIn: true,
            username: result.user.userName,
            userTag: result.user.userTag,
            profileImage: result.user.profileImage,
          });

          console.log(
            "✅ [useMemexLogin] 사용자 정보 조회 및 출석 체크 완료:",
            result.user
          );
        } catch (profileErr) {
          console.warn(
            "⚠️ [useMemexLogin] 사용자 정보 조회 실패 (무시):",
            profileErr
          );
        }

        return true;
      }

      // 2. 캐시 없으면 기존 로직 (backgroundApi.memexLogin) -> 구글 버튼 클릭 로그인
      const result = (await backgroundApi.memexLogin()) as {
        success: boolean;
        isLoggedIn?: boolean;
        username?: string;
        userTag?: string;
      };
      console.log("🔐 [useMemexLogin] checkLoginStatus 결과:", result);

      if (result?.isLoggedIn && result.username && result.userTag) {
        // chrome.storage에 캐시 저장
        await saveMemexUserInfo({
          username: result.username,
          user_tag: result.userTag,
        });

        // 백엔드에서 사용자 정보 조회 (출석 체크 포함)
        try {
          const userResult = await backgroundApi.getUserByUsername(
            result.username,
            result.userTag
          );

          if (userResult.user) {
            setUser(userResult.user);
            setMemexLoggedIn({
              isLoggedIn: true,
              username: userResult.user.userName,
              userTag: userResult.user.userTag,
              profileImage: userResult.user.profileImage,
            });
            console.log(
              "✅ [useMemexLogin] 사용자 정보 조회 완료:",
              userResult.user
            );
            return true;
          }
        } catch (userErr) {
          console.warn("⚠️ [useMemexLogin] 사용자 정보 조회 실패:", userErr);
        }

        // 백엔드에 유저가 없으면 (신규 사용자) 임시로 username/userTag만 저장
        // Join은 나중에 모든 데이터가 준비되면 자동으로 실행됨
        setMemexLoggedIn({
          isLoggedIn: false,
          username: result.username,
          userTag: result.userTag,
        });
        return false;
      }

      setMemexLoggedIn({ isLoggedIn: false });
      return false;
    } catch (err) {
      console.error("❌ [useMemexLogin] 로그인 상태 확인 실패:", err);
      setMemexLoggedIn({ isLoggedIn: false });
      return false;
    }
  }, [setMemexLoggedIn]);

  // 로그아웃 함수
  const logout = useCallback(async () => {
    try {
      console.log("🚪 [useMemexLogin] 로그아웃 시작");

      // 1. Extension storage 초기화 (gtm_user_identifier 및 지갑 정보 삭제)
      await backgroundApi.logout();

      // 2. MetaMask 지갑 연결 해제
      try {
        await backgroundApi.walletDisconnect();
        console.log("✅ [useMemexLogin] 지갑 연결 해제 완료");
      } catch (walletErr) {
        console.warn(
          "⚠️ [useMemexLogin] 지갑 연결 해제 실패 (무시):",
          walletErr
        );
      }

      // 3. 저장소에서 세션 상태 삭제 (atomWithStorage가 자동으로 처리하지만 명시적으로 삭제)
      try {
        await removeStorage(SESSION_STATE_KEY);
        await removeStorage(LOGIN_CHECK_COMPLETED_KEY);
        console.log("✅ [useMemexLogin] 저장소에서 세션 상태 삭제 완료");
      } catch (storageErr) {
        console.warn("⚠️ [useMemexLogin] 저장소 삭제 실패 (무시):", storageErr);
      }

      // 4. 전체 세션 초기화 (atomWithStorage가 자동으로 저장소에 반영)
      resetSession();

      console.log("✅ [useMemexLogin] 로그아웃 완료");
    } catch (err) {
      console.error("❌ [useMemexLogin] 로그아웃 실패:", err);
    }
  }, [resetSession]);

  // 앱 시작 시 로그인 상태 확인 (Jotai atomWithStorage가 자동으로 저장소에서 불러옴)
  useEffect(() => {
    // 이미 체크 완료되었으면 스킵
    if (loginCheckCompleted) {
      return;
    }

    const performCheck = async () => {
      // 기존 세션에 username/userTag가 있어도 백엔드 통신 필요 (출석 체크)
      if (username && userTag) {
        console.log("🔐 [useMemexLogin] 기존 세션 데이터로 백엔드 조회:", {
          username,
          userTag,
        });

        try {
          const result = await backgroundApi.getUserByUsername(
            username,
            userTag
          );

          if (result.user) {
            setUser(result.user);
            setMemexLoggedIn({
              isLoggedIn: true,
              username: result.user.userName,
              userTag: result.user.userTag,
              profileImage: result.user.profileImage,
            });
            console.log(
              "✅ [useMemexLogin] 기존 세션 사용자 정보 조회 완료:",
              result.user
            );
          } else {
            // 백엔드에 유저가 없으면 로그인 상태 false
            setMemexLoggedIn({ isLoggedIn: false });
          }
        } catch (err) {
          console.warn(
            "⚠️ [useMemexLogin] 기존 세션 사용자 정보 조회 실패:",
            err
          );
          setMemexLoggedIn({ isLoggedIn: false });
        }
      } else {
        // username/userTag가 없으면 기존 checkLoginStatus 실행
        await checkLoginStatus();
      }

      setLoginCheckCompleted(true);
    };

    performCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginCheckCompleted, username, userTag, setLoginCheckCompleted]);

  // sessionStore의 모든 필수 데이터가 준비되면 자동으로 Join 요청
  useEffect(() => {
    // 이미 User 정보가 있거나 요청 중이면 스킵
    if (user || joinRequestInProgress) {
      return;
    }

    // 모든 필수 데이터가 있는지 확인
    const allDataReady =
      isLoggedIn &&
      username &&
      userTag &&
      walletAddress &&
      profileImageUrl &&
      myTokenAddr &&
      myTokenSymbol &&
      memexWalletAddress;

    if (allDataReady) {
      console.log("✅ [useMemexLogin] 모든 데이터 준비됨, Join 요청 시작");
      sendJoinRequest();
    }
    // sendJoinRequest는 useCallback으로 메모이제이션되어 있으므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    isLoggedIn,
    username,
    userTag,
    walletAddress,
    profileImageUrl,
    myTokenAddr,
    myTokenSymbol,
    memexWalletAddress,
  ]);

  // setLoggedIn 래퍼 함수
  const handleSetLoggedIn = useCallback(
    (value: boolean) => {
      setMemexLoggedIn({ isLoggedIn: value });
    },
    [setMemexLoggedIn]
  );

  return {
    isLoggedIn,
    isLoggingIn,
    username,
    userTag,
    profileImageUrl,
    tokenSymbol: myTokenSymbol,
    checkLoginStatus,
    logout,
    setLoggedIn: handleSetLoggedIn,
    setLoggingIn,
  };
}

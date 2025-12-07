/**
 * 사용자 정보 훅
 *
 * chrome.storage.session에서 DB에 저장된 전체 사용자 정보를 읽어옴
 * Join 성공 후 Background Script가 자동으로 저장함
 */

import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import type { User } from "../../types/response.types";
import { currentPageInfoAtom } from "../atoms/currentPageInfoAtoms";
import { isUserLoadingAtom, userAtom, userErrorAtom } from "../atoms/userAtoms";
import { backgroundApi } from "../lib/backgroundApi";
import { logger } from "../lib/injected/logger";

/**
 * 사용자 정보 훅
 *
 * chrome.storage.session에서 User 정보를 읽어옴
 * Join 성공 후 Background Script가 squid_user로 저장함
 */
export function useUserInfo() {
    const [user, setUser] = useAtom(userAtom);
    const [isLoading, setIsLoading] = useAtom(isUserLoadingAtom);
    const [error, setError] = useAtom(userErrorAtom);
    const setCurrentPageInfo = useSetAtom(currentPageInfoAtom);

    /**
     * 사용자 정보 로드
     * chrome.storage.session에서 squid_user 읽기
     */
    const loadUser = useCallback(async (): Promise<User | null> => {
        try {
            setIsLoading(true);
            setError(null);
            logger.debug("🦑 loadUser 시작");

            const userData = await backgroundApi.getStorage<User>('squid_user', 'session');

            if (userData) {
                logger.info("User 로드 완료", {
                    id: userData.id,
                    userName: userData.userName,
                });
                setUser(userData);
                return userData;
            }

            logger.debug("User 없음 (로그인 필요)");
            setUser(null);
            return null;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            logger.error("User 로드 실패", err);
            setUser(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [setUser, setIsLoading, setError]);

    // 초기 로드 및 이벤트 리스닝
    useEffect(() => {
        loadUser();

        // 로그아웃 이벤트 리스닝
        const handleLogout = () => {
            logger.debug("🦑 로그아웃 이벤트 수신, 유저 정보 초기화");
            // 유저 정보 초기화
            setUser(null);
            setIsLoading(false);
            setError(null);
            // 페이지 정보도 초기화 (로그인한 사용자 정보가 포함될 수 있음)
            setCurrentPageInfo(null);
            // storage에서 다시 읽어서 확인
            loadUser();
        };

        // 커스텀 이벤트 리스너 (window와 document 모두 리스닝)
        window.addEventListener("squid-user-logout", handleLogout);
        document.addEventListener("squid-user-logout", handleLogout);
        logger.debug("🦑 로그아웃 이벤트 리스너 등록 완료 (window, document)");

        // storage 변경 이벤트 리스닝 (squid_user 삭제 감지)
        const handleStorageChange = (changes: { [key: string]: any }, areaName: string) => {
            logger.debug("🦑 storage 변경 감지", { areaName, changes });
            if (areaName === "session" && changes.squid_user) {
                if (changes.squid_user.newValue === null || changes.squid_user.newValue === undefined) {
                    logger.debug("🦑 squid_user 삭제 감지, 유저 정보 초기화");
                    setUser(null);
                    setIsLoading(false);
                    setError(null);
                    // 페이지 정보도 초기화
                    setCurrentPageInfo(null);
                } else {
                    // 값이 변경된 경우 다시 로드
                    loadUser();
                }
            }
        };

        // chrome.storage.onChanged 리스너 등록 (동기적으로)
        const storage = (globalThis as any).chrome?.storage || (globalThis as any).browser?.storage;
        let storageRef: any = null;

        if (storage?.onChanged) {
            storageRef = storage;
            storage.onChanged.addListener(handleStorageChange);
            logger.debug("🦑 storage.onChanged 리스너 등록 완료");
        } else {
            // 비동기로 가져오기
            import("wxt/browser").then(({ browser }) => {
                storageRef = browser?.storage || (globalThis as any).chrome?.storage;
                if (storageRef?.onChanged) {
                    storageRef.onChanged.addListener(handleStorageChange);
                    logger.debug("🦑 storage.onChanged 리스너 등록 완료 (비동기)");
                }
            });
        }

        return () => {
            window.removeEventListener("squid-user-logout", handleLogout);
            document.removeEventListener("squid-user-logout", handleLogout);
            if (storageRef?.onChanged) {
                storageRef.onChanged.removeListener(handleStorageChange);
            }
        };
    }, [loadUser, setUser, setIsLoading, setError, setCurrentPageInfo]);

    return {
        user,
        isLoading,
        error,
        refetch: loadUser,
    };
}

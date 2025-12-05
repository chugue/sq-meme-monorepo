// /**
//  * MEMEX 프로필 정보 관리 훅
//  *
//  * 프로필 정보는 local storage에 저장되며, 내 프로필인 경우 session storage에도 저장
//  *
//  * NOTE: 현재 사용되지 않음 - 프로필 캐시 버그로 인해 비활성화
//  */

// import { useAtomValue, useSetAtom } from 'jotai';
// import { useCallback, useEffect } from 'react';
// import { backgroundApi } from '../../contents/lib/backgroundApi';
// import {
//     sessionAtom,
//     setMemexLoginWithProfileAtom,
// } from '../atoms/sessionAtoms';
// import { getProfileInfo, saveProfileInfo } from '../lib/profileStorage';

// export interface UseMemexProfileReturn {
//     profileImageUrl: string | null;
//     tokenSymbol: string | null;
//     tokenAddr: string | null;
//     tokenImageUrl: string | null;
//     memexWalletAddress: string | null;
//     fetchProfileInfo: (username: string, userTag: string) => Promise<void>;
//     getProfileInfo: (username: string, userTag: string) => Promise<{
//         profileImageUrl: string | null;
//         tokenAddr: string | null;
//         tokenSymbol: string | null;
//         tokenImageUrl: string | null;
//         memexWalletAddress: string | null;
//     } | null>;
// }

// export function useMemexProfile(): UseMemexProfileReturn {
//     const session = useAtomValue(sessionAtom);
//     const setMemexLoginWithProfile = useSetAtom(setMemexLoginWithProfileAtom);

//     const {
//         memexUsername: currentUsername,
//         memexUserTag: currentUserTag,
//         memexProfileImage: profileImageUrl,
//         myTokenImageUrl: tokenImageUrl,
//         myTokenSymbol: tokenSymbol,
//         myTokenAddr: tokenAddr,
//         memexWalletAddress,
//     } = session;

//     // 내 프로필인 경우 local storage에서 tokenImageUrl 로드
//     useEffect(() => {
//         if (currentUsername && currentUserTag) {
//             getProfileInfoFromStorage(currentUsername, currentUserTag)
//         }
//     }, [currentUsername, currentUserTag]);

//     // 프로필 정보 가져오기 (local storage에서 먼저 확인)
//     const getProfileInfoFromStorage = useCallback(async (username: string, userTag: string) => {
//         try {
//             const cached = await getProfileInfo(username, userTag);
//             if (cached) {
//                 console.log('✅ [useMemexProfile] local storage에서 프로필 정보 발견:', { username, userTag });
//                 return {
//                     profileImageUrl: cached.profileImageUrl,
//                     tokenAddr: cached.tokenAddr,
//                     tokenSymbol: cached.tokenSymbol,
//                     memexWalletAddress: cached.memexWalletAddress,
//                     tokenImageUrl: cached.tokenImageUrl,
//                 };
//             }
//             return null;
//         } catch (err) {
//             console.error('❌ [useMemexProfile] 프로필 정보 읽기 실패:', err);
//             return null;
//         }
//     }, []);

//     const fetchProfileInfo = useCallback(async (username: string, userTag: string) => {
//         try {
//             console.log('🖼️ [useMemexProfile] 프로필 정보 가져오기 시작:', { username, userTag });

//             const isMyProfile = currentUsername === username && currentUserTag === userTag;

//             // 내 프로필이고 이미 session에 정보가 있으면 생략
//             if (isMyProfile && profileImageUrl && tokenAddr && tokenSymbol && memexWalletAddress) {
//                 console.log('✅ [useMemexProfile] 내 프로필 정보 이미 존재, 생략');
//                 return;
//             }

//             // local storage에서 먼저 확인
//             const cached = await getProfileInfoFromStorage(username, userTag);
//             if (cached && cached.profileImageUrl && cached.tokenAddr && cached.tokenSymbol && cached.memexWalletAddress) {
//                 console.log('✅ [useMemexProfile] 캐시된 프로필 정보 사용:', cached);

//                 // 내 프로필인 경우 session에도 저장
//                 if (isMyProfile) {
//                     setMemexLoginWithProfile({
//                         isLoggedIn: true,
//                         username,
//                         userTag,
//                         profileImage: cached.profileImageUrl,
//                         memexWalletAddress: cached.memexWalletAddress,
//                         myTokenAddr: cached.tokenAddr,
//                         myTokenSymbol: cached.tokenSymbol,
//                     });
//                 }
//                 return;
//             }

//             // 캐시가 없거나 불완전하면 fetch로 가져오기
//             const profileInfo = await backgroundApi.fetchMemexProfileInfo(username, userTag);
//             const imageUrl = profileInfo?.profileImageUrl || null;
//             const tokenImageUrl = profileInfo?.tokenImageUrl || null;
//             const tokenAddrValue = profileInfo?.tokenAddr || null;
//             const tokenSymbolValue = profileInfo?.tokenSymbol || null;
//             const memexWallet = profileInfo?.memexWalletAddress || null;

//             console.log('🖼️ [useMemexProfile] 프로필 정보:', { imageUrl, tokenAddrValue, tokenSymbolValue, memexWallet });

//             // Local storage에 저장
//             await saveProfileInfo(username, userTag, {
//                 profileImageUrl: imageUrl,
//                 tokenAddr: tokenAddrValue,
//                 tokenSymbol: tokenSymbolValue,
//                 tokenImageUrl: tokenImageUrl,
//                 memexWalletAddress: memexWallet,
//             });

//             // 내 프로필인 경우 session에도 저장
//             if (isMyProfile) {
//                 setMemexLoginWithProfile({
//                     isLoggedIn: true,
//                     username,
//                     userTag,
//                     profileImage: imageUrl,
//                     memexWalletAddress: memexWallet,
//                     myTokenAddr: tokenAddrValue,
//                     myTokenSymbol: tokenSymbolValue,
//                 });
//             }

//             console.log('✅ [useMemexProfile] 프로필 정보 저장 완료');
//         } catch (err) {
//             console.error('❌ [useMemexProfile] 프로필 정보 가져오기 실패:', err);
//             throw err;
//         }
//     }, [currentUsername, currentUserTag, profileImageUrl, tokenAddr, tokenSymbol, memexWalletAddress, getProfileInfoFromStorage, setMemexLoginWithProfile]);

//     return {
//         profileImageUrl,
//         tokenSymbol,
//         tokenAddr,
//         memexWalletAddress,
//         tokenImageUrl,
//         fetchProfileInfo,
//         getProfileInfo: getProfileInfoFromStorage,
//     };
// }

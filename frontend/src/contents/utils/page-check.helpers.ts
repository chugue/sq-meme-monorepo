// 프로필 페이지 여부 확인
export function isProfilePage(): boolean {
  const profilePattern = /^https?:\/\/app\.memex\.xyz\/profile\/[^/]+\/[^/]+/;
  return profilePattern.test(window.location.href);
}

// 홈 페이지 여부 확인
export function isHomePage(): boolean {
  const homePattern = /^https?:\/\/app\.memex\.xyz\/home/;
  return homePattern.test(window.location.href);
}

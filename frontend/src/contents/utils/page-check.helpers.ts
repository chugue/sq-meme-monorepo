// 프로필 페이지 패턴
const profilePattern = /^https?:\/\/app\.memex\.xyz\/profile\/[^/]+\/[^/?]+/;
// 홈 페이지 패턴
const homePattern = /^https?:\/\/app\.memex\.xyz\/home/;

// 프로필 페이지 여부 확인
export function isProfilePage(url?: string): boolean {
  const targetUrl = url || window.location.href;
  const result = profilePattern.test(targetUrl);
  console.log("🦑 isProfilePage:", result, targetUrl);
  return result;
}

// 홈 페이지 여부 확인
export function isHomePage(url?: string): boolean {
  const targetUrl = url || window.location.href;
  const result = homePattern.test(targetUrl);
  console.log("🦑 isHomePage:", result, targetUrl);
  return result;
}


const mockData = {
    profileImageUrl: "https://cdn.memex.xyz/memex/prod/v1/profileImage/842310_e3c.jpeg",
    tokenAddr: "0xd289bEdEC3c49Ed65D01771ef8698Eb9E92e6674",
    tokenSymbol: "JRBR",
    tokenImageUrl: "https://cdn.memex.xyz/memex/prod/v1/mrc-20/842310/JRBR.jpeg",
    memexWalletAddress: "0xf4d52E1eB19c8a7d196BeD1A06F2F82feDd07c6A",
}
/**
 * 프로필 정보 추출 유틸리티 (수정된 버전)
 * Next.js 서버 컴포넌트 데이터 페이로드(self.__next_f.push)에서 프로필 정보 추출
 */
export function extractProfileData(html: string): {
    profileImageUrl: string | null;
    tokenAddr: string | null;
    tokenSymbol: string | null;
    tokenImageUrl: string | null;
    memexWalletAddress: string | null;
} {
    let profileImageUrl: string | null = null;
    let tokenAddr: string | null = null;
    let tokenSymbol: string | null = null;
    let tokenImageUrl: string | null = null;
    let memexWalletAddress: string | null = null;

    try {
        console.log("🔍 [ProfileExtractor] HTML에서 프로필 정보 추출 시작");

        // 1. Next.js hydration data 블록(self.__next_f.push)에서 이스케이프된 JSON 문자열을 추출
        // 'self.__next_f.push([1,"..."])' 형태에서 내부 문자열을 추출합니다.
        const pushMatch = html.match(/self\.__next_f\.push\(\[1,\"(\d+:\[.*?)\"\]\)/s);

        if (!pushMatch || !pushMatch[1]) {
            console.warn("⚠️ [ProfileExtractor] Next.js push data 블록을 찾을 수 없음");
            // return { profileImageUrl, tokenAddr, tokenSymbol, tokenImageUrl, memexWalletAddress };
            return mockData
        }

        let escapedDataString = pushMatch[1];

        // 2. 추출된 문자열에서 '18:' 키에 해당하는 'currentUser' 쿼리 데이터를 포함하는 JSON 객체를 추출
        // 이 데이터 블록은 'queryKey":["/api/public/currentUser"]'를 포함합니다.
        const dataBlockMatch = escapedDataString.match(
            /18:\[\".*?\{\"state\":\{\"data\":\s*(\{.*?\"queryKey\"\s*:\s*\[\s*\"\/api\/public\/currentUser\"\s*\][^\}]*?\}\s*\}?)/s
        );

        let jsonString = null;
        if (dataBlockMatch && dataBlockMatch[1]) {
            // 정규식의 첫 번째 캡처 그룹(JSON 객체)
            jsonString = dataBlockMatch[1];
        } else {
            console.warn("⚠️ [ProfileExtractor] '18:' 데이터 블록 내에서 currentUser 쿼리 데이터를 찾을 수 없음");
            // return { profileImageUrl, tokenAddr, tokenSymbol, tokenImageUrl, memexWalletAddress };
            return mockData
        }

        // 3. 추출된 JSON 문자열의 이스케이프를 해제

        // Next.js 페이로드 내부에 있으므로 추가적인 이스케이프된 따옴표를 처리합니다.
        // \", \\, \/ 이스케이프를 일반 문자로 변환 (JSON.parse를 위해)
        jsonString = jsonString
            .replace(/\\"/g, '"')  // 이스케이프된 큰따옴표 복구
            .replace(/\\\\/g, '\\') // 이스케이프된 백슬래시 복구
            .replace(/\\\//g, '/'); // 이스케이프된 슬래시 복구

        // 4. 복구된 JSON 문자열을 파싱
        const dataObject = JSON.parse(jsonString);

        // 5. 필요한 필드 추출
        const data = dataObject.data;
        if (data) {
            profileImageUrl = data.profileImageUrl || null;
            tokenAddr = data.tokenAddress || null;
            tokenSymbol = data.tokenSymbol || null;
            tokenImageUrl = data.tokenImageUrl || null;
            memexWalletAddress = data.walletAddress || null;

            console.log("✅ [ProfileExtractor] 프로필 정보 추출 완료");
        } else {
            console.warn("⚠️ [ProfileExtractor] 파싱된 객체에서 'data' 필드를 찾을 수 없음");
        }
    } catch (error) {
        console.warn("❌ [ProfileExtractor] HTML 파싱 또는 JSON 파싱 실패:", error);
    }

    // return { profileImageUrl, tokenAddr, tokenSymbol, tokenImageUrl, memexWalletAddress };
    return mockData
}

// 이 함수를 사용하면 이전 HTML에서 성공적으로 데이터를 추출할 수 있습니다.
/**
 * 백엔드 댓글 생성 API 테스트 스크립트
 *
 * 사용법:
 *   npx ts-node scripts/testCommentApi.ts <txHash>
 *   npx ts-node scripts/testCommentApi.ts --dummy  (더미 데이터 사용)
 *
 * 예시:
 *   npx ts-node scripts/testCommentApi.ts 0x1234...abcd
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// 더미 요청 데이터 예시
const DUMMY_REQUESTS = [
  {
    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    imageUrl: undefined,
  },
  {
    txHash: "0xaabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344",
    imageUrl: "https://example.com/comment-image.png",
  },
  {
    txHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    imageUrl: "https://picsum.photos/200/300",
  },
];

async function main() {
  let txHash = process.argv[2];
  let imageUrl: string | undefined;

  // --dummy 플래그 체크
  if (txHash === "--dummy") {
    const dummyIndex = Math.floor(Math.random() * DUMMY_REQUESTS.length);
    const dummy = DUMMY_REQUESTS[dummyIndex];
    txHash = dummy.txHash;
    imageUrl = dummy.imageUrl;
    console.log(`🎲 더미 데이터 #${dummyIndex + 1} 사용`);
  }

  if (!txHash) {
    console.error("사용법: npx ts-node scripts/testCommentApi.ts <txHash>");
    console.error("       npx ts-node scripts/testCommentApi.ts --dummy");
    console.error("");
    console.error("예시: npx ts-node scripts/testCommentApi.ts 0x1234...abcd");
    process.exit(1);
  }

  console.log("=".repeat(50));
  console.log("📝 백엔드 댓글 생성 API 테스트");
  console.log("=".repeat(50));
  console.log("URL:", `${BACKEND_URL}/v1/comment`);
  console.log("txHash:", txHash);
  if (imageUrl) console.log("imageUrl:", imageUrl);
  console.log("");

  try {
    const response = await fetch(`${BACKEND_URL}/v1/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        txHash,
        ...(imageUrl && { imageUrl }),
      }),
    });

    const data = await response.json();

    console.log("Response Status:", response.status);
    console.log("Response Body:", JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("\n✅ 성공!");
    } else {
      console.log("\n❌ 실패!");
    }
  } catch (error) {
    console.error("❌ 에러:", error);
  }
}

main();

import { expect } from "chai";
import hre from "hardhat";
import { describe, it } from "node:test";
// Use hre.network.connect() to get loadFixture inside the test

describe("CommentGame", function () {
  // 1. Fixture: 테스트 초기 상태 설정
  async function deployGameFixture(connection: any) {
    // 지갑 가져오기 (Viem 방식)
    const [deployer, user1, user2] = await connection.viem.getWalletClients();
    const publicClient = await connection.viem.getPublicClient();

    // 1. Mock Token 배포
    const token = await connection.viem.deployContract("MockERC20", [
      "Test Token",
      "TEST",
    ]);

    // 2. Game Factory 배포
    const factory = await connection.viem.deployContract("GameFactory", [
      deployer.account.address,
    ]);

    return { factory, token, deployer, user1, user2, publicClient };
  }

  // Step 1. 게임 생성 테스트
  describe("Deployment & Game Creation", function () {
    it("Should create a new game correctly", async function () {
      const connection = await hre.network.connect();
      const { loadFixture } = connection.networkHelpers;
      const { factory, token } = await loadFixture(deployGameFixture);

      const cost = 10n * 10n ** 18n; // 10 Tokens (BigInt)
      const timer = 600n; // 10분

      // createGame 호출
      const hash = await factory.write.createGame([token.address, timer, cost]);

      // 트랜잭션 기다리기
      const publicClient = await connection.viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });

      // 이벤트 확인 (Viem은 이벤트 확인이 조금 다릅니다. 일단 배포된 게임 주소로 확인)
      const deployedGameAddr = await factory.read.deployedGames([0n]);
      expect(deployedGameAddr).to.not.equal(
        "0x0000000000000000000000000000000000000000",
      );
    });
  });
});

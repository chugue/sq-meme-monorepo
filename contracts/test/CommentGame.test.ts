import "@nomicfoundation/hardhat-viem/types";
import { expect } from "chai";
import hre from "hardhat";
import { describe, it } from "node:test";
import { parseEther, zeroAddress, getAddress } from "viem";

describe("CommentGame", function () {
  // Fixture: 테스트 초기 상태 설정
  async function deployGameFixture(connection: any) {
    const [deployer, user1, user2, feeCollector] =
      await connection.viem.getWalletClients();
    const publicClient = await connection.viem.getPublicClient();

    // 1. Mock Token 배포
    const token = await connection.viem.deployContract("MockERC20", ["MockERC20", "MTK"]);

    // 2. Game Factory 배포
    const factory = await connection.viem.deployContract("GameFactory", [
      feeCollector.account.address,
    ]);

    // 3. 유저들에게 토큰 분배
    const mintAmount = parseEther("1000");
    await token.write.mint([user1.account.address, mintAmount]);
    await token.write.mint([user2.account.address, mintAmount]);

    // 4. deployer가 factory에 토큰 approve (createGame용)
    const approveAmount = parseEther("10000");
    await token.write.approve([factory.address, approveAmount]);

    return {
      factory,
      token,
      deployer,
      user1,
      user2,
      feeCollector,
      publicClient,
      connection,
    };
  }

  // CommentGame 인스턴스 생성 헬퍼
  async function deployGameWithCommentGame(connection: any) {
    const fixture = await deployGameFixture(connection);
    const { factory, token, publicClient } = fixture;

    const cost = parseEther("10");
    const timer = 600n;

    const hash = await factory.write.createGame([token.address, timer, cost]);
    await publicClient.waitForTransactionReceipt({ hash });

    const gameAddress = await factory.read.deployedGames([0n]);
    const game = await connection.viem.getContractAt(
      "CommentGame",
      gameAddress,
    );

    return { ...fixture, game, gameAddress, cost, timer };
  }

  // ============================================
  // GameFactory 테스트
  // ============================================
  describe("GameFactory", function () {
    describe("Deployment", function () {
      it("Should set the correct fee collector", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, feeCollector } = await loadFixture(deployGameFixture);

        const storedFeeCollector = await factory.read.feeCollector();
        expect(getAddress(storedFeeCollector)).to.equal(
          getAddress(feeCollector.account.address),
        );
      });

      it("Should set the deployer as owner", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, deployer } = await loadFixture(deployGameFixture);

        const owner = await factory.read.owner();
        expect(getAddress(owner)).to.equal(
          getAddress(deployer.account.address),
        );
      });

      it("Should start with gameIdCounter at 0", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory } = await loadFixture(deployGameFixture);

        const counter = await factory.read.gameIdCounter();
        expect(counter).to.equal(0n);
      });
    });

    describe("createGame", function () {
      it("Should create a new game correctly", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, token, publicClient } =
          await loadFixture(deployGameFixture);

        const cost = parseEther("10");
        const timer = 600n;

        const hash = await factory.write.createGame([
          token.address,
          timer,
          cost,
        ]);
        await publicClient.waitForTransactionReceipt({ hash });

        const deployedGameAddr = await factory.read.deployedGames([0n]);
        expect(deployedGameAddr).to.not.equal(zeroAddress);
      });

      it("Should increment gameIdCounter after each game creation", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, token, deployer, publicClient, connection: conn } =
          await loadFixture(deployGameFixture);

        const cost = parseEther("10");
        const timer = 600n;

        // 첫 번째 게임 생성
        let hash = await factory.write.createGame([token.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });
        expect(await factory.read.gameIdCounter()).to.equal(1n);

        // 두 번째 게임 생성 (다른 토큰 사용 - gameByToken 제약)
        const token2 = await conn.viem.deployContract("MockERC20", ["MockToken2", "MTK2"]);
        await token2.write.mint([deployer.account.address, parseEther("1000")]);
        hash = await token2.write.approve([factory.address, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        hash = await factory.write.createGame([token2.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });
        expect(await factory.read.gameIdCounter()).to.equal(2n);
      });

      it("Should store deployed game addresses in array", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, token, deployer, publicClient, connection: conn } =
          await loadFixture(deployGameFixture);

        const cost = parseEther("10");
        const timer = 600n;

        // 게임 1 생성
        let hash = await factory.write.createGame([token.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 게임 2 생성 (다른 토큰 사용 - gameByToken 제약)
        const token2 = await conn.viem.deployContract("MockERC20", ["MockToken2", "MTK2"]);
        await token2.write.mint([deployer.account.address, parseEther("1000")]);
        hash = await token2.write.approve([factory.address, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        hash = await factory.write.createGame([token2.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const game1 = await factory.read.deployedGames([0n]);
        const game2 = await factory.read.deployedGames([1n]);

        expect(game1).to.not.equal(zeroAddress);
        expect(game2).to.not.equal(zeroAddress);
        expect(game1).to.not.equal(game2);
      });
    });

    describe("setFeeCollector", function () {
      it("Should allow owner to change fee collector", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, user1, publicClient } =
          await loadFixture(deployGameFixture);

        const hash = await factory.write.setFeeCollector([
          user1.account.address,
        ]);
        await publicClient.waitForTransactionReceipt({ hash });

        const newFeeCollector = await factory.read.feeCollector();
        expect(getAddress(newFeeCollector)).to.equal(
          getAddress(user1.account.address),
        );
      });

      it("Should revert when non-owner tries to change fee collector", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, user1, user2, connection: conn } =
          await loadFixture(deployGameFixture);

        // user1이 feeCollector를 변경하려고 시도
        const factoryAsUser1 = await conn.viem.getContractAt(
          "GameFactory",
          factory.address,
          { client: { wallet: user1 } },
        );

        try {
          await factoryAsUser1.write.setFeeCollector([user2.account.address]);
          expect.fail("Should have reverted");
        } catch (error: any) {
          expect(error.message).to.include("OwnableUnauthorizedAccount");
        }
      });
    });
  });

  // ============================================
  // CommentGame 테스트
  // ============================================
  describe("CommentGame", function () {
    describe("Deployment", function () {
      it("Should initialize game with correct parameters", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { game, token, deployer, cost, timer } = await loadFixture(
          deployGameWithCommentGame,
        );

        expect(await game.read.id()).to.equal(1n);
        expect(getAddress(await game.read.initiator())).to.equal(
          getAddress(deployer.account.address),
        );
        expect(getAddress(await game.read.gameToken())).to.equal(
          getAddress(token.address),
        );
        expect(await game.read.cost()).to.equal(cost);
        expect(await game.read.gameTime()).to.equal(timer);
        expect(await game.read.prizePool()).to.equal(0n);
        expect(await game.read.isEnded()).to.equal(false);
      });

      it("Should set lastCommentor to initiator initially", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { game, deployer } = await loadFixture(deployGameWithCommentGame);

        const lastCommentor = await game.read.lastCommentor();
        expect(getAddress(lastCommentor)).to.equal(
          getAddress(deployer.account.address),
        );
      });

      it("Should set correct endTime on creation", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { game } = await loadFixture(deployGameWithCommentGame);

        const endTime = await game.read.endTime();
        // endTime은 현재 블록 타임스탬프 + gameTime 근처여야 함
        expect(endTime > 0n).to.be.true;
      });

      it("Should have correct PLATFORM_FEE constant", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { game } = await loadFixture(deployGameWithCommentGame);

        const platformFee = await game.read.PLATFORM_FEE();
        expect(platformFee).to.equal(2n);
      });
    });

    describe("addComment", function () {
      it("Should allow user to add comment with approved tokens", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const {
          game,
          gameAddress,
          token,
          user1,
          cost,
          publicClient,
          connection: conn,
        } = await loadFixture(deployGameWithCommentGame);

        // 토큰 승인
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        let hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 댓글 추가
        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Hello World!"]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 상태 확인
        expect(getAddress(await game.read.lastCommentor())).to.equal(
          getAddress(user1.account.address),
        );
        expect(await game.read.prizePool()).to.equal(cost);
      });

      it("Should update endTime when comment is added", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const {
          game,
          gameAddress,
          token,
          user1,
          cost,
          publicClient,
          connection: conn,
        } = await loadFixture(deployGameWithCommentGame);

        const initialEndTime = await game.read.endTime();

        // 토큰 승인 및 댓글 추가
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        let hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Test comment"]);
        await publicClient.waitForTransactionReceipt({ hash });

        const newEndTime = await game.read.endTime();
        // 새로운 endTime이 이전보다 같거나 커야 함 (블록 진행으로 리셋됨)
        expect(newEndTime).to.be.greaterThanOrEqual(initialEndTime);
      });

      it("Should accumulate prizePool with multiple comments", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const {
          game,
          gameAddress,
          token,
          user1,
          user2,
          cost,
          publicClient,
          connection: conn,
        } = await loadFixture(deployGameWithCommentGame);

        // User1 댓글
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        let hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Comment 1"]);
        await publicClient.waitForTransactionReceipt({ hash });

        // User2 댓글
        const tokenAsUser2 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user2 } },
        );
        hash = await tokenAsUser2.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser2 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user2 } },
        );
        hash = await gameAsUser2.write.addComment(["Comment 2"]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 상금 풀 확인 (cost * 2)
        expect(await game.read.prizePool()).to.equal(cost * 2n);
        expect(getAddress(await game.read.lastCommentor())).to.equal(
          getAddress(user2.account.address),
        );
      });

      it("Should revert if token not approved", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { gameAddress, user1, connection: conn } = await loadFixture(
          deployGameWithCommentGame,
        );

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );

        try {
          await gameAsUser1.write.addComment(["No approval"]);
          expect.fail("Should have reverted");
        } catch (error: any) {
          expect(error.message).to.include("Must approve token first");
        }
      });

      it("Should revert if game has ended (time expired)", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, token, user1, publicClient, connection: conn } =
          await loadFixture(deployGameFixture);

        // 매우 짧은 타이머로 게임 생성 (1초)
        const cost = parseEther("10");
        const timer = 1n;

        const hash = await factory.write.createGame([
          token.address,
          timer,
          cost,
        ]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAddress = await factory.read.deployedGames([0n]);

        // 토큰 승인
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        await tokenAsUser1.write.approve([gameAddress, cost]);

        // 시간이 지나도록 대기 (mine으로 블록 진행)
        await connection.networkHelpers.mine(10);

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );

        try {
          await gameAsUser1.write.addComment(["Too late"]);
          expect.fail("Should have reverted");
        } catch (error: any) {
          expect(error.message).to.include("Game already ended");
        }
      });

      it("Should transfer tokens from user to game contract", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const {
          gameAddress,
          token,
          user1,
          cost,
          publicClient,
          connection: conn,
        } = await loadFixture(deployGameWithCommentGame);

        const initialBalance = await token.read.balanceOf([
          user1.account.address,
        ]);

        // 토큰 승인 및 댓글 추가
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        let hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Test"]);
        await publicClient.waitForTransactionReceipt({ hash });

        const finalBalance = await token.read.balanceOf([
          user1.account.address,
        ]);
        const contractBalance = await token.read.balanceOf([gameAddress]);

        expect(finalBalance).to.equal(initialBalance - cost);
        expect(contractBalance).to.equal(cost);
      });
    });

    describe("claimPrize", function () {
      it("Should allow winner to claim prize after game ends", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const {
          factory,
          token,
          user1,
          feeCollector,
          publicClient,
          connection: conn,
        } = await loadFixture(deployGameFixture);

        // 게임 생성 (60초 타이머)
        const cost = parseEther("100");
        const timer = 60n;

        let hash = await factory.write.createGame([token.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAddress = await factory.read.deployedGames([0n]);
        const game = await conn.viem.getContractAt("CommentGame", gameAddress);

        // 토큰 승인 및 댓글 추가
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Winner comment"]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 시간 경과 (타이머 + 1초)
        await connection.networkHelpers.time.increase(Number(timer) + 1);

        const user1BalanceBefore = await token.read.balanceOf([
          user1.account.address,
        ]);
        const feeCollectorBalanceBefore = await token.read.balanceOf([
          feeCollector.account.address,
        ]);

        // 상금 수령
        hash = await gameAsUser1.write.claimPrize();
        await publicClient.waitForTransactionReceipt({ hash });

        const user1BalanceAfter = await token.read.balanceOf([
          user1.account.address,
        ]);
        const feeCollectorBalanceAfter = await token.read.balanceOf([
          feeCollector.account.address,
        ]);

        // 수수료: 2%, 우승상금: 98%
        const platformFee = (cost * 2n) / 100n;
        const winnerShare = cost - platformFee;

        expect(user1BalanceAfter - user1BalanceBefore).to.equal(winnerShare);
        expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(
          platformFee,
        );
        expect(await game.read.isEnded()).to.equal(true);
      });

      it("Should revert if game has not ended yet", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const {
          gameAddress,
          token,
          user1,
          cost,
          publicClient,
          connection: conn,
        } = await loadFixture(deployGameWithCommentGame);

        // 토큰 승인 및 댓글 추가
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        let hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Test"]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 시간이 지나지 않은 상태에서 claimPrize 시도
        try {
          await gameAsUser1.write.claimPrize();
          expect.fail("Should have reverted");
        } catch (error: any) {
          expect(error.message).to.include("Game not ended yet");
        }
      });

      it("Should revert if non-winner tries to claim", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, token, user1, user2, publicClient, connection: conn } =
          await loadFixture(deployGameFixture);

        // 게임 생성 (60초 타이머)
        const cost = parseEther("10");
        const timer = 60n;

        let hash = await factory.write.createGame([token.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAddress = await factory.read.deployedGames([0n]);

        // User1이 댓글 작성 (winner)
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Winner"]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 시간 경과
        await connection.networkHelpers.time.increase(Number(timer) + 1);

        // User2가 상금 수령 시도
        const gameAsUser2 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user2 } },
        );

        try {
          await gameAsUser2.write.claimPrize();
          expect.fail("Should have reverted");
        } catch (error: any) {
          expect(error.message).to.include("Only winner can withdraw");
        }
      });

      it("Should revert if prize already claimed", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, token, user1, publicClient, connection: conn } =
          await loadFixture(deployGameFixture);

        // 게임 생성 (60초 타이머)
        const cost = parseEther("10");
        const timer = 60n;

        let hash = await factory.write.createGame([token.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAddress = await factory.read.deployedGames([0n]);

        // 토큰 승인 및 댓글 추가
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Winner"]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 시간 경과
        await connection.networkHelpers.time.increase(Number(timer) + 1);

        // 첫 번째 상금 수령
        hash = await gameAsUser1.write.claimPrize();
        await publicClient.waitForTransactionReceipt({ hash });

        // 두 번째 상금 수령 시도
        try {
          await gameAsUser1.write.claimPrize();
          expect.fail("Should have reverted");
        } catch (error: any) {
          expect(error.message).to.include("Already withdrawn");
        }
      });

      it("Should calculate correct fee split (2% platform, 98% winner)", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const {
          factory,
          token,
          user1,
          user2,
          feeCollector,
          publicClient,
          connection: conn,
        } = await loadFixture(deployGameFixture);

        const cost = parseEther("50");
        const timer = 60n;

        let hash = await factory.write.createGame([token.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAddress = await factory.read.deployedGames([0n]);

        // User1, User2 각각 댓글 (총 100 ETH 상금풀)
        const tokenAsUser1 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user1 } },
        );
        hash = await tokenAsUser1.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser1 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user1 } },
        );
        hash = await gameAsUser1.write.addComment(["Comment 1"]);
        await publicClient.waitForTransactionReceipt({ hash });

        const tokenAsUser2 = await conn.viem.getContractAt(
          "MockERC20",
          token.address,
          { client: { wallet: user2 } },
        );
        hash = await tokenAsUser2.write.approve([gameAddress, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAsUser2 = await conn.viem.getContractAt(
          "CommentGame",
          gameAddress,
          { client: { wallet: user2 } },
        );
        hash = await gameAsUser2.write.addComment(["Comment 2"]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 시간 경과
        await connection.networkHelpers.time.increase(Number(timer) + 1);

        const feeCollectorBalanceBefore = await token.read.balanceOf([
          feeCollector.account.address,
        ]);
        const user2BalanceBefore = await token.read.balanceOf([
          user2.account.address,
        ]);

        // User2 (마지막 댓글 작성자)가 상금 수령
        hash = await gameAsUser2.write.claimPrize();
        await publicClient.waitForTransactionReceipt({ hash });

        const feeCollectorBalanceAfter = await token.read.balanceOf([
          feeCollector.account.address,
        ]);
        const user2BalanceAfter = await token.read.balanceOf([
          user2.account.address,
        ]);

        const totalPrize = cost * 2n; // 100 tokens
        const expectedPlatformFee = (totalPrize * 2n) / 100n; // 2 tokens
        const expectedWinnerShare = totalPrize - expectedPlatformFee; // 98 tokens

        expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(
          expectedPlatformFee,
        );
        expect(user2BalanceAfter - user2BalanceBefore).to.equal(
          expectedWinnerShare,
        );
      });
    });

    describe("Edge Cases", function () {
      it("Should handle zero prize pool (initiator wins without any comments)", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, token, publicClient, connection: conn } =
          await loadFixture(deployGameFixture);

        // 게임 생성 (60초 타이머)
        const cost = parseEther("10");
        const timer = 60n;

        let hash = await factory.write.createGame([token.address, timer, cost]);
        await publicClient.waitForTransactionReceipt({ hash });

        const gameAddress = await factory.read.deployedGames([0n]);
        const game = await conn.viem.getContractAt("CommentGame", gameAddress);

        // 시간 경과 (아무도 댓글 안 씀)
        await connection.networkHelpers.time.increase(Number(timer) + 1);

        // 초기 생성자(deployer)가 lastCommentor이므로 상금 수령 가능
        // 하지만 prizePool이 0이므로 실제 전송되는 토큰은 없음
        hash = await game.write.claimPrize();
        await publicClient.waitForTransactionReceipt({ hash });

        expect(await game.read.isEnded()).to.equal(true);
        expect(await game.read.prizePool()).to.equal(0n);
      });

      it("Should create multiple games with different parameters", async function () {
        const connection = await hre.network.connect();
        const { loadFixture } = connection.networkHelpers;
        const { factory, token, deployer, publicClient, connection: conn } =
          await loadFixture(deployGameFixture);

        // 게임 1: 작은 비용, 긴 타이머
        let hash = await factory.write.createGame([
          token.address,
          3600n,
          parseEther("1"),
        ]);
        await publicClient.waitForTransactionReceipt({ hash });

        // 게임 2: 큰 비용, 짧은 타이머 (다른 토큰 사용 - gameByToken 제약)
        const token2 = await conn.viem.deployContract("MockERC20", ["MockToken2", "MTK2"]);
        await token2.write.mint([deployer.account.address, parseEther("1000")]);
        hash = await token2.write.approve([factory.address, parseEther("100")]);
        await publicClient.waitForTransactionReceipt({ hash });

        hash = await factory.write.createGame([
          token2.address,
          60n,
          parseEther("100"),
        ]);
        await publicClient.waitForTransactionReceipt({ hash });

        const game1Address = await factory.read.deployedGames([0n]);
        const game2Address = await factory.read.deployedGames([1n]);

        const game1 = await conn.viem.getContractAt(
          "CommentGame",
          game1Address,
        );
        const game2 = await conn.viem.getContractAt(
          "CommentGame",
          game2Address,
        );

        expect(await game1.read.gameTime()).to.equal(3600n);
        expect(await game1.read.cost()).to.equal(parseEther("1"));
        expect(await game2.read.gameTime()).to.equal(60n);
        expect(await game2.read.cost()).to.equal(parseEther("100"));
      });
    });
  });
});

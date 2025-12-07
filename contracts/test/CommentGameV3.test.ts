import "@nomicfoundation/hardhat-viem/types";
import { expect } from "chai";
import hre from "hardhat";
import { describe, it } from "node:test";
import { parseUnits, formatUnits } from "viem";

/**
 * CommentGameV3 종합 테스트
 *
 * 테스트 시나리오:
 * 1. 게임 생성 테스트 - cost가 initialFunding의 0.01%로 자동 설정
 * 2. 추가 펀딩 테스트 - 펀딩 시 cost 재계산
 * 3. 댓글 작성 및 수수료 분배 테스트
 * 4. 상금 수령 테스트
 * 5. 복합 시나리오 테스트
 */
describe("CommentGameV3", function () {
    // Fixture: 테스트 초기 상태 설정
    async function deployGameFixture(connection: any) {
        const [deployer, funder, commenter, other, feeCollector] =
            await connection.viem.getWalletClients();
        const publicClient = await connection.viem.getPublicClient();

        // 1. Mock Token 배포
        const token = await connection.viem.deployContract("MockERC20", [
            "MockToken",
            "MTK",
        ]);

        // 2. CommentGameV3 배포
        const gameContract = await connection.viem.deployContract("CommentGameV3", [
            feeCollector.account.address,
        ]);

        // 3. 유저들에게 토큰 분배
        const mintAmount = parseUnits("1000000", 18);
        await token.write.mint([deployer.account.address, mintAmount]);
        await token.write.mint([funder.account.address, mintAmount]);
        await token.write.mint([commenter.account.address, mintAmount]);
        await token.write.mint([other.account.address, mintAmount]);

        return {
            gameContract,
            token,
            deployer,
            funder,
            commenter,
            other,
            feeCollector,
            publicClient,
            connection,
        };
    }

    // ============================================
    // 1. 게임 생성 테스트
    // ============================================
    describe("게임 생성 (createGame)", function () {
        it("게임을 생성하면 cost가 initialFunding의 0.01%로 자동 설정된다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, deployer, publicClient } = await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("10000", 18); // 10,000 토큰
            const expectedCost = initialFunding / 10000n; // 0.01% = 1 토큰

            // 토큰 승인 및 게임 생성
            await token.write.approve([gameContract.address, initialFunding]);
            const hash = await gameContract.write.createGame([
                token.address,
                300n,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 게임 정보 확인
            const gameId = await gameContract.read.getActiveGameId([token.address]);
            const gameInfo = await gameContract.read.getGameInfo([gameId]);

            expect(gameInfo.cost).to.equal(expectedCost);
            expect(gameInfo.totalFunding).to.equal(initialFunding);
            expect(gameInfo.prizePool).to.equal(initialFunding);
            console.log(`✓ 초기 펀딩: ${formatUnits(initialFunding, 18)} MTK`);
            console.log(`✓ 자동 계산된 cost: ${formatUnits(gameInfo.cost, 18)} MTK (0.01%)`);
        });

        it("초기 펀딩 없이 게임을 생성하면 cost가 0이다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(deployGameFixture);

            // 펀딩 없이 게임 생성
            const hash = await gameContract.write.createGame([token.address, 300n, 0n]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);
            const gameInfo = await gameContract.read.getGameInfo([gameId]);

            expect(gameInfo.cost).to.equal(0n);
            expect(gameInfo.totalFunding).to.equal(0n);
            console.log("✓ 펀딩 없이 생성 시 cost = 0");
        });

        it("같은 토큰으로 활성 게임이 있으면 새 게임을 생성할 수 없다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("1000", 18);
            await token.write.approve([gameContract.address, initialFunding * 2n]);

            // 첫 번째 게임 생성
            const hash = await gameContract.write.createGame([
                token.address,
                300n,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 두 번째 게임 생성 시도 - 실패해야 함
            try {
                await gameContract.write.createGame([token.address, 300n, initialFunding]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Active game already exists for this token");
            }
            console.log("✓ 활성 게임 중복 생성 방지 확인");
        });
    });

    // ============================================
    // 2. 추가 펀딩 테스트
    // ============================================
    describe("추가 펀딩 (fundPrizePool)", function () {
        it("추가 펀딩 시 cost가 totalFunding의 0.01%로 재계산된다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, deployer, funder, publicClient, connection } =
                await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("10000", 18);
            const additionalFunding = parseUnits("5000", 18);

            // 게임 생성
            await token.write.approve([gameContract.address, initialFunding]);
            const hash = await gameContract.write.createGame([
                token.address,
                300n,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            // 펀더가 추가 펀딩
            const tokenAsFunder = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: funder },
            });
            await tokenAsFunder.write.approve([gameContract.address, additionalFunding]);

            const gameContractAsFunder = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: funder } }
            );
            const fundHash = await gameContractAsFunder.write.fundPrizePool([
                gameId,
                additionalFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash: fundHash });

            // 게임 정보 확인
            const gameInfo = await gameContract.read.getGameInfo([gameId]);
            const expectedTotalFunding = initialFunding + additionalFunding; // 15,000
            const expectedCost = expectedTotalFunding / 10000n; // 1.5 토큰

            expect(gameInfo.totalFunding).to.equal(expectedTotalFunding);
            expect(gameInfo.cost).to.equal(expectedCost);
            expect(gameInfo.funderCount).to.equal(2n);
            console.log(`✓ 추가 펀딩 후 totalFunding: ${formatUnits(gameInfo.totalFunding, 18)} MTK`);
            console.log(`✓ 재계산된 cost: ${formatUnits(gameInfo.cost, 18)} MTK`);
        });

        it("같은 펀더가 여러 번 펀딩해도 funders 배열에 한 번만 추가된다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("1000", 18);
            const additionalFunding = parseUnits("500", 18);

            await token.write.approve([gameContract.address, initialFunding + additionalFunding]);
            const hash = await gameContract.write.createGame([
                token.address,
                300n,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            // 같은 사람이 추가 펀딩
            const fundHash = await gameContract.write.fundPrizePool([gameId, additionalFunding]);
            await publicClient.waitForTransactionReceipt({ hash: fundHash });

            const gameInfo = await gameContract.read.getGameInfo([gameId]);
            expect(gameInfo.funderCount).to.equal(1n); // 여전히 1명
            expect(gameInfo.totalFunding).to.equal(initialFunding + additionalFunding);
            console.log("✓ 같은 펀더 중복 추가 방지 확인");
        });

        it("종료된 게임에는 펀딩할 수 없다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("1000", 18);
            await token.write.approve([gameContract.address, initialFunding * 2n]);
            const hash = await gameContract.write.createGame([
                token.address,
                60n,
                initialFunding,
            ]); // 60초
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            // 시간 경과
            await conn.networkHelpers.time.increase(61);

            // 펀딩 시도 - 실패해야 함
            try {
                await gameContract.write.fundPrizePool([gameId, initialFunding]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game already ended");
            }
            console.log("✓ 종료된 게임 펀딩 방지 확인");
        });
    });

    // ============================================
    // 3. 댓글 작성 및 수수료 분배 테스트
    // ============================================
    describe("댓글 작성 및 수수료 분배 (addComment)", function () {
        it("댓글 작성 시 cost가 펀더들에게 비율대로 분배된다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, deployer, funder, commenter, feeCollector, publicClient, connection } =
                await loadFixture(deployGameFixture);

            // 펀딩 비율: deployer 70%, funder 30%
            const deployerFunding = parseUnits("7000", 18);
            const funderFunding = parseUnits("3000", 18);
            const totalFunding = deployerFunding + funderFunding;
            const cost = totalFunding / 10000n; // 1 토큰

            // 게임 생성 (deployer가 70% 펀딩)
            await token.write.approve([gameContract.address, deployerFunding]);
            const hash = await gameContract.write.createGame([
                token.address,
                300n,
                deployerFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            // funder가 30% 추가 펀딩
            const tokenAsFunder = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: funder },
            });
            await tokenAsFunder.write.approve([gameContract.address, funderFunding]);

            const gameContractAsFunder = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: funder } }
            );
            const fundHash = await gameContractAsFunder.write.fundPrizePool([gameId, funderFunding]);
            await publicClient.waitForTransactionReceipt({ hash: fundHash });

            // commenter가 댓글 작성
            const tokenAsCommenter = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: commenter },
            });
            await tokenAsCommenter.write.approve([gameContract.address, cost]);

            const gameContractAsCommenter = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: commenter } }
            );

            // 분배 전 잔액 기록
            const deployerBalanceBefore = await token.read.balanceOf([deployer.account.address]);
            const funderBalanceBefore = await token.read.balanceOf([funder.account.address]);
            const feeCollectorBalanceBefore = await token.read.balanceOf([feeCollector.account.address]);

            // 댓글 작성
            const commentHash = await gameContractAsCommenter.write.addComment([gameId, "Hello!"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash });

            // 분배 후 잔액 확인
            const deployerBalanceAfter = await token.read.balanceOf([deployer.account.address]);
            const funderBalanceAfter = await token.read.balanceOf([funder.account.address]);
            const feeCollectorBalanceAfter = await token.read.balanceOf([feeCollector.account.address]);

            // 계산
            const platformFee = (cost * 2n) / 100n;
            const distributable = cost - platformFee;
            const deployerShare = (deployerFunding * distributable) / totalFunding;
            const funderShare = (funderFunding * distributable) / totalFunding;

            expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(platformFee);
            expect(deployerBalanceAfter - deployerBalanceBefore).to.equal(deployerShare);
            expect(funderBalanceAfter - funderBalanceBefore).to.equal(funderShare);

            console.log(`✓ 댓글 비용: ${formatUnits(cost, 18)} MTK`);
            console.log(`✓ 플랫폼 수수료 (2%): ${formatUnits(platformFee, 18)} MTK`);
            console.log(`✓ deployer 수익 (70%): ${formatUnits(deployerShare, 18)} MTK`);
            console.log(`✓ funder 수익 (30%): ${formatUnits(funderShare, 18)} MTK`);
        });

        it("댓글 작성 시 endTime이 갱신된다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, commenter, publicClient, connection } =
                await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("10000", 18);
            const cost = initialFunding / 10000n;
            const gameTime = 300n; // 5분

            await token.write.approve([gameContract.address, initialFunding]);
            const hash = await gameContract.write.createGame([
                token.address,
                gameTime,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);
            const gameInfoBefore = await gameContract.read.getGameInfo([gameId]);

            // 2분 경과
            await conn.networkHelpers.time.increase(120);

            // 댓글 작성
            const tokenAsCommenter = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: commenter },
            });
            await tokenAsCommenter.write.approve([gameContract.address, cost]);

            const gameContractAsCommenter = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: commenter } }
            );
            const commentHash = await gameContractAsCommenter.write.addComment([
                gameId,
                "Extending time!",
            ]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash });

            const gameInfoAfter = await gameContract.read.getGameInfo([gameId]);

            expect(gameInfoAfter.endTime).to.be.gt(gameInfoBefore.endTime);
            expect(gameInfoAfter.lastCommentor.toLowerCase()).to.equal(
                commenter.account.address.toLowerCase()
            );
            console.log("✓ 댓글 작성 후 endTime 갱신 확인");
        });

        it("펀딩이 없는 게임에는 댓글을 작성할 수 없다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, commenter, publicClient, connection } =
                await loadFixture(deployGameFixture);

            // 펀딩 없이 게임 생성
            const hash = await gameContract.write.createGame([token.address, 300n, 0n]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            const gameContractAsCommenter = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: commenter } }
            );

            // 댓글 시도 - 실패해야 함
            try {
                await gameContractAsCommenter.write.addComment([gameId, "Hello!"]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("No funders available");
            }
            console.log("✓ 펀딩 없는 게임 댓글 방지 확인");
        });
    });

    // ============================================
    // 4. 상금 수령 테스트
    // ============================================
    describe("상금 수령 (claimPrize)", function () {
        it("게임 종료 후 마지막 댓글 작성자가 상금을 수령할 수 있다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, commenter, publicClient, connection } =
                await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("10000", 18);
            const cost = initialFunding / 10000n;

            await token.write.approve([gameContract.address, initialFunding]);
            const hash = await gameContract.write.createGame([token.address, 60n, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            // 댓글 작성
            const tokenAsCommenter = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: commenter },
            });
            await tokenAsCommenter.write.approve([gameContract.address, cost]);

            const gameContractAsCommenter = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: commenter } }
            );
            const commentHash = await gameContractAsCommenter.write.addComment([gameId, "I will win!"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash });

            // 시간 경과
            await conn.networkHelpers.time.increase(61);

            // 상금 수령 전 잔액
            const balanceBefore = await token.read.balanceOf([commenter.account.address]);

            // 상금 수령
            const claimHash = await gameContractAsCommenter.write.claimPrize([gameId]);
            await publicClient.waitForTransactionReceipt({ hash: claimHash });

            // 상금 수령 후 잔액
            const balanceAfter = await token.read.balanceOf([commenter.account.address]);
            const gameInfo = await gameContract.read.getGameInfo([gameId]);

            expect(balanceAfter - balanceBefore).to.equal(initialFunding);
            expect(gameInfo.isClaimed).to.be.true;
            expect(gameInfo.prizePool).to.equal(0n);
            console.log(`✓ 우승자가 ${formatUnits(initialFunding, 18)} MTK 상금 수령`);
        });

        it("우승자가 아닌 사람은 상금을 수령할 수 없다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, commenter, other, publicClient, connection } =
                await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("10000", 18);
            const cost = initialFunding / 10000n;

            await token.write.approve([gameContract.address, initialFunding]);
            const hash = await gameContract.write.createGame([token.address, 60n, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            // commenter가 댓글 작성
            const tokenAsCommenter = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: commenter },
            });
            await tokenAsCommenter.write.approve([gameContract.address, cost]);

            const gameContractAsCommenter = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: commenter } }
            );
            const commentHash = await gameContractAsCommenter.write.addComment([gameId, "Winner!"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash });

            // 시간 경과
            await conn.networkHelpers.time.increase(61);

            // other가 상금 수령 시도 - 실패해야 함
            const gameContractAsOther = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: other } }
            );

            try {
                await gameContractAsOther.write.claimPrize([gameId]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only winner can withdraw");
            }
            console.log("✓ 우승자 외 상금 수령 방지 확인");
        });

        it("상금은 한 번만 수령할 수 있다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("10000", 18);
            await token.write.approve([gameContract.address, initialFunding]);
            const hash = await gameContract.write.createGame([token.address, 60n, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            // 시간 경과
            await conn.networkHelpers.time.increase(61);

            // 첫 번째 수령 - 성공
            const claimHash = await gameContract.write.claimPrize([gameId]);
            await publicClient.waitForTransactionReceipt({ hash: claimHash });

            // 두 번째 수령 시도 - 실패해야 함
            try {
                await gameContract.write.claimPrize([gameId]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Prize already claimed");
            }
            console.log("✓ 중복 상금 수령 방지 확인");
        });
    });

    // ============================================
    // 5. 복합 시나리오 테스트
    // ============================================
    describe("복합 시나리오", function () {
        it("여러 명이 펀딩하고 여러 댓글이 작성되는 전체 게임 플로우", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, deployer, funder, commenter, other, publicClient, connection } =
                await loadFixture(deployGameFixture);

            // === 1단계: 게임 생성 ===
            const deployerFunding = parseUnits("5000", 18);
            await token.write.approve([gameContract.address, deployerFunding]);
            const hash = await gameContract.write.createGame([
                token.address,
                120n,
                deployerFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });
            const gameId = await gameContract.read.getActiveGameId([token.address]);
            console.log("=== 1단계: 게임 생성 완료 ===");

            // === 2단계: 추가 펀딩 ===
            const funderFunding = parseUnits("3000", 18);
            const otherFunding = parseUnits("2000", 18);

            const tokenAsFunder = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: funder },
            });
            await tokenAsFunder.write.approve([gameContract.address, funderFunding]);
            const gameContractAsFunder = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: funder } }
            );
            const fundHash1 = await gameContractAsFunder.write.fundPrizePool([gameId, funderFunding]);
            await publicClient.waitForTransactionReceipt({ hash: fundHash1 });

            const tokenAsOther = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: other },
            });
            await tokenAsOther.write.approve([gameContract.address, otherFunding]);
            const gameContractAsOther = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: other } }
            );
            const fundHash2 = await gameContractAsOther.write.fundPrizePool([gameId, otherFunding]);
            await publicClient.waitForTransactionReceipt({ hash: fundHash2 });

            const totalFunding = deployerFunding + funderFunding + otherFunding;
            const cost = totalFunding / 10000n;

            let gameInfo = await gameContract.read.getGameInfo([gameId]);
            expect(gameInfo.totalFunding).to.equal(totalFunding);
            expect(gameInfo.cost).to.equal(cost);
            console.log(`=== 2단계: 추가 펀딩 완료 (총 ${formatUnits(totalFunding, 18)} MTK) ===`);
            console.log(`   펀딩 비율: deployer 50%, funder 30%, other 20%`);
            console.log(`   댓글 비용: ${formatUnits(cost, 18)} MTK`);

            // === 3단계: 댓글 작성 ===
            const tokenAsCommenter = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: commenter },
            });
            await tokenAsCommenter.write.approve([gameContract.address, cost * 2n]);

            const gameContractAsCommenter = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: commenter } }
            );

            // commenter 첫 번째 댓글
            const commentHash1 = await gameContractAsCommenter.write.addComment([gameId, "First!"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash1 });
            console.log("=== 3단계: commenter 첫 번째 댓글 작성 ===");

            // commenter 두 번째 댓글
            const commentHash2 = await gameContractAsCommenter.write.addComment([gameId, "Second!"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash2 });
            console.log("=== 4단계: commenter 두 번째 댓글 작성 ===");

            // === 5단계: 게임 종료 및 상금 수령 ===
            await conn.networkHelpers.time.increase(121);

            gameInfo = await gameContract.read.getGameInfo([gameId]);
            expect(gameInfo.isEnded).to.be.true;
            expect(gameInfo.lastCommentor.toLowerCase()).to.equal(
                commenter.account.address.toLowerCase()
            );

            const balanceBefore = await token.read.balanceOf([commenter.account.address]);
            const claimHash = await gameContractAsCommenter.write.claimPrize([gameId]);
            await publicClient.waitForTransactionReceipt({ hash: claimHash });
            const balanceAfter = await token.read.balanceOf([commenter.account.address]);

            expect(balanceAfter - balanceBefore).to.equal(totalFunding);
            console.log(`=== 5단계: commenter가 ${formatUnits(totalFunding, 18)} MTK 상금 수령 ===`);
            console.log("✓ 전체 게임 플로우 성공!");
        });

        it("게임 종료 후 같은 토큰으로 새 게임을 생성할 수 있다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(deployGameFixture);

            const initialFunding = parseUnits("1000", 18);
            await token.write.approve([gameContract.address, initialFunding * 2n]);

            // 첫 번째 게임
            const hash1 = await gameContract.write.createGame([token.address, 60n, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: hash1 });
            const gameId1 = await gameContract.read.getActiveGameId([token.address]);

            // 시간 경과
            await conn.networkHelpers.time.increase(61);

            // 상금 수령
            const claimHash = await gameContract.write.claimPrize([gameId1]);
            await publicClient.waitForTransactionReceipt({ hash: claimHash });

            // 두 번째 게임 - 성공해야 함
            const hash2 = await gameContract.write.createGame([token.address, 60n, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: hash2 });
            const gameId2 = await gameContract.read.getActiveGameId([token.address]);

            expect(gameId2).to.equal(2n);
            console.log("✓ 게임 종료 후 새 게임 생성 확인");
        });
    });

    // ============================================
    // 6. View 함수 테스트
    // ============================================
    describe("View 함수", function () {
        it("getAllGames가 모든 게임 정보를 반환한다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, publicClient, connection } = await loadFixture(deployGameFixture);

            // 두 번째 토큰 배포
            const token2 = await connection.viem.deployContract("MockERC20", ["Token2", "TK2"]);

            const funding = parseUnits("1000", 18);

            // 첫 번째 게임
            await token.write.approve([gameContract.address, funding]);
            const hash1 = await gameContract.write.createGame([token.address, 60n, funding]);
            await publicClient.waitForTransactionReceipt({ hash: hash1 });

            // 두 번째 게임 (다른 토큰)
            await token2.write.mint([gameContract.address, funding]); // 게임 컨트랙트에 토큰 민팅 (테스트용)
            await token2.write.approve([gameContract.address, funding]);
            const hash2 = await gameContract.write.createGame([token2.address, 120n, funding]);
            await publicClient.waitForTransactionReceipt({ hash: hash2 });

            const allGames = await gameContract.read.getAllGames();
            expect(allGames.length).to.equal(2);
            console.log("✓ getAllGames 정상 동작 확인");
        });

        it("getFunders가 펀더 목록을 반환한다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, token, funder, publicClient, connection } =
                await loadFixture(deployGameFixture);

            const funding = parseUnits("1000", 18);

            await token.write.approve([gameContract.address, funding]);
            const hash = await gameContract.write.createGame([token.address, 300n, funding]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.getActiveGameId([token.address]);

            const tokenAsFunder = await connection.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: funder },
            });
            await tokenAsFunder.write.approve([gameContract.address, funding]);

            const gameContractAsFunder = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: funder } }
            );
            const fundHash = await gameContractAsFunder.write.fundPrizePool([gameId, funding]);
            await publicClient.waitForTransactionReceipt({ hash: fundHash });

            const funders = await gameContract.read.getFunders([gameId]);
            expect(funders.length).to.equal(2);
            console.log("✓ getFunders 정상 동작 확인");
        });
    });

    // ============================================
    // 7. Owner 함수 테스트
    // ============================================
    describe("Owner 함수", function () {
        it("owner만 feeCollector를 변경할 수 있다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, other, publicClient } = await loadFixture(deployGameFixture);

            // owner가 변경 - 성공
            const hash = await gameContract.write.setFeeCollector([other.account.address]);
            await publicClient.waitForTransactionReceipt({ hash });

            const newCollector = await gameContract.read.feeCollector();
            expect(newCollector.toLowerCase()).to.equal(other.account.address.toLowerCase());

            console.log("✓ owner의 feeCollector 변경 성공");
        });

        it("owner가 아닌 사람은 feeCollector를 변경할 수 없다", async function () {
            const conn = await hre.network.connect();
            const { loadFixture } = conn.networkHelpers;
            const { gameContract, other, connection } = await loadFixture(deployGameFixture);

            const gameContractAsOther = await connection.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: other } }
            );

            // other가 변경 시도 - 실패
            try {
                await gameContractAsOther.write.setFeeCollector([other.account.address]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("OwnableUnauthorizedAccount");
            }
            console.log("✓ 비owner의 feeCollector 변경 방지 확인");
        });
    });
});

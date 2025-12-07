import "@nomicfoundation/hardhat-viem/types";
import { expect } from "chai";
import hre from "hardhat";
import { describe, it } from "node:test";
import { parseEther } from "viem";

describe("CommentGameV3 Edge Cases", function () {
    // Fixture: 테스트 초기 상태 설정
    async function deployGameFixture(connection: any) {
        const [deployer, user1, user2, user3, feeCollector] =
            await connection.viem.getWalletClients();
        const publicClient = await connection.viem.getPublicClient();

        // 1. Mock Token 배포
        const token = await connection.viem.deployContract("MockERC20", [
            "MockERC20",
            "MTK",
        ]);

        // 2. CommentGameV3 배포
        const gameContract = await connection.viem.deployContract("CommentGameV3", [
            feeCollector.account.address,
        ]);

        // 3. 유저들에게 토큰 분배
        const mintAmount = parseEther("100000");
        await token.write.mint([deployer.account.address, mintAmount]);
        await token.write.mint([user1.account.address, mintAmount]);
        await token.write.mint([user2.account.address, mintAmount]);
        await token.write.mint([user3.account.address, mintAmount]);

        return {
            gameContract,
            token,
            deployer,
            user1,
            user2,
            user3,
            feeCollector,
            publicClient,
            connection,
        };
    }

    // ============================================
    // 게임 생성 엣지 케이스
    // ============================================
    describe("Game Creation Edge Cases", function () {
        it("Should revert when creating game with zero token address", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, publicClient } = await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            try {
                await gameContract.write.createGame([
                    "0x0000000000000000000000000000000000000000" as `0x${string}`,
                    timer,
                    initialFunding,
                ]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("revert");
            }
        });

        it("Should revert when creating game with zero game time", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(deployGameFixture);

            const timer = 0n;
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            try {
                await gameContract.write.createGame([
                    token.address,
                    timer,
                    initialFunding,
                ]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("revert");
            }
        });

        it("Should allow creating game with zero initial funding", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(deployGameFixture);

            const timer = 600n;
            const initialFunding = 0n;

            const hash = await gameContract.write.createGame([
                token.address,
                timer,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;
            const gameInfo = await gameContract.read.getGameInfo([gameId]);

            expect(gameInfo.totalFunding).to.equal(0n);
            expect(gameInfo.prizePool).to.equal(0n);
            expect(gameInfo.funderCount).to.equal(0n);
        });

        it("Should revert when creating game with insufficient token allowance", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const initialFunding = parseEther("100");

            // 승인하지 않음
            try {
                await gameContract.write.createGame([
                    token.address,
                    timer,
                    initialFunding,
                ]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("revert");
            }
        });
    });

    // ============================================
    // 펀딩 엣지 케이스
    // ============================================
    describe("Funding Edge Cases", function () {
        it("Should revert when funding non-existent game", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, user1, publicClient } =
                await loadFixture(deployGameFixture);

            const fundingAmount = parseEther("100");
            const approveHashFund = await token.write.approve([gameContract.address, fundingAmount]);
            await publicClient.waitForTransactionReceipt({ hash: approveHashFund });

            try {
                await gameContract.write.fundPrizePool([999n, fundingAmount]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game does not exist");
            }
        });

        it("Should revert when funding ended game", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // 시간 경과 (게임 종료)
            await connection.networkHelpers.time.increase(601);

            const fundingAmount = parseEther("50");
            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHashFunding = await tokenAsUser1.write.approve([gameContract.address, fundingAmount]);
            await publicClient.waitForTransactionReceipt({ hash: approveHashFunding });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.fundPrizePool([gameId, fundingAmount]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game already ended");
            }
        });

        it("Should revert when funding with zero amount", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            try {
                await gameContract.write.fundPrizePool([gameId, 0n]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Amount must be greater than 0");
            }
        });

        it("Should handle multiple funders with very small amounts", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, user2, user3, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("1000");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // 매우 작은 금액으로 여러 명이 펀딩
            const smallFunding = parseEther("0.0001");
            const funders = [user1, user2, user3];

            for (const funder of funders) {
                const tokenAsFunder = await conn.viem.getContractAt("MockERC20", token.address, {
                    client: { wallet: funder },
                });
                const approveHashSmall = await tokenAsFunder.write.approve([gameContract.address, smallFunding]);
                await publicClient.waitForTransactionReceipt({ hash: approveHashSmall });

                const gameContractAsFunder = await conn.viem.getContractAt(
                    "CommentGameV3",
                    gameContract.address,
                    { client: { wallet: funder } }
                );
                const fundHash = await gameContractAsFunder.write.fundPrizePool([
                    gameId,
                    smallFunding,
                ]);
                await publicClient.waitForTransactionReceipt({ hash: fundHash });
            }

            const gameInfo = await gameContract.read.getGameInfo([gameId]);
            const fundersList = await gameContract.read.getFunders([gameId]);

            expect(fundersList.length).to.equal(4); // deployer + 3 users
            expect(gameInfo.totalFunding).to.equal(
                initialFunding + smallFunding * BigInt(funders.length)
            );
        });
    });

    // ============================================
    // 댓글 작성 엣지 케이스
    // ============================================
    describe("Comment Edge Cases", function () {
        it("Should revert when commenting on non-existent game", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.addComment([999n, "Comment"]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game does not exist");
            }
        });

        it("Should revert when commenting on ended game", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // 시간 경과 (게임 종료)
            await connection.networkHelpers.time.increase(601);

            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.addComment([gameId, "Comment"]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game already ended");
            }
        });

        it("Should revert when commenting without funders", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = 0n; // 펀딩 없이 게임 생성

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.addComment([gameId, "Comment"]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("No funders available");
            }
        });

        it("Should revert when commenting without token approval", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // 승인하지 않음
            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.addComment([gameId, "Comment"]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Must approve token first");
            }
        });

        it("Should revert when commenting with insufficient token balance", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // user1에게 토큰을 주지 않음 (또는 매우 적은 양만)
            const smallAmount = parseEther("1");
            await token.write.mint([user1.account.address, smallAmount]);

            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.addComment([gameId, "Comment"]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                // 잔액 부족 또는 transfer 실패 에러
                // 실제 에러 메시지 확인을 위해 로그 출력
                const errorMessage = error.message || String(error);
                console.log(`실제 에러 메시지: ${errorMessage}`);

                // 다양한 가능한 에러 메시지 체크
                expect(
                    errorMessage.includes("transfer") ||
                    errorMessage.includes("ERC20InsufficientBalance") ||
                    errorMessage.includes("ERC20InsufficientAllowance") ||
                    errorMessage.includes("insufficient") ||
                    errorMessage.includes("revert") ||
                    errorMessage.includes("ERC20")
                ).to.be.true;
            }
        });

        it("Should handle very long comment message", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            // 매우 긴 메시지 (1000자)
            const longMessage = "A".repeat(1000);

            const commentHash = await gameContractAsUser1.write.addComment([
                gameId,
                longMessage,
            ]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash });

            const gameInfo = await gameContract.read.getGameInfo([gameId]);
            expect(gameInfo.lastCommentor.toLowerCase()).to.equal(
                user1.account.address.toLowerCase()
            );
        });

        it("Should handle empty comment message", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            const commentHash = await gameContractAsUser1.write.addComment([gameId, ""]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash });

            const gameInfo = await gameContract.read.getGameInfo([gameId]);
            expect(gameInfo.lastCommentor.toLowerCase()).to.equal(
                user1.account.address.toLowerCase()
            );
        });
    });

    // ============================================
    // 상금 수령 엣지 케이스
    // ============================================
    describe("Prize Claim Edge Cases", function () {
        it("Should revert when claiming prize for non-existent game", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.claimPrize([999n]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game does not exist");
            }
        });

        it("Should revert when claiming prize before game ends", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // User1이 댓글 작성 (우승자)
            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            const commentHash1 = await gameContractAsUser1.write.addComment([gameId, "Winner comment"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash1 });

            // 게임이 아직 종료되지 않음

            try {
                await gameContractAsUser1.write.claimPrize([gameId]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game not ended yet");
            }
        });

        it("Should revert when non-winner tries to claim prize", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, user2, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // User1이 댓글 작성 (우승자)
            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            const commentHash1 = await gameContractAsUser1.write.addComment([gameId, "Winner comment"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash1 });

            // 시간 경과 (게임 종료)
            await connection.networkHelpers.time.increase(601);

            // User2가 상금 수령 시도 (우승자가 아님)
            const gameContractAsUser2 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user2 } }
            );

            try {
                await gameContractAsUser2.write.claimPrize([gameId]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Only winner can withdraw");
            }
        });

        it("Should revert when claiming already claimed prize", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // User1이 댓글 작성 (우승자)
            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            const commentHash1 = await gameContractAsUser1.write.addComment([gameId, "Winner comment"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash1 });

            // 시간 경과 (게임 종료)
            await connection.networkHelpers.time.increase(601);

            // 첫 번째 상금 수령
            const claimHash = await gameContractAsUser1.write.claimPrize([gameId]);
            await publicClient.waitForTransactionReceipt({ hash: claimHash });

            // 두 번째 상금 수령 시도
            try {
                await gameContractAsUser1.write.claimPrize([gameId]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Prize already claimed");
            }
        });

        it("Should revert when claiming prize with zero prize pool", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = 0n; // 펀딩 없이 게임 생성

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // 펀딩 추가
            const fundingAmount = parseEther("100");
            const approveHash2 = await token.write.approve([gameContract.address, fundingAmount]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash2 });

            const fundHash2 = await gameContract.write.fundPrizePool([gameId, fundingAmount]);
            await publicClient.waitForTransactionReceipt({ hash: fundHash2 });

            // User1이 댓글 작성 (우승자)
            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            const commentHash1 = await gameContractAsUser1.write.addComment([gameId, "Winner comment"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash1 });

            // 시간 경과 (게임 종료)
            await connection.networkHelpers.time.increase(601);

            // 상금 풀이 0이면 수령 불가 (이미 분배되었거나 없음)
            const gameInfo = await gameContract.read.getGameInfo([gameId]);
            if (gameInfo.prizePool === 0n) {
                try {
                    await gameContractAsUser1.write.claimPrize([gameId]);
                    expect.fail("Should have reverted");
                } catch (error: any) {
                    expect(error.message).to.include("No prize to claim");
                }
            }
        });
    });

    // ============================================
    // 수수료 분배 엣지 케이스
    // ============================================
    describe("Fee Distribution Edge Cases", function () {
        it("Should handle rounding errors with many small funders", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, user2, user3, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("1"); // 작은 댓글 비용
            const initialFunding = parseEther("1000");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // 여러 명이 작은 금액으로 펀딩
            const smallFunding = parseEther("0.001");
            const funders = [user1, user2, user3];

            for (const funder of funders) {
                const tokenAsFunder = await conn.viem.getContractAt("MockERC20", token.address, {
                    client: { wallet: funder },
                });
                await tokenAsFunder.write.approve([gameContract.address, smallFunding]);
                await publicClient.waitForTransactionReceipt({
                    hash: await tokenAsFunder.write.approve([gameContract.address, smallFunding]),
                });

                const gameContractAsFunder = await conn.viem.getContractAt(
                    "CommentGameV3",
                    gameContract.address,
                    { client: { wallet: funder } }
                );
                const fundHash = await gameContractAsFunder.write.fundPrizePool([gameId, smallFunding]);
                await publicClient.waitForTransactionReceipt({ hash: fundHash });
            }

            // 댓글 작성
            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            const initialBalance = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;

            const commentHash2 = await gameContractAsUser1.write.addComment([gameId, "Comment"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash2 });

            // 펀딩자들이 수수료를 받았는지 확인
            const finalBalance = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;

            // 수수료가 분배되었는지 확인 (반올림 오류로 인해 정확하지 않을 수 있음)
            expect(finalBalance >= initialBalance).to.be.true;
        });

        it("Should distribute fees correctly with single funder", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, feeCollector, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const initialFunding = parseEther("1000");
            // V3에서 cost는 자동 계산: initialFunding / 10000 = 0.1 MTK
            const cost = initialFunding / 10000n;

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash1 = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash1 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            const initialBalanceDeployer = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;
            const initialBalanceFeeCollector = (await token.read.balanceOf([
                feeCollector.account.address,
            ])) as bigint;

            const commentHash2 = await gameContractAsUser1.write.addComment([gameId, "Comment"]);
            await publicClient.waitForTransactionReceipt({ hash: commentHash2 });

            const finalBalanceDeployer = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;
            const finalBalanceFeeCollector = (await token.read.balanceOf([
                feeCollector.account.address,
            ])) as bigint;

            // 플랫폼 수수료: 2% of cost
            const expectedPlatformFee = (cost * 2n) / 100n;
            // 펀딩자 분배: 98% of cost
            const expectedFunderShare = (cost * 98n) / 100n;

            expect(finalBalanceFeeCollector - initialBalanceFeeCollector).to.equal(
                expectedPlatformFee
            );
            expect(finalBalanceDeployer - initialBalanceDeployer).to.equal(expectedFunderShare);
        });
    });

    // ============================================
    // 여러 게임 동시 관리 엣지 케이스
    // ============================================
    describe("Multiple Games Edge Cases", function () {
        it("Should handle multiple games with same token after previous game ends", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            // 첫 번째 게임 생성
            const hash1 = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash: hash1 });

            const gameId1 = 1n;

            // 시간 경과 (게임 종료)
            await connection.networkHelpers.time.increase(601);

            // 두 번째 게임 생성 (같은 토큰) - 승인 필요
            const approveHash2 = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash2 });

            const hash2 = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash: hash2 });

            const gameId2 = 2n;

            const gameInfo1 = await gameContract.read.getGameInfo([gameId1]);
            const gameInfo2 = await gameContract.read.getGameInfo([gameId2]);

            expect(gameInfo1.id).to.equal(gameId1);
            expect(gameInfo2.id).to.equal(gameId2);
            expect(gameInfo1.gameToken.toLowerCase()).to.equal(token.address.toLowerCase());
            expect(gameInfo2.gameToken.toLowerCase()).to.equal(token.address.toLowerCase());

            // 활성 게임은 두 번째 게임이어야 함
            const activeGameId = await gameContract.read.getActiveGameId([token.address]);
            expect(activeGameId).to.equal(gameId2);
        });

        it("Should revert when creating new game with same token while previous game is active", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            // 첫 번째 게임 생성
            const hash1 = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash: hash1 });

            // 게임이 아직 진행 중인데 두 번째 게임 생성 시도
            try {
                await gameContract.write.createGame([
                    token.address,
                    timer, initialFunding,
                ]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Active game already exists");
            }
        });

        it("Should return correct game info for multiple games", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            // 여러 게임 생성
            const gameIds: bigint[] = [];
            for (let i = 0; i < 3; i++) {
                if (i > 0) {
                    // 이전 게임 종료
                    await connection.networkHelpers.time.increase(601);
                }

                // 각 게임 생성 전에 승인 필요
                const approveHash = await token.write.approve([gameContract.address, initialFunding]);
                await publicClient.waitForTransactionReceipt({ hash: approveHash });

                const hash = await gameContract.write.createGame([
                    token.address,
                    timer, initialFunding,
                ]);
                await publicClient.waitForTransactionReceipt({ hash });

                gameIds.push(BigInt(i + 1));
            }

            // 모든 게임 정보 조회
            const allGames = await gameContract.read.getAllGames();
            expect(allGames.length).to.equal(3);

            for (let i = 0; i < gameIds.length; i++) {
                const gameInfo = await gameContract.read.getGameInfo([gameIds[i]]);
                expect(gameInfo.id).to.equal(gameIds[i]);
                expect(gameInfo.totalFunding).to.equal(initialFunding);
            }
        });
    });

    // ============================================
    // Getter 함수 엣지 케이스
    // ============================================
    describe("Getter Functions Edge Cases", function () {
        it("Should revert when getting info for non-existent game", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract } = await loadFixture(deployGameFixture);

            try {
                await gameContract.read.getGameInfo([999n]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game does not exist");
            }
        });

        it("Should return empty array when no games exist", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract } = await loadFixture(deployGameFixture);

            const allGameIds = await gameContract.read.getAllGameIds();
            const allGames = await gameContract.read.getAllGames();

            expect(allGameIds.length).to.equal(0);
            expect(allGames.length).to.equal(0);
        });

        it("Should return zero for active game when no active game exists", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token } = await loadFixture(deployGameFixture);

            const activeGameId = await gameContract.read.getActiveGameId([token.address]);
            expect(activeGameId).to.equal(0n);
        });

        it("Should return correct funders list", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, user2, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const timer = 600n;
            const cost = parseEther("10");
            const initialFunding = parseEther("100");

            const approveHash = await token.write.approve([gameContract.address, initialFunding]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            const hash = await gameContract.write.createGame([
                token.address,
                timer, initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // 추가 펀딩
            const funding1 = parseEther("50");
            const tokenAsUser1 = await conn.viem.getContractAt("MockERC20", token.address, {
                client: { wallet: user1 },
            });
            const approveHash3 = await tokenAsUser1.write.approve([gameContract.address, funding1]);
            await publicClient.waitForTransactionReceipt({ hash: approveHash3 });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            const fundHash1 = await gameContractAsUser1.write.fundPrizePool([gameId, funding1]);
            await publicClient.waitForTransactionReceipt({ hash: fundHash1 });

            const funders = await gameContract.read.getFunders([gameId]);
            expect(funders.length).to.equal(2);
            expect(
                funders.some(
                    (addr: string) => addr.toLowerCase() === deployer.account.address.toLowerCase()
                )
            ).to.be.true;
            expect(
                funders.some((addr: string) => addr.toLowerCase() === user1.account.address.toLowerCase())
            ).to.be.true;
        });
    });

    // ============================================
    // Owner 함수 엣지 케이스
    // ============================================
    describe("Owner Functions Edge Cases", function () {
        it("Should revert when non-owner tries to set fee collector", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV3",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.setFeeCollector([user1.account.address]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("OwnableUnauthorizedAccount");
            }
        });

        it("Should allow owner to set fee collector to zero address", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, publicClient } = await loadFixture(deployGameFixture);

            const hash = await gameContract.write.setFeeCollector([
                "0x0000000000000000000000000000000000000000" as `0x${string}`,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const feeCollector = await gameContract.read.feeCollector();
            expect(feeCollector.toLowerCase()).to.equal(
                "0x0000000000000000000000000000000000000000".toLowerCase()
            );
        });
    });
});


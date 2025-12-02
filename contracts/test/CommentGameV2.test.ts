import "@nomicfoundation/hardhat-viem/types";
import { expect } from "chai";
import hre from "hardhat";
import { describe, it } from "node:test";
import { formatEther, getAddress, parseEther } from "viem";

describe("CommentGameV2", function () {
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

        // 2. CommentGameV2 배포
        const gameContract = await connection.viem.deployContract("CommentGameV2", [
            feeCollector.account.address,
        ]);

        // 3. 유저들에게 토큰 분배
        const mintAmount = parseEther("10000");
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
    // 배포 테스트
    // ============================================
    describe("Deployment", function () {
        it("Should set the correct fee collector", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, feeCollector } = await loadFixture(
                deployGameFixture
            );

            const storedFeeCollector = await gameContract.read.feeCollector();
            expect(getAddress(storedFeeCollector)).to.equal(
                getAddress(feeCollector.account.address)
            );
        });

        it("Should start with gameIdCounter at 0", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract } = await loadFixture(deployGameFixture);

            const counter = await gameContract.read.gameIdCounter();
            expect(counter).to.equal(0n);
        });

        it("Should set deployer as owner", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, deployer } = await loadFixture(deployGameFixture);

            const owner = await gameContract.read.owner();
            expect(getAddress(owner)).to.equal(
                getAddress(deployer.account.address)
            );
        });
    });

    // ============================================
    // createGame 테스트
    // ============================================
    describe("createGame", function () {
        it("Should create a game with initial funding", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;
            const initialFunding = parseEther("100");

            // 초기 밸런스 확인
            const initialBalanceDeployer = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;
            const initialBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;

            console.log("\n=== 게임 생성 (초기 펀딩) ===");
            console.log(`초기 펀딩 금액: ${formatEther(initialFunding)} MTK`);
            console.log(`Deployer 초기 밸런스: ${formatEther(initialBalanceDeployer)} MTK`);
            console.log(`컨트랙트 초기 밸런스: ${formatEther(initialBalanceContract)} MTK`);

            // 토큰 승인
            let hash = await token.write.approve([
                gameContract.address,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 게임 생성
            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = await gameContract.read.gameIdCounter();
            expect(gameId).to.equal(1n);

            // 최종 밸런스 확인
            const finalBalanceDeployer = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;
            const finalBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;

            console.log("\n=== 게임 생성 후 ===");
            const deployerFinalStr = formatEther(finalBalanceDeployer);
            const deployerChange: bigint = finalBalanceDeployer - initialBalanceDeployer;
            const deployerChangeStr = formatEther(deployerChange);
            const contractFinalStr = formatEther(finalBalanceContract);
            const contractChange: bigint = finalBalanceContract - initialBalanceContract;
            const contractChangeStr = formatEther(contractChange);

            console.log(`Deployer 최종 밸런스: ${deployerFinalStr} MTK`);
            console.log(`Deployer 변화: ${deployerChangeStr} MTK`);
            console.log(`컨트랙트 최종 밸런스: ${contractFinalStr} MTK`);
            console.log(`컨트랙트 변화: ${contractChangeStr} MTK`);

            const gameInfo = await gameContract.read.getGameInfo([1n]);
            expect(gameInfo.id).to.equal(1n);
            expect(getAddress(gameInfo.initiator)).to.equal(
                getAddress(deployer.account.address)
            );
            expect(gameInfo.prizePool).to.equal(initialFunding);
            expect(gameInfo.totalFunding).to.equal(initialFunding);
        });

        it("Should create a game without initial funding", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(
                deployGameFixture
            );

            const cost = parseEther("10");
            const timer = 600n;

            const hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameInfo = await gameContract.read.getGameInfo([1n]);
            expect(gameInfo.prizePool).to.equal(0n);
            expect(gameInfo.totalFunding).to.equal(0n);
        });

        it("Should increment gameIdCounter after each game creation", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;

            // 첫 번째 게임 생성
            let hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 두 번째 게임 생성 (다른 토큰 사용)
            const token2 = await conn.viem.deployContract("MockERC20", [
                "MockToken2",
                "MTK2",
            ]);
            await token2.write.mint([deployer.account.address, parseEther("1000")]);

            hash = await gameContract.write.createGame([
                token2.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameIdCounter = await gameContract.read.gameIdCounter();
            expect(gameIdCounter).to.equal(2n);
        });

        it("Should revert if active game exists for token", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(
                deployGameFixture
            );

            const cost = parseEther("10");
            const timer = 600n;

            // 첫 번째 게임 생성
            let hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 같은 토큰으로 두 번째 게임 생성 시도
            try {
                hash = await gameContract.write.createGame([
                    token.address,
                    timer,
                    cost,
                    0n,
                ]);
                await publicClient.waitForTransactionReceipt({ hash });
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Active game already exists");
            }
        });
    });

    // ============================================
    // fundPrizePool 테스트
    // ============================================
    describe("fundPrizePool", function () {
        it("Should allow additional funding", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;
            const initialFunding = parseEther("100");

            // 게임 생성
            let hash = await token.write.approve([
                gameContract.address,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;
            const additionalFunding = parseEther("50");

            // 추가 펀딩 전 상태 확인
            const gameInfoBefore = await gameContract.read.getGameInfo([gameId]);
            const initialBalanceUser1 = (await token.read.balanceOf([
                user1.account.address,
            ])) as bigint;
            const initialBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;

            console.log("\n=== 추가 펀딩 전 ===");
            console.log(`게임 총 펀딩: ${formatEther(gameInfoBefore.totalFunding)} MTK`);
            console.log(`게임 상금 풀: ${formatEther(gameInfoBefore.prizePool)} MTK`);
            console.log(`User1 초기 밸런스: ${formatEther(initialBalanceUser1)} MTK`);
            console.log(`컨트랙트 초기 밸런스: ${formatEther(initialBalanceContract)} MTK`);
            // User1이 추가 펀딩
            const tokenAsUser1 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user1 } }
            );
            hash = await tokenAsUser1.write.approve([
                gameContract.address,
                additionalFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            hash = await gameContractAsUser1.write.fundPrizePool([
                gameId,
                additionalFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 추가 펀딩 후 상태 확인
            const gameInfo = await gameContract.read.getGameInfo([gameId]);
            const finalBalanceUser1 = (await token.read.balanceOf([
                user1.account.address,
            ])) as bigint;
            const finalBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;

            console.log("\n=== 추가 펀딩 후 ===");
            const additionalFundingStr = formatEther(additionalFunding);
            const totalFundingStr = formatEther(gameInfo.totalFunding);
            const prizePoolStr = formatEther(gameInfo.prizePool);
            const user1FinalStr = formatEther(finalBalanceUser1);
            const user1Change: bigint = finalBalanceUser1 - initialBalanceUser1;
            const user1ChangeStr = formatEther(user1Change);
            const contractFinalStr = formatEther(finalBalanceContract);
            const contractChange: bigint = finalBalanceContract - initialBalanceContract;
            const contractChangeStr = formatEther(contractChange);

            console.log(`추가 펀딩 금액: ${additionalFundingStr} MTK`);
            console.log(`게임 총 펀딩: ${totalFundingStr} MTK`);
            console.log(`게임 상금 풀: ${prizePoolStr} MTK`);
            console.log(`User1 최종 밸런스: ${user1FinalStr} MTK`);
            console.log(`User1 변화: ${user1ChangeStr} MTK`);
            console.log(`컨트랙트 최종 밸런스: ${contractFinalStr} MTK`);
            console.log(`컨트랙트 변화: ${contractChangeStr} MTK`);

            expect(gameInfo.totalFunding).to.equal(
                initialFunding + additionalFunding
            );
            expect(gameInfo.prizePool).to.equal(
                initialFunding + additionalFunding
            );
        });

        it("Should revert if game does not exist", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const tokenAsUser1 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user1 } }
            );
            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            let hash = await tokenAsUser1.write.approve([
                gameContract.address,
                parseEther("50"),
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            try {
                await gameContractAsUser1.write.fundPrizePool([999n, parseEther("50")]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game does not exist");
            }
        });

        it("Should revert if game has ended", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 1n; // 매우 짧은 타이머

            // 게임 생성
            let hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 시간 경과
            await connection.networkHelpers.time.increase(2);

            const tokenAsUser1 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user1 } }
            );
            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            hash = await tokenAsUser1.write.approve([
                gameContract.address,
                parseEther("50"),
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            try {
                await gameContractAsUser1.write.fundPrizePool([1n, parseEther("50")]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game already ended");
            }
        });
    });

    // ============================================
    // addComment 및 분배 테스트
    // ============================================
    describe("addComment and distribution", function () {
        it("Should distribute comment fee to funders immediately", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const {
                gameContract,
                token,
                deployer,
                user1,
                feeCollector,
                publicClient,
                connection: conn,
            } = await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;
            const initialFunding = parseEther("100");

            // 게임 생성
            let hash = await token.write.approve([
                gameContract.address,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;
            const initialBalanceDeployer = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;
            const initialBalanceUser1 = (await token.read.balanceOf([
                user1.account.address,
            ])) as bigint;
            const initialBalanceFeeCollector = (await token.read.balanceOf([
                feeCollector.account.address,
            ])) as bigint;
            const initialBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;

            console.log("\n=== 댓글 작성 및 수수료 분배 전 ===");
            console.log(`댓글 작성 비용: ${formatEther(cost)} MTK`);
            console.log(`Deployer (펀딩자) 초기 밸런스: ${formatEther(initialBalanceDeployer)} MTK`);
            console.log(`User1 (댓글 작성자) 초기 밸런스: ${formatEther(initialBalanceUser1)} MTK`);
            console.log(`FeeCollector 초기 밸런스: ${formatEther(initialBalanceFeeCollector)} MTK`);
            console.log(`컨트랙트 초기 밸런스: ${formatEther(initialBalanceContract)} MTK`);

            // User1이 댓글 작성
            const tokenAsUser1 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user1 } }
            );
            hash = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            hash = await gameContractAsUser1.write.addComment([
                gameId,
                "Test comment",
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 분배 확인
            const finalBalanceDeployer = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;
            const finalBalanceUser1 = (await token.read.balanceOf([
                user1.account.address,
            ])) as bigint;
            const finalBalanceFeeCollector = (await token.read.balanceOf([
                feeCollector.account.address,
            ])) as bigint;
            const finalBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;

            const expectedPlatformFee = (cost * 2n) / 100n;
            const expectedFunderShare = (cost * 98n) / 100n;

            console.log("\n=== 댓글 작성 및 수수료 분배 후 ===");
            const deployerBalanceStr = formatEther(finalBalanceDeployer);
            const deployerChange: bigint = finalBalanceDeployer - initialBalanceDeployer;
            const deployerChangeStr = formatEther(deployerChange);
            const deployerExpectedStr = formatEther(expectedFunderShare);
            const user1BalanceStr = formatEther(finalBalanceUser1);
            const user1Change: bigint = finalBalanceUser1 - initialBalanceUser1;
            const user1ChangeStr = formatEther(user1Change);
            const feeCollectorBalanceStr = formatEther(finalBalanceFeeCollector);
            const feeCollectorChange: bigint = finalBalanceFeeCollector - initialBalanceFeeCollector;
            const feeCollectorChangeStr = formatEther(feeCollectorChange);
            const feeCollectorExpectedStr = formatEther(expectedPlatformFee);
            const contractBalanceStr = formatEther(finalBalanceContract);
            const contractChange: bigint = finalBalanceContract - initialBalanceContract;
            const contractChangeStr = formatEther(contractChange);

            console.log(`Deployer (펀딩자) 최종 밸런스: ${deployerBalanceStr} MTK`);
            console.log(`Deployer 변화: +${deployerChangeStr} MTK (예상: +${deployerExpectedStr} MTK)`);
            console.log(`User1 (댓글 작성자) 최종 밸런스: ${user1BalanceStr} MTK`);
            console.log(`User1 변화: ${user1ChangeStr} MTK`);
            console.log(`FeeCollector 최종 밸런스: ${feeCollectorBalanceStr} MTK`);
            console.log(`FeeCollector 변화: +${feeCollectorChangeStr} MTK (예상: +${feeCollectorExpectedStr} MTK)`);
            console.log(`컨트랙트 최종 밸런스: ${contractBalanceStr} MTK`);
            console.log(`컨트랙트 변화: ${contractChangeStr} MTK`);

            expect(finalBalanceFeeCollector - initialBalanceFeeCollector).to.equal(
                expectedPlatformFee
            );
            expect(finalBalanceDeployer - initialBalanceDeployer).to.equal(
                expectedFunderShare
            );
        });

        it("Should distribute to multiple funders proportionally", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const {
                gameContract,
                token,
                deployer,
                user1,
                user2,
                feeCollector,
                publicClient,
                connection: conn,
            } = await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;
            const initialFunding = parseEther("100");

            // 게임 생성
            let hash = await token.write.approve([
                gameContract.address,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // User1이 200 토큰 펀딩
            const funding1 = parseEther("200");
            const tokenAsUser1 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user1 } }
            );
            hash = await tokenAsUser1.write.approve([
                gameContract.address,
                funding1,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            hash = await gameContractAsUser1.write.fundPrizePool([gameId, funding1]);
            await publicClient.waitForTransactionReceipt({ hash });

            // User2가 댓글 작성 전 상태 확인
            const tokenAsUser2 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user2 } }
            );
            hash = await tokenAsUser2.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash });

            const initialBalanceDeployer = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;
            const initialBalanceUser1 = (await token.read.balanceOf([
                user1.account.address,
            ])) as bigint;
            const initialBalanceUser2 = (await token.read.balanceOf([
                user2.account.address,
            ])) as bigint;
            const initialBalanceFeeCollector = (await token.read.balanceOf([
                feeCollector.account.address,
            ])) as bigint;
            const initialBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;

            // 게임 정보 확인
            const gameInfoBefore = await gameContract.read.getGameInfo([gameId]);

            console.log("\n=== 여러 펀딩자 수수료 분배 전 ===");
            console.log(`게임 ID: ${gameId}`);
            console.log(`댓글 작성 비용: ${formatEther(cost)} MTK`);
            console.log(`게임 총 펀딩: ${formatEther(gameInfoBefore.totalFunding)} MTK`);
            console.log(`게임 상금 풀: ${formatEther(gameInfoBefore.prizePool)} MTK`);
            console.log(`  - Deployer 펀딩: ${formatEther(parseEther("100"))} MTK`);
            console.log(`  - User1 펀딩: ${formatEther(parseEther("200"))} MTK`);
            console.log(`Deployer 초기 밸런스: ${formatEther(initialBalanceDeployer)} MTK`);
            console.log(`User1 초기 밸런스: ${formatEther(initialBalanceUser1)} MTK`);
            console.log(`User2 (댓글 작성자) 초기 밸런스: ${formatEther(initialBalanceUser2)} MTK`);
            console.log(`FeeCollector 초기 밸런스: ${formatEther(initialBalanceFeeCollector)} MTK`);
            console.log(`컨트랙트 초기 밸런스: ${formatEther(initialBalanceContract)} MTK`);

            const gameContractAsUser2 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user2 } }
            );
            hash = await gameContractAsUser2.write.addComment([gameId, "Comment"]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 분배 확인
            const finalBalanceDeployer = (await token.read.balanceOf([
                deployer.account.address,
            ])) as bigint;
            const finalBalanceUser1 = (await token.read.balanceOf([
                user1.account.address,
            ])) as bigint;
            const finalBalanceUser2 = (await token.read.balanceOf([
                user2.account.address,
            ])) as bigint;
            const finalBalanceFeeCollector = (await token.read.balanceOf([
                feeCollector.account.address,
            ])) as bigint;
            const finalBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;

            // 게임 정보 확인 (댓글 작성 후)
            const gameInfoAfter = await gameContract.read.getGameInfo([gameId]);

            // 총 펀딩: 100 + 200 = 300
            const distributableAmount = (cost * 98n) / 100n;
            const expectedDeployerShare =
                (parseEther("100") * distributableAmount) / parseEther("300");
            const expectedUser1Share =
                (parseEther("200") * distributableAmount) / parseEther("300");
            const expectedPlatformFee = (cost * 2n) / 100n;

            // 실제 분배 금액 계산
            const actualDeployerChange = finalBalanceDeployer - initialBalanceDeployer;
            const actualUser1Change = finalBalanceUser1 - initialBalanceUser1;
            const actualPlatformFee = finalBalanceFeeCollector - initialBalanceFeeCollector;
            const totalDistributed = actualDeployerChange + actualUser1Change;

            console.log("\n=== 여러 펀딩자 수수료 분배 후 ===");
            console.log(`게임 ID: ${gameId}`);
            console.log(`게임 총 펀딩: ${formatEther(gameInfoAfter.totalFunding)} MTK`);
            console.log(`게임 상금 풀: ${formatEther(gameInfoAfter.prizePool)} MTK (변화 없음 - 펀딩된 금액 유지)`);
            const distributableAmountStr = formatEther(distributableAmount);
            const platformFeeStr = formatEther(expectedPlatformFee);
            const deployerBalanceStr = formatEther(finalBalanceDeployer);
            const deployerChange: bigint = finalBalanceDeployer - initialBalanceDeployer;
            const deployerChangeStr = formatEther(deployerChange);
            const deployerExpectedStr = formatEther(expectedDeployerShare);
            const user1BalanceStr = formatEther(finalBalanceUser1);
            const user1Change: bigint = finalBalanceUser1 - initialBalanceUser1;
            const user1ChangeStr = formatEther(user1Change);
            const user1ExpectedStr = formatEther(expectedUser1Share);
            const user2BalanceStr = formatEther(finalBalanceUser2);
            const user2Change: bigint = finalBalanceUser2 - initialBalanceUser2;
            const user2ChangeStr = formatEther(user2Change);
            const feeCollectorBalanceStr = formatEther(finalBalanceFeeCollector);
            const feeCollectorChange: bigint = finalBalanceFeeCollector - initialBalanceFeeCollector;
            const feeCollectorChangeStr = formatEther(feeCollectorChange);
            const contractBalanceStr = formatEther(finalBalanceContract);
            const contractChange: bigint = finalBalanceContract - initialBalanceContract;
            const contractChangeStr = formatEther(contractChange);

            console.log(`분배 가능 금액 (98%): ${distributableAmountStr} MTK`);
            console.log(`플랫폼 수수료 (2%): ${platformFeeStr} MTK`);
            console.log(`\nDeployer 최종 밸런스: ${deployerBalanceStr} MTK`);
            console.log(`Deployer 변화: +${deployerChangeStr} MTK (예상: +${deployerExpectedStr} MTK, 비율: 100/300)`);
            console.log(`\nUser1 최종 밸런스: ${user1BalanceStr} MTK`);
            console.log(`User1 변화: +${user1ChangeStr} MTK (예상: +${user1ExpectedStr} MTK, 비율: 200/300)`);
            console.log(`\nUser2 (댓글 작성자) 최종 밸런스: ${user2BalanceStr} MTK`);
            console.log(`User2 변화: ${user2ChangeStr} MTK`);
            console.log(`\nFeeCollector 최종 밸런스: ${feeCollectorBalanceStr} MTK`);
            console.log(`FeeCollector 변화: +${feeCollectorChangeStr} MTK (예상: +${platformFeeStr} MTK)`);
            console.log(`\n컨트랙트 최종 밸런스: ${contractBalanceStr} MTK`);
            console.log(`컨트랙트 변화: ${contractChangeStr} MTK`);

            // Deployer는 정확히 예상 금액을 받아야 함
            expect(actualDeployerChange).to.equal(expectedDeployerShare);

            // User1은 마지막 펀딩자이므로 반올림 오류 보정으로 나머지를 받을 수 있음
            // 예상 금액 이상, 분배 가능 금액 이하를 받아야 함
            expect(actualUser1Change >= expectedUser1Share).to.be.true;
            expect(actualUser1Change <= distributableAmount).to.be.true;

            // 총 분배 금액이 정확해야 함
            expect(totalDistributed).to.equal(distributableAmount);

            // 플랫폼 수수료는 정확해야 함
            expect(actualPlatformFee).to.equal(expectedPlatformFee);
        });

        it("Should revert if no funders available", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;

            // 펀딩 없이 게임 생성
            let hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const tokenAsUser1 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user1 } }
            );
            hash = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.addComment([1n, "No funders"]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("No funders available");
            }
        });
    });

    // ============================================
    // claimPrize 테스트
    // ============================================
    describe("claimPrize", function () {
        it("Should allow winner to claim funded prize pool", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;
            const initialFunding = parseEther("100");

            // 게임 생성
            let hash = await token.write.approve([
                gameContract.address,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // User1이 댓글 작성
            const tokenAsUser1 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user1 } }
            );
            hash = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            hash = await gameContractAsUser1.write.addComment([
                gameId,
                "Winner comment",
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 시간 경과
            await connection.networkHelpers.time.increase(601);

            const initialBalance = (await token.read.balanceOf([
                user1.account.address,
            ])) as bigint;
            const initialBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;
            const gameInfo = await gameContract.read.getGameInfo([gameId]);
            const prizePool = gameInfo.prizePool;

            console.log("\n=== 상금 수령 전 ===");
            console.log(`게임 ID: ${gameId}`);
            console.log(`게임 상금 풀: ${formatEther(prizePool)} MTK`);
            console.log(`초기 펀딩: ${formatEther(initialFunding)} MTK`);
            console.log(`User1 (우승자) 초기 밸런스: ${formatEther(initialBalance)} MTK`);
            console.log(`컨트랙트 초기 밸런스: ${formatEther(initialBalanceContract)} MTK`);
            console.log(`게임 종료 여부: ${gameInfo.isEnded}`);
            console.log(`상금 수령 여부: ${gameInfo.isClaimed}`);

            // 상금 수령
            hash = await gameContractAsUser1.write.claimPrize([gameId]);
            await publicClient.waitForTransactionReceipt({ hash });

            const finalBalance = (await token.read.balanceOf([
                user1.account.address,
            ])) as bigint;
            const finalBalanceContract = (await token.read.balanceOf([
                gameContract.address,
            ])) as bigint;
            const updatedGameInfo = await gameContract.read.getGameInfo([gameId]);

            console.log("\n=== 상금 수령 후 ===");
            const finalBalanceStr = formatEther(finalBalance);
            const balanceChange: bigint = finalBalance - initialBalance;
            const balanceChangeStr = formatEther(balanceChange);
            const prizePoolStr = formatEther(prizePool);
            const finalContractBalanceStr = formatEther(finalBalanceContract);
            const contractChange: bigint = finalBalanceContract - initialBalanceContract;
            const contractChangeStr = formatEther(contractChange);
            const finalPrizePoolStr = formatEther(updatedGameInfo.prizePool);

            console.log(`User1 (우승자) 최종 밸런스: ${finalBalanceStr} MTK`);
            console.log(`User1 변화: +${balanceChangeStr} MTK (예상: +${prizePoolStr} MTK)`);
            console.log(`컨트랙트 최종 밸런스: ${finalContractBalanceStr} MTK`);
            console.log(`컨트랙트 변화: ${contractChangeStr} MTK`);
            console.log(`게임 상금 풀: ${finalPrizePoolStr} MTK`);
            console.log(`상금 수령 여부: ${updatedGameInfo.isClaimed}`);

            expect(finalBalance - initialBalance).to.equal(prizePool);
            expect(updatedGameInfo.prizePool).to.equal(0n);
            expect(updatedGameInfo.isClaimed).to.equal(true);
        });

        it("Should revert if game has not ended", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, user1, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;
            const initialFunding = parseEther("100");

            // 게임 생성
            let hash = await token.write.approve([
                gameContract.address,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            const tokenAsUser1 = await conn.viem.getContractAt(
                "MockERC20",
                token.address,
                { client: { wallet: user1 } }
            );
            hash = await tokenAsUser1.write.approve([gameContract.address, cost]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );
            hash = await gameContractAsUser1.write.addComment([gameId, "Test"]);
            await publicClient.waitForTransactionReceipt({ hash });

            try {
                await gameContractAsUser1.write.claimPrize([gameId]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("Game not ended yet");
            }
        });
    });

    // ============================================
    // getter 함수 테스트
    // ============================================
    describe("Getter functions", function () {
        it("Should return game info correctly", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;
            const initialFunding = parseEther("100");

            let hash = await token.write.approve([
                gameContract.address,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameInfo = await gameContract.read.getGameInfo([1n]);
            expect(gameInfo.id).to.equal(1n);
            expect(getAddress(gameInfo.initiator)).to.equal(
                getAddress(deployer.account.address)
            );
            expect(gameInfo.cost).to.equal(cost);
            expect(gameInfo.gameTime).to.equal(timer);
            expect(gameInfo.prizePool).to.equal(initialFunding);
            expect(gameInfo.totalFunding).to.equal(initialFunding);
            expect(gameInfo.isEnded).to.equal(false);
        });

        it("Should return all game IDs", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;

            // 게임 1 생성
            let hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 게임 2 생성 (다른 토큰)
            const token2 = await conn.viem.deployContract("MockERC20", [
                "MockToken2",
                "MTK2",
            ]);
            await token2.write.mint([deployer.account.address, parseEther("1000")]);

            hash = await gameContract.write.createGame([
                token2.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const allGameIds = await gameContract.read.getAllGameIds();
            expect(allGameIds.length).to.equal(2);
            expect(allGameIds[0]).to.equal(1n);
            expect(allGameIds[1]).to.equal(2n);
        });

        it("Should return all games info", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            const cost = parseEther("10");
            const timer = 600n;
            const initialFunding1 = parseEther("100");
            const initialFunding2 = parseEther("200");

            // 게임 1 생성
            let hash = await token.write.approve([
                gameContract.address,
                initialFunding1,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding1,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            // 게임 2 생성 (다른 토큰)
            const token2 = await conn.viem.deployContract("MockERC20", [
                "MockToken2",
                "MTK2",
            ]);
            await token2.write.mint([deployer.account.address, parseEther("1000")]);

            hash = await token2.write.approve([
                gameContract.address,
                initialFunding2,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token2.address,
                timer,
                cost,
                initialFunding2,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const allGames = await gameContract.read.getAllGames();
            expect(allGames.length).to.equal(2);
            expect(allGames[0].id).to.equal(1n);
            expect(allGames[0].prizePool).to.equal(initialFunding1);
            expect(allGames[1].id).to.equal(2n);
            expect(allGames[1].prizePool).to.equal(initialFunding2);
        });

        it("Should return active game ID by token", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, publicClient } = await loadFixture(
                deployGameFixture
            );

            const cost = parseEther("10");
            const timer = 600n;

            let hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                0n,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const activeGameId = await gameContract.read.getActiveGameId([
                token.address,
            ]);
            expect(activeGameId).to.equal(1n);
        });
    });

    // ============================================
    // setFeeCollector 테스트
    // ============================================
    describe("setFeeCollector", function () {
        it("Should allow owner to change fee collector", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, user1, publicClient } = await loadFixture(
                deployGameFixture
            );

            const hash = await gameContract.write.setFeeCollector([
                user1.account.address,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const newFeeCollector = await gameContract.read.feeCollector();
            expect(getAddress(newFeeCollector)).to.equal(
                getAddress(user1.account.address)
            );
        });

        it("Should revert when non-owner tries to change fee collector", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, user1, user2, connection: conn } =
                await loadFixture(deployGameFixture);

            const gameContractAsUser1 = await conn.viem.getContractAt(
                "CommentGameV2",
                gameContract.address,
                { client: { wallet: user1 } }
            );

            try {
                await gameContractAsUser1.write.setFeeCollector([
                    user2.account.address,
                ]);
                expect.fail("Should have reverted");
            } catch (error: any) {
                expect(error.message).to.include("OwnableUnauthorizedAccount");
            }
        });
    });

    // ============================================
    // 스트레스 테스트: 다수 펀딩자 및 참여자
    // ============================================
    describe("Stress Test", function () {
        it("Should handle 4 funders, 10 participants, and 300 comments with time extension", async function () {
            const connection = await hre.network.connect();
            const { loadFixture } = connection.networkHelpers;
            const { gameContract, token, deployer, user1, user2, user3, feeCollector, publicClient, connection: conn } =
                await loadFixture(deployGameFixture);

            // 모든 계정 가져오기 (Hardhat은 기본적으로 20개 계정 제공)
            const allWallets = await conn.viem.getWalletClients();

            // 펀딩자 4명: deployer, user1, user2, user3
            const funders = [deployer, user1, user2, user3];

            // 참여자 10명: 펀딩자 포함 + 추가 계정들
            const allParticipants: typeof allWallets = [];

            // 먼저 펀딩자 추가
            for (const funder of funders) {
                if (!allParticipants.find((p: typeof allWallets[0]) => p.account.address.toLowerCase() === funder.account.address.toLowerCase())) {
                    allParticipants.push(funder);
                }
            }

            // 나머지 참여자 추가 (10명이 될 때까지)
            // FeeCollector는 제외 (댓글 작성하면 안 됨)
            for (const wallet of allWallets) {
                if (allParticipants.length >= 10) break;
                // FeeCollector 제외
                if (wallet.account.address.toLowerCase() === feeCollector.account.address.toLowerCase()) {
                    continue;
                }
                if (!allParticipants.find((p: typeof allWallets[0]) => p.account.address.toLowerCase() === wallet.account.address.toLowerCase())) {
                    allParticipants.push(wallet);
                }
            }

            // 10명이 안 되면 에러
            if (allParticipants.length < 10) {
                throw new Error(`Not enough accounts: need 10, got ${allParticipants.length}`);
            }

            const cost = parseEther("10");
            const timer = 600n; // 10분
            const initialFunding = parseEther("1000"); // 초기 펀딩

            // 모든 참여자에게 토큰 분배
            const mintAmount = parseEther("100000"); // 충분한 토큰
            for (const participant of allParticipants) {
                await token.write.mint([participant.account.address, mintAmount]);
            }

            // 게임 생성 (초기 펀딩)
            let hash = await token.write.approve([
                gameContract.address,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            hash = await gameContract.write.createGame([
                token.address,
                timer,
                cost,
                initialFunding,
            ]);
            await publicClient.waitForTransactionReceipt({ hash });

            const gameId = 1n;

            // 추가 펀딩 (나머지 3명)
            const additionalFundings = [
                parseEther("2000"),
                parseEther("3000"),
                parseEther("4000"),
            ];

            for (let i = 0; i < 3; i++) {
                const funder = funders[i + 1]; // user1, user2, user3
                const tokenAsFunder = await conn.viem.getContractAt(
                    "MockERC20",
                    token.address,
                    { client: { wallet: funder } }
                );
                hash = await tokenAsFunder.write.approve([
                    gameContract.address,
                    additionalFundings[i],
                ]);
                await publicClient.waitForTransactionReceipt({ hash });

                const gameContractAsFunder = await conn.viem.getContractAt(
                    "CommentGameV2",
                    gameContract.address,
                    { client: { wallet: funder } }
                );
                hash = await gameContractAsFunder.write.fundPrizePool([
                    gameId,
                    additionalFundings[i],
                ]);
                await publicClient.waitForTransactionReceipt({ hash });
            }

            // 게임 정보 확인 (펀딩 후)
            const gameInfoAfterFunding = await gameContract.read.getGameInfo([gameId]);
            const totalFunding = gameInfoAfterFunding.totalFunding;
            const initialEndTime = gameInfoAfterFunding.endTime;

            // 초기 블록 타임스탬프 확인
            const initialBlock = await publicClient.getBlock();
            const initialTimestamp = initialBlock.timestamp;

            console.log("\n=== 스트레스 테스트 시작 ===");
            console.log(`게임 ID: ${gameId}`);
            console.log(`펀딩자 수: ${funders.length}명`);
            console.log(`참여자 수: ${allParticipants.length}명`);
            console.log(`총 펀딩: ${formatEther(totalFunding)} MTK`);
            console.log(`초기 블록 타임스탬프: ${initialTimestamp}`);
            console.log(`초기 종료 시간: ${new Date(Number(initialEndTime) * 1000).toISOString()}`);
            console.log(`게임 시간: ${timer}초 (${Number(timer) / 60}분)`);
            console.log(`초기 endTime - 초기 timestamp: ${Number(initialEndTime) - Number(initialTimestamp)}초 (예상: ${timer}초)`);

            // 모든 참여자에게 토큰 승인
            for (const participant of allParticipants) {
                const tokenAsParticipant = await conn.viem.getContractAt(
                    "MockERC20",
                    token.address,
                    { client: { wallet: participant } }
                );
                hash = await tokenAsParticipant.write.approve([
                    gameContract.address,
                    parseEther("100000"), // 충분한 승인
                ]);
                await publicClient.waitForTransactionReceipt({ hash });
            }

            // 컨트랙트에서 실제 feeCollector 주소 가져오기
            const actualFeeCollectorAddress = await gameContract.read.feeCollector();
            const fixtureFeeCollectorAddress = feeCollector.account.address;

            console.log(`\n=== FeeCollector 주소 확인 ===`);
            console.log(`Fixture FeeCollector: ${fixtureFeeCollectorAddress}`);
            console.log(`컨트랙트 FeeCollector: ${actualFeeCollectorAddress}`);
            console.log(`주소 일치: ${actualFeeCollectorAddress.toLowerCase() === fixtureFeeCollectorAddress.toLowerCase()}`);

            // 댓글 작성 전 FeeCollector 밸런스 확인 (이 테스트에서만 받은 수수료 계산용)
            const feeCollectorBalanceBeforeComments = (await token.read.balanceOf([
                actualFeeCollectorAddress,
            ])) as bigint;

            // 300개 댓글 작성
            const commentCount = 300;
            let lastEndTime = initialEndTime;
            let timeExtensions = 0;

            console.log(`\n=== ${commentCount}개 댓글 작성 시작 ===`);
            console.log(`참여자 목록 (FeeCollector 제외):`);
            for (let idx = 0; idx < allParticipants.length; idx++) {
                const isFeeCollector = allParticipants[idx].account.address.toLowerCase() === feeCollector.account.address.toLowerCase();
                console.log(`  ${idx + 1}. ${allParticipants[idx].account.address} ${isFeeCollector ? '(FeeCollector - 제외해야 함!)' : ''}`);
            }

            for (let i = 0; i < commentCount; i++) {
                // 첫 번째 댓글이 아니면 댓글 작성 전에 게임 시간만큼 증가
                // 이렇게 하면 각 댓글마다 endTime이 게임 시간(600초)씩 연장됨
                // 게임이 종료되지 않도록, 현재 endTime보다 약간 작게 증가시켜야 함
                if (i > 0) {
                    const currentGameInfo = await gameContract.read.getGameInfo([gameId]);
                    const currentBlock = await publicClient.getBlock();
                    const timeUntilEnd = Number(currentGameInfo.endTime) - Number(currentBlock.timestamp);

                    // 게임이 종료되기 전에 댓글을 달 수 있도록, 게임 시간보다 약간 적게 증가
                    // 게임 시간이 600초면, 600초만큼 증가시켜도 다음 댓글 작성 시 endTime이 업데이트되므로 괜찮음
                    // 하지만 안전을 위해 게임 시간 - 1초만큼 증가
                    const increaseAmount = Number(timer) - 10; // 게임 시간 - 10초 (590초)
                    if (timeUntilEnd > increaseAmount) {
                        await connection.networkHelpers.time.increase(increaseAmount);
                    } else {
                        // 게임이 곧 종료될 것 같으면 조금만 증가
                        await connection.networkHelpers.time.increase(Math.max(1, Math.floor(timeUntilEnd / 2)));
                    }
                }

                const participant = allParticipants[i % allParticipants.length];

                // FeeCollector가 참여자 목록에 있는지 확인
                if (participant.account.address.toLowerCase() === feeCollector.account.address.toLowerCase()) {
                    throw new Error(`FeeCollector가 참여자 목록에 포함되어 있습니다! 댓글 ${i + 1}번째`);
                }
                const gameContractAsParticipant = await conn.viem.getContractAt(
                    "CommentGameV2",
                    gameContract.address,
                    { client: { wallet: participant } }
                );

                // 댓글 작성 전 게임 정보 확인
                const gameInfoBefore = await gameContract.read.getGameInfo([gameId]);
                const endTimeBefore = gameInfoBefore.endTime;

                // 현재 블록 타임스탬프 확인
                const blockBefore = await publicClient.getBlock();
                const timestampBefore = blockBefore.timestamp;

                hash = await gameContractAsParticipant.write.addComment([
                    gameId,
                    `Comment ${i + 1}`,
                ]);
                await publicClient.waitForTransactionReceipt({ hash });

                // 댓글 작성 후 게임 정보 확인
                const gameInfoAfter = await gameContract.read.getGameInfo([gameId]);
                const endTimeAfter = gameInfoAfter.endTime;

                // 블록 타임스탬프 확인
                const blockAfter = await publicClient.getBlock();
                const timestampAfter = blockAfter.timestamp;

                // 예상 endTime: 현재 블록 타임스탬프 + 게임 시간
                const expectedEndTime = timestampAfter + timer;
                const timeExtension = endTimeAfter - endTimeBefore;

                // 첫 번째와 마지막 댓글에서 상세 로그
                if (i === 0 || i === commentCount - 1) {
                    console.log(`\n=== 댓글 ${i + 1} 상세 ===`);
                    console.log(`블록 타임스탬프 (전): ${timestampBefore}`);
                    console.log(`블록 타임스탬프 (후): ${timestampAfter}`);
                    console.log(`블록 타임스탬프 증가: ${timestampAfter - timestampBefore}초`);
                    console.log(`endTime (전): ${endTimeBefore}`);
                    console.log(`endTime (후): ${endTimeAfter}`);
                    console.log(`예상 endTime: ${expectedEndTime}`);
                    console.log(`시간 연장: ${timeExtension}초 (예상: ${timer}초)`);
                }

                // 시간이 늘어났는지 확인
                if (endTimeAfter > endTimeBefore) {
                    timeExtensions++;
                    lastEndTime = endTimeAfter;
                }

                // 각 댓글마다 게임 시간만큼 시간이 연장되어야 함
                // 하지만 블록 타임스탬프가 증가하지 않으면 연장이 제대로 안 됨
                if (i === 0) {
                    // 첫 번째 댓글에서는 최소한 게임 시간만큼은 연장되어야 함
                    expect(endTimeAfter).to.be.greaterThan(endTimeBefore);
                }

                // 진행 상황 로그 (10개마다)
                if ((i + 1) % 10 === 0) {
                    console.log(`진행: ${i + 1}/${commentCount} 댓글 작성 완료`);
                }
            }

            // 모든 댓글 작성 후 FeeCollector 밸런스 확인
            const feeCollectorBalanceAfterComments = (await token.read.balanceOf([
                actualFeeCollectorAddress,
            ])) as bigint;
            const totalPlatformFeeReceived = feeCollectorBalanceAfterComments - feeCollectorBalanceBeforeComments;

            // 최종 게임 정보 확인
            const finalGameInfo = await gameContract.read.getGameInfo([gameId]);
            const finalEndTime = finalGameInfo.endTime;
            const finalBlock = await publicClient.getBlock();
            const finalTimestamp = finalBlock.timestamp;
            const timeExtension = finalEndTime - initialEndTime;
            const expectedTimeExtension = BigInt(commentCount) * timer;

            console.log(`\n=== 시간 연장 분석 ===`);
            console.log(`초기 timestamp: ${initialTimestamp}`);
            console.log(`최종 timestamp: ${finalTimestamp}`);
            console.log(`timestamp 증가: ${Number(finalTimestamp) - Number(initialTimestamp)}초`);
            console.log(`초기 endTime: ${initialEndTime}`);
            console.log(`최종 endTime: ${finalEndTime}`);
            console.log(`endTime 증가: ${Number(finalEndTime) - Number(initialEndTime)}초`);
            console.log(`최종 endTime - 최종 timestamp: ${Number(finalEndTime) - Number(finalTimestamp)}초 (예상: ${timer}초)`);

            console.log(`\n=== 스트레스 테스트 결과 ===`);
            console.log(`총 댓글 수: ${commentCount}개`);
            console.log(`시간 연장 횟수: ${timeExtensions}회`);
            console.log(`초기 종료 시간: ${new Date(Number(initialEndTime) * 1000).toISOString()}`);
            console.log(`최종 종료 시간: ${new Date(Number(finalEndTime) * 1000).toISOString()}`);
            console.log(`총 시간 연장: ${Number(timeExtension)}초 (${Number(timeExtension) / 60}분)`);
            console.log(`예상 시간 연장: ${Number(expectedTimeExtension)}초 (${Number(expectedTimeExtension) / 60}분)`);
            console.log(`최종 상금 풀: ${formatEther(finalGameInfo.prizePool)} MTK`);
            console.log(`최종 총 펀딩: ${formatEther(finalGameInfo.totalFunding)} MTK`);
            console.log(`마지막 댓글 작성자: ${finalGameInfo.lastCommentor}`);

            // 검증
            expect(timeExtensions).to.equal(commentCount); // 모든 댓글이 시간을 연장해야 함
            expect(finalEndTime).to.be.greaterThan(initialEndTime); // 시간이 늘어났어야 함
            expect(finalGameInfo.prizePool).to.equal(totalFunding); // 상금 풀은 펀딩 금액과 동일해야 함
            expect(finalGameInfo.totalFunding).to.equal(totalFunding); // 총 펀딩은 변하지 않아야 함

            // 펀딩자들의 최종 밸런스 확인 (수수료 분배 확인)
            console.log(`\n=== 펀딩자 수수료 분배 확인 ===`);
            const funderBalances: { address: string; balance: bigint; funding: bigint }[] = [];

            for (const funder of funders) {
                const balance = (await token.read.balanceOf([
                    funder.account.address,
                ])) as bigint;
                const fundings = await gameContract.read.getFunders([gameId]);
                const fundingIndex = fundings.findIndex(
                    (addr: string) => addr.toLowerCase() === funder.account.address.toLowerCase()
                );

                if (fundingIndex >= 0) {
                    // 펀딩 금액 확인 (간접적으로)
                    funderBalances.push({
                        address: funder.account.address,
                        balance,
                        funding: 0n, // 정확한 펀딩 금액은 별도로 조회 필요
                    });
                    console.log(`펀딩자 ${funder.account.address.slice(0, 10)}... 밸런스: ${formatEther(balance)} MTK`);
                }
            }

            // 총 댓글 수수료 계산
            const totalCommentFees = cost * BigInt(commentCount);
            const totalPlatformFee = (totalCommentFees * 2n) / 100n;
            const totalDistributedToFunders = totalCommentFees - totalPlatformFee;

            console.log(`\n총 댓글 수수료: ${formatEther(totalCommentFees)} MTK`);
            console.log(`플랫폼 수수료 (2%): ${formatEther(totalPlatformFee)} MTK`);
            console.log(`펀딩자 분배 금액 (98%): ${formatEther(totalDistributedToFunders)} MTK`);

            // FeeCollector가 실제로 받은 수수료 확인
            console.log(`\n=== FeeCollector 수수료 확인 ===`);
            console.log(`FeeCollector 댓글 작성 전 밸런스: ${formatEther(feeCollectorBalanceBeforeComments)} MTK`);
            console.log(`FeeCollector 댓글 작성 후 밸런스: ${formatEther(feeCollectorBalanceAfterComments)} MTK`);
            console.log(`FeeCollector 실제로 받은 수수료: ${formatEther(totalPlatformFeeReceived)} MTK`);
            console.log(`FeeCollector 수수료 (예상): ${formatEther(totalPlatformFee)} MTK`);

            // FeeCollector가 정확한 수수료를 받았는지 확인 (반올림 오류 허용)
            // 댓글 작성으로 인한 변화량이 예상 수수료와 일치해야 함
            expect(totalPlatformFeeReceived >= totalPlatformFee - parseEther("0.01")).to.be.true;
            expect(totalPlatformFeeReceived <= totalPlatformFee + parseEther("0.01")).to.be.true;
        });
    });
});

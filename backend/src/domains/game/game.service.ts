import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { EthereumProvider } from 'src/common/providers';
import { Result } from 'src/common/types';
import { CommentRepository } from '../comment/comment.repository';
import { WinnersService } from '../winners/winners.service';
import { GameRepository } from './game.repository';

// V2 컨트랙트 이벤트 시그니처
const PRIZE_CLAIMED_EVENT =
    'event PrizeClaimed(uint256 indexed gameId, address indexed winner, uint256 prizeAmount, uint256 timestamp)';

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);
    private prizeClaimedIface: ethers.Interface;
    private readonly contractAddress: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly ethereumProvider: EthereumProvider,
        private readonly gameRepository: GameRepository,
        private readonly winnersService: WinnersService,
        private readonly commentRepository: CommentRepository,
    ) {
        this.prizeClaimedIface = new ethers.Interface([PRIZE_CLAIMED_EVENT]);
        this.contractAddress =
            this.configService.get<string>('COMMENT_GAME_V2_ADDRESS') || '';
    }

    /**
     * 트랜잭션 영수증에서 PrizeClaimed 이벤트를 파싱하고 DB 업데이트
     * @param txHash 트랜잭션 해시
     * @param gameId 게임 ID (V2에서는 단일 컨트랙트 + gameId 방식)
     * @returns 성공 여부
     */
    async processPrizeClaimedTransaction(
        txHash: string,
        gameId: string,
    ): Promise<boolean> {
        try {
            const receipt =
                await this.ethereumProvider.getTransactionReceipt(txHash);

            if (!receipt) {
                this.logger.warn(`트랜잭션 영수증 없음: ${txHash}`);
                return false;
            }

            if (receipt.status === 0) {
                this.logger.warn(`트랜잭션 실패 (revert): ${txHash}`);
                return false;
            }

            // PrizeClaimed 이벤트 찾기 (V2: 단일 컨트랙트 주소 사용)
            const prizeClaimedTopic =
                this.prizeClaimedIface.getEvent('PrizeClaimed')?.topicHash;

            const prizeClaimedLog = receipt.logs.find(
                (log) =>
                    log.topics[0] === prizeClaimedTopic &&
                    log.address.toLowerCase() ===
                        this.contractAddress.toLowerCase(),
            );

            if (!prizeClaimedLog) {
                this.logger.warn(
                    `PrizeClaimed 이벤트 없음: ${txHash}, gameId: ${gameId}`,
                );
                return false;
            }

            // 이벤트 디코딩
            // V2: event PrizeClaimed(uint256 indexed gameId, address indexed winner, uint256 prizeAmount, uint256 timestamp)
            const decoded = this.prizeClaimedIface.decodeEventLog(
                'PrizeClaimed',
                prizeClaimedLog.data,
                prizeClaimedLog.topics,
            );

            const rawEvent = decoded.toObject();
            const eventGameId = rawEvent.gameId.toString();
            const winner = rawEvent.winner as string;
            const prizeAmount = rawEvent.prizeAmount.toString();
            const timestamp = Number(rawEvent.timestamp);

            this.logger.log(
                `🏆 PrizeClaimed 확인: gameId=${eventGameId}, winner=${winner}, prize=${prizeAmount}`,
            );

            // gameId 검증
            if (eventGameId !== gameId) {
                this.logger.warn(
                    `gameId 불일치: 요청=${gameId}, 이벤트=${eventGameId}`,
                );
                return false;
            }

            // 1. 게임 정보 조회 (tokenSymbol, gameToken 획득)
            const game = await this.gameRepository.findFullByGameId(gameId);
            if (!game) {
                this.logger.warn(`게임 정보 없음: gameId=${gameId}`);
                return false;
            }

            // 2. Winner 레코드 생성
            await this.winnersService.createWinner({
                walletAddress: winner,
                gameId: gameId,
                prize: prizeAmount,
                tokenSymbol: game.tokenSymbol || 'UNKNOWN',
                tokenAddress: game.gameToken,
                claimTxHash: txHash,
                claimedAt: new Date(timestamp * 1000),
            });

            this.logger.log(`✅ Winner 레코드 생성 완료: ${winner}`);

            // 3. 게임 상태 업데이트 (isClaimed = true)
            await this.gameRepository.updateGameState(gameId, {
                isClaimed: true,
            });

            this.logger.log(`✅ 게임 상금 수령 완료 처리: gameId=${gameId}`);
            return true;
        } catch (error) {
            this.logger.error(
                `PrizeClaimed 처리 실패: ${error.message}`,
                error.stack,
            );
            return false;
        }
    }

    /**
     * @description 프론트엔드에서 전송한 게임 데이터를 저장
     */
    async createGame(data: unknown): Promise<Result<{ gameAddress: string }>> {
        try {
            const result = await this.gameRepository.createFromFrontend(data);

            if (!result) {
                return Result.fail('게임 저장에 실패했습니다.');
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Create game failed: ${error.message}`);
            return Result.fail('게임 저장에 실패했습니다.');
        }
    }

    /**
     * @description 블록체인에서 조회한 게임 데이터를 등록 (txHash 없음)
     */
    async registerGame(data: unknown): Promise<Result<{ gameId: string }>> {
        try {
            const result =
                await this.gameRepository.registerFromBlockchain(data);

            if (!result) {
                return Result.fail('게임 등록에 실패했습니다.');
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Register game failed: ${error.message}`);
            return Result.fail('게임 등록에 실패했습니다.');
        }
    }

    /**
     * @description 사용자가 참여 중인 활성 게임 목록 조회
     */
    async getGamesInPlaying(walletAddress: string) {
        // 1. 사용자가 댓글을 단 게임 ID 목록 조회
        const gameIds =
            await this.commentRepository.findGameIdsByWalletAddress(
                walletAddress,
            );

        if (gameIds.length === 0) {
            return [];
        }

        // 2. 해당 게임들 중 활성 상태인 게임 정보 조회
        const games = await this.gameRepository.findActiveGamesByIds(gameIds);

        // 3. 응답 형식에 맞게 변환
        return games.map((game) => ({
            gameId: game.gameId,
            tokenImageUrl: game.tokenImageUrl,
            tokenSymbol: game.tokenSymbol,
            currentPrizePool: game.prizePool,
            endTime: game.endTime,
        }));
    }
}

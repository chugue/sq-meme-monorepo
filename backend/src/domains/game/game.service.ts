import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { EthereumProvider } from 'src/common/providers';
import { Result } from 'src/common/types';
import { CommentRepository } from '../comment/comment.repository';
import { FundersRepository } from '../funders/funders.repository';
import { TokenRepository } from '../token/token.repository';
import { WinnersService } from '../winners/winners.service';
import { ActiveGameDto } from './dto/game.dto';
import { GameRepository } from './game.repository';

// V2 컨트랙트 이벤트 시그니처
const PRIZE_CLAIMED_EVENT =
    'event PrizeClaimed(uint256 indexed gameId, address indexed winner, uint256 prizeAmount, uint256 timestamp)';

const GAME_CREATED_EVENT =
    'event GameCreated(uint256 indexed gameId, address indexed initiator, address indexed gameToken, uint256 cost, uint256 gameTime, string tokenSymbol, uint256 endTime, address lastCommentor, uint256 totalFunding)';

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);
    private prizeClaimedIface: ethers.Interface;
    private gameCreatedIface: ethers.Interface;
    private readonly contractAddress: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly ethereumProvider: EthereumProvider,
        private readonly gameRepository: GameRepository,
        private readonly winnersService: WinnersService,
        private readonly commentRepository: CommentRepository,
        private readonly fundersRepository: FundersRepository,
        private readonly tokenRepository: TokenRepository,
    ) {
        this.prizeClaimedIface = new ethers.Interface([PRIZE_CLAIMED_EVENT]);
        this.gameCreatedIface = new ethers.Interface([GAME_CREATED_EVENT]);
        this.contractAddress =
            this.configService.get<string>('COMMENT_GAME_V2_ADDRESS') || '';
    }

    /**
     * 트랜잭션 영수증에서 PrizeClaimed 이벤트를 파싱하고 DB 업데이트
     * @param txHash 트랜잭션 해시
     * @param gameId 게임 ID (V2에서는 단일 컨트랙트 + gameId 방식)
     */
    async processPrizeClaimedTransaction(
        txHash: string,
        gameId: string,
    ): Promise<Result<{ message: string }>> {
        try {
            const receipt =
                await this.ethereumProvider.getTransactionReceipt(txHash);

            if (!receipt) {
                this.logger.warn(`트랜잭션 영수증 없음: ${txHash}`);
                return Result.fail(
                    '트랜잭션 영수증을 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
            }

            if (receipt.status === 0) {
                this.logger.warn(`트랜잭션 실패 (revert): ${txHash}`);
                return Result.fail(
                    '트랜잭션이 실패했습니다.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
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
                return Result.fail(
                    'PrizeClaimed 이벤트를 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
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
                return Result.fail(
                    'gameId가 일치하지 않습니다.',
                    HttpStatus.BAD_REQUEST,
                );
            }

            // 1. 게임 정보 조회 (tokenSymbol, gameToken 획득 + 중복 체크)
            const game = await this.gameRepository.findFullByGameId(gameId);
            if (!game) {
                this.logger.warn(`게임 정보 없음: gameId=${gameId}`);
                return Result.fail(
                    '게임 정보를 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
            }

            // 이미 처리된 요청이면 early return (중복 방지)
            if (game.isClaimed) {
                this.logger.warn(`이미 상금 수령 처리됨: gameId=${gameId}`);
                return Result.ok({ message: '이미 상금 수령 처리되었습니다.' });
            }

            // 2. 게임 상태 업데이트 - 먼저 처리하여 중복 요청 방지
            await this.gameRepository.updateGameState(gameId, {
                isClaimed: true,
                isEnded: true,
            });

            // 3. Winner 레코드 생성
            const winnerResult = await this.winnersService.createWinner({
                walletAddress: winner,
                gameId: gameId,
                prize: prizeAmount,
                tokenSymbol: game.tokenSymbol || 'UNKNOWN',
                tokenAddress: game.gameToken,
                claimTxHash: txHash,
                claimedAt: new Date(timestamp * 1000),
            });

            if (!winnerResult.success) {
                this.logger.error(
                    `Winner 생성 실패: ${winnerResult.errorMessage}`,
                );
            }

            this.logger.log(
                `✅ 게임 상금 수령 완료: gameId=${gameId}, winner=${winner}`,
            );
            return Result.ok({ message: '상금 수령 처리 완료' });
        } catch (error) {
            this.logger.error(
                `PrizeClaimed 처리 실패: ${error.message}`,
                error.stack,
            );
            return Result.fail(
                '상금 수령 처리에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description txHash로 GameCreated 이벤트를 파싱하여 게임 생성
     * @param txHash 트랜잭션 해시
     */
    async createGameByTx(txHash: string): Promise<Result<{ gameId: string }>> {
        const receipt =
            await this.ethereumProvider.getTransactionReceipt(txHash);

        if (!receipt) {
            this.logger.warn(`트랜잭션 영수증 없음: ${txHash}`);
            return Result.fail(
                '트랜잭션 영수증을 찾을 수 없습니다.',
                HttpStatus.NOT_FOUND,
            );
        }

        if (receipt.status === 0) {
            this.logger.warn(`트랜잭션 실패 (revert): ${txHash}`);
            return Result.fail(
                '트랜잭션이 실패했습니다.',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        // GameCreated 이벤트 찾기
        const gameCreatedTopic =
            this.gameCreatedIface.getEvent('GameCreated')?.topicHash;

        const gameCreatedLog = receipt.logs.find(
            (log) =>
                log.topics[0] === gameCreatedTopic &&
                log.address.toLowerCase() ===
                    this.contractAddress.toLowerCase(),
        );

        if (!gameCreatedLog) {
            // 디버깅: 어떤 로그가 있는지 출력
            this.logger.warn(`GameCreated 이벤트 없음: ${txHash}`);
            this.logger.warn(`조회 조건 - topic: ${gameCreatedTopic}`);
            this.logger.warn(
                `조회 조건 - contractAddress: ${this.contractAddress}`,
            );
            this.logger.warn(`receipt.logs 개수: ${receipt.logs.length}`);
            receipt.logs.forEach((log, idx) => {
                this.logger.warn(
                    `  log[${idx}]: address=${log.address}, topic0=${log.topics[0]}`,
                );
            });
            return Result.fail(
                'GameCreated 이벤트를 찾을 수 없습니다.',
                HttpStatus.NOT_FOUND,
            );
        }

        // 이벤트 디코딩
        const decoded = this.gameCreatedIface.decodeEventLog(
            'GameCreated',
            gameCreatedLog.data,
            gameCreatedLog.topics,
        );

        const rawEvent = decoded.toObject();

        const gameId = rawEvent.gameId.toString();
        const initiator = rawEvent.initiator as string;
        const gameToken = rawEvent.gameToken as string;
        const cost = rawEvent.cost.toString();
        const gameTime = rawEvent.gameTime.toString();
        const tokenSymbol = rawEvent.tokenSymbol as string;
        const endTime = rawEvent.endTime.toString();
        const lastCommentor = rawEvent.lastCommentor as string;
        const totalFunding = rawEvent.totalFunding.toString();

        this.logger.log(
            `🎮 GameCreated 확인: gameId=${gameId}, token=${tokenSymbol}, initiator=${initiator}`,
        );

        // DB에 게임 저장
        const result = await this.gameRepository.createFromTx({
            txHash,
            gameId,
            initiator,
            gameToken,
            cost,
            gameTime,
            tokenSymbol,
            endTime,
            lastCommentor,
            totalFunding,
        });

        if (!result) {
            return Result.fail(
                '게임 저장에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        // 초기 펀더 저장 (initiator가 첫 번째 펀더)
        if (totalFunding && totalFunding !== '0') {
            await this.fundersRepository.create({
                gameId,
                funderAddress: initiator,
                totalFunding,
                txHash,
            });
            this.logger.log(
                `✅ 초기 펀더 저장: gameId=${gameId}, funder=${initiator}, totalFunding=${totalFunding}`,
            );
        }

        return Result.ok(result);
    }

    /**
     * @description 프론트엔드에서 전송한 게임 데이터를 저장
     */
    async createGame(data: unknown): Promise<Result<{ gameId: string }>> {
        const result = await this.gameRepository.createFromFrontend(data);

        if (!result) {
            return Result.fail(
                '게임 저장에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return Result.ok(result);
    }

    /**
     * @description 블록체인에서 조회한 게임 데이터를 등록 (txHash 없음)
     */
    async registerGame(data: unknown): Promise<Result<{ gameId: string }>> {
        const result = await this.gameRepository.registerFromBlockchain(data);

        if (!result) {
            return Result.fail(
                '게임 등록에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return Result.ok(result);
    }

    /**
     * @description 토큰 주소로 게임 조회
     */
    async getGameByToken(tokenAddress: string) {
        return this.gameRepository.findByTokenAddress(tokenAddress);
    }

    /**
     * @description 토큰 주소로 활성 게임 조회 (isEnded = false)
     */
    async getActiveGameByToken(tokenAddress: string) {
        return this.gameRepository.findActiveByTokenAddress(tokenAddress);
    }

    /**
     * @description gameId로 게임 정보 조회 (클라이언트에서 endTime 비교)
     */
    async getActiveGameById(gameId: string) {
        const game = await this.gameRepository.findFullByGameId(gameId);
        if (!game) {
            return Result.fail(
                '게임을 찾을 수 없습니다.',
                HttpStatus.NOT_FOUND,
            );
        }

        return Result.ok({
            gameId: game.gameId,
            endTime: game.endTime,
            isClaimed: game.isClaimed,
        });
    }

    /**
     * @description 현재 진행 중인 전체 활성 게임 목록 조회
     */
    async getLiveGames(): Promise<Result<ActiveGameDto[]>> {
        // 1. 활성 게임 목록 조회
        const games = await this.gameRepository.findAllActiveGames();

        if (games.length === 0) {
            return Result.ok([]);
        }

        // 2. 토큰 정보 조회
        const tokenAddresses = games.map((g) => g.tokenAddress);
        const tokens =
            await this.tokenRepository.findByTokenAddresses(tokenAddresses);
        const tokenMap = new Map(
            tokens.map((t) => [t.tokenAddress.toLowerCase(), t]),
        );

        // 3. 게임 + 토큰 정보 매핑
        const result: ActiveGameDto[] = games.map((game) => {
            const token = tokenMap.get(game.tokenAddress.toLowerCase());
            return {
                ...game,
                tokenUsername: token?.tokenUsername,
                tokenUsertag: token?.tokenUsertag,
                tokenImageUrl: token?.tokenImageUrl,
                tokenSymbol: token?.tokenSymbol,
            };
        });

        return Result.ok(result);
    }

    /**
     * @description 사용자가 참여 중인 활성 게임 목록 조회
     */
    async getGamesInPlaying(
        walletAddress: string,
    ): Promise<Result<ActiveGameDto[]>> {
        // 1. 사용자가 댓글을 단 활성 게임 목록 조회 (isEnded=false, isClaimed=false)
        const games =
            await this.commentRepository.findActiveGamesByWalletAddress(
                walletAddress,
            );

        if (games.length === 0) {
            return Result.ok([]);
        }

        // 2. 토큰 정보 조회
        const tokenAddresses = games.map((g) => g.tokenAddress);
        const tokens =
            await this.tokenRepository.findByTokenAddresses(tokenAddresses);
        const tokenMap = new Map(
            tokens.map((t) => [t.tokenAddress.toLowerCase(), t]),
        );

        // 3. 게임 + 토큰 정보 매핑
        const result: ActiveGameDto[] = games.map((game) => {
            const token = tokenMap.get(game.tokenAddress.toLowerCase());
            return {
                ...game,
                tokenUsername: token?.tokenUsername ?? null,
                tokenUsertag: token?.tokenUsertag ?? null,
                tokenImageUrl: token?.tokenImageUrl ?? null,
                tokenSymbol: token?.tokenSymbol ?? null,
            };
        });

        return Result.ok(result);
    }
}

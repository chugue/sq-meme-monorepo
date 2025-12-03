import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { GameController } from '../src/domains/game/game.controller';
import { GameRepository } from '../src/domains/game/game.repository';
import { GameService } from '../src/domains/game/game.service';

describe('GameController (e2e)', () => {
    let app: INestApplication<App>;

    const mockGameRepository = {
        findByTokenAddress: jest.fn(),
        findActiveByTokenAddress: jest.fn(),
    };

    const mockGameService = {
        createGame: jest.fn(),
        registerGame: jest.fn(),
        processPrizeClaimedTransaction: jest.fn(),
        getGamesInPlaying: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [GameController],
            providers: [
                {
                    provide: GameRepository,
                    useValue: mockGameRepository,
                },
                {
                    provide: GameService,
                    useValue: mockGameService,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
            }),
        );
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /v1/games/in-playing', () => {
        const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

        it('should return games in playing for user', async () => {
            const mockGames = [
                {
                    gameId: '1',
                    tokenImageUrl: 'https://example.com/token.png',
                    tokenSymbol: 'MTK',
                    currentPrizePool: '1000000000000000000',
                    endTime: new Date('2025-12-31T23:59:59Z'),
                },
                {
                    gameId: '2',
                    tokenImageUrl: null,
                    tokenSymbol: 'TEST',
                    currentPrizePool: '500000000000000000',
                    endTime: new Date('2025-12-30T12:00:00Z'),
                },
            ];

            mockGameService.getGamesInPlaying.mockResolvedValue(mockGames);

            const response = await request(app.getHttpServer())
                .get('/v1/games/in-playing')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual([
                {
                    gameId: '1',
                    tokenImageUrl: 'https://example.com/token.png',
                    tokenSymbol: 'MTK',
                    currentPrizePool: '1000000000000000000',
                    endTime: '2025-12-31T23:59:59.000Z',
                },
                {
                    gameId: '2',
                    tokenImageUrl: null,
                    tokenSymbol: 'TEST',
                    currentPrizePool: '500000000000000000',
                    endTime: '2025-12-30T12:00:00.000Z',
                },
            ]);

            expect(mockGameService.getGamesInPlaying).toHaveBeenCalledWith(
                userAddress,
            );
        });

        it('should return empty array when user has no games', async () => {
            mockGameService.getGamesInPlaying.mockResolvedValue([]);

            const response = await request(app.getHttpServer())
                .get('/v1/games/in-playing')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual([]);
        });

        it('should return 400 when wallet address header is missing', async () => {
            await request(app.getHttpServer())
                .get('/v1/games/in-playing')
                .expect(400);
        });
    });
});

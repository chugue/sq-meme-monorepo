import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { WinnersController } from '../src/domains/winners/winners.controller';
import { WinnersService } from '../src/domains/winners/winners.service';

describe('WinnersController (e2e)', () => {
    let app: INestApplication<App>;

    const mockWinners = [
        {
            id: 1,
            walletAddress: '0x1234567890123456789012345678901234567890',
            gameId: '1',
            prize: '10000000000000000000',
            tokenSymbol: 'MTK',
            tokenAddress: '0xabc1234567890123456789012345678901234567',
            claimTxHash: '0xdef1111111111111111111111111111111111111111111111111111111111111',
            claimedAt: new Date('2025-12-01'),
            createdAt: new Date('2025-12-01'),
        },
        {
            id: 2,
            walletAddress: '0x2345678901234567890123456789012345678901',
            gameId: '2',
            prize: '8000000000000000000',
            tokenSymbol: 'MTK',
            tokenAddress: '0xabc1234567890123456789012345678901234567',
            claimTxHash: '0xdef2222222222222222222222222222222222222222222222222222222222222',
            claimedAt: new Date('2025-12-02'),
            createdAt: new Date('2025-12-02'),
        },
        {
            id: 3,
            walletAddress: '0x1234567890123456789012345678901234567890',
            gameId: '3',
            prize: '5000000000000000000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000',
            claimTxHash: '0xdef3333333333333333333333333333333333333333333333333333333333333',
            claimedAt: new Date('2025-12-03'),
            createdAt: new Date('2025-12-03'),
        },
    ];

    const mockWinnersService = {
        getTopWinners: jest.fn(),
        getWinnersByWallet: jest.fn(),
        createWinner: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [WinnersController],
            providers: [
                {
                    provide: WinnersService,
                    useValue: mockWinnersService,
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

    describe('GET /v1/winners/top', () => {
        it('should return top winners with default limit', async () => {
            mockWinnersService.getTopWinners.mockResolvedValue(mockWinners);

            const response = await request(app.getHttpServer())
                .get('/v1/winners/top')
                .expect(200);

            expect(response.body).toHaveLength(3);
            expect(response.body[0]).toHaveProperty('walletAddress');
            expect(response.body[0]).toHaveProperty('prize');
            expect(response.body[0]).toHaveProperty('tokenSymbol');
            expect(mockWinnersService.getTopWinners).toHaveBeenCalledWith(10);
        });

        it('should return top winners with custom limit', async () => {
            mockWinnersService.getTopWinners.mockResolvedValue([mockWinners[0]]);

            const response = await request(app.getHttpServer())
                .get('/v1/winners/top?limit=1')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(mockWinnersService.getTopWinners).toHaveBeenCalledWith(1);
        });

        it('should return empty array when no winners', async () => {
            mockWinnersService.getTopWinners.mockResolvedValue([]);

            const response = await request(app.getHttpServer())
                .get('/v1/winners/top')
                .expect(200);

            expect(response.body).toEqual([]);
        });

        it('should handle large limit values', async () => {
            mockWinnersService.getTopWinners.mockResolvedValue(mockWinners);

            const response = await request(app.getHttpServer())
                .get('/v1/winners/top?limit=100')
                .expect(200);

            expect(mockWinnersService.getTopWinners).toHaveBeenCalledWith(100);
        });
    });

    describe('GET /v1/winners/by-wallet/:walletAddress', () => {
        const testWalletAddress = '0x1234567890123456789012345678901234567890';

        it('should return winners for a specific wallet', async () => {
            const walletWinners = mockWinners.filter(
                (w) => w.walletAddress === testWalletAddress,
            );
            mockWinnersService.getWinnersByWallet.mockResolvedValue(walletWinners);

            const response = await request(app.getHttpServer())
                .get(`/v1/winners/by-wallet/${testWalletAddress}`)
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0].walletAddress).toBe(testWalletAddress);
            expect(response.body[1].walletAddress).toBe(testWalletAddress);
            expect(mockWinnersService.getWinnersByWallet).toHaveBeenCalledWith(
                testWalletAddress,
            );
        });

        it('should return empty array for wallet with no wins', async () => {
            const unknownWallet = '0x9999999999999999999999999999999999999999';
            mockWinnersService.getWinnersByWallet.mockResolvedValue([]);

            const response = await request(app.getHttpServer())
                .get(`/v1/winners/by-wallet/${unknownWallet}`)
                .expect(200);

            expect(response.body).toEqual([]);
            expect(mockWinnersService.getWinnersByWallet).toHaveBeenCalledWith(
                unknownWallet,
            );
        });

        it('should handle lowercase wallet address', async () => {
            const lowerCaseWallet = testWalletAddress.toLowerCase();
            mockWinnersService.getWinnersByWallet.mockResolvedValue([mockWinners[0]]);

            await request(app.getHttpServer())
                .get(`/v1/winners/by-wallet/${lowerCaseWallet}`)
                .expect(200);

            expect(mockWinnersService.getWinnersByWallet).toHaveBeenCalledWith(
                lowerCaseWallet,
            );
        });

        it('should return winner with all expected fields', async () => {
            mockWinnersService.getWinnersByWallet.mockResolvedValue([mockWinners[0]]);

            const response = await request(app.getHttpServer())
                .get(`/v1/winners/by-wallet/${testWalletAddress}`)
                .expect(200);

            const winner = response.body[0];
            expect(winner).toHaveProperty('id');
            expect(winner).toHaveProperty('walletAddress');
            expect(winner).toHaveProperty('gameId');
            expect(winner).toHaveProperty('prize');
            expect(winner).toHaveProperty('tokenSymbol');
            expect(winner).toHaveProperty('tokenAddress');
            expect(winner).toHaveProperty('claimTxHash');
            expect(winner).toHaveProperty('claimedAt');
            expect(winner).toHaveProperty('createdAt');
        });
    });
});

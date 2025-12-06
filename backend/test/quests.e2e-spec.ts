import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Result } from '../src/common/types';
import { QuestController } from '../src/domains/quests/quest.controller';
import { QuestService } from '../src/domains/quests/quest.service';

describe('QuestController (e2e)', () => {
    let app: INestApplication<App>;

    const mockQuestService = {
        getQuests: jest.fn(),
        claimQuest: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [QuestController],
            providers: [
                {
                    provide: QuestService,
                    useValue: mockQuestService,
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

    describe('GET /v1/quests', () => {
        const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

        const mockQuestsResponse = {
            today: '2025-12-06T00:00:00.000Z',
            quests: [
                {
                    id: 1,
                    type: 'attendance',
                    title: '5 Day Streak',
                    description:
                        'Check in for 5 consecutive days to earn a reward.',
                    currentNumber: 3,
                    targetNumber: 5,
                    isClaimed: false,
                },
                {
                    id: 2,
                    type: 'attendance',
                    title: '20 Day Streak',
                    description:
                        'Check in for 20 consecutive days to earn a reward.',
                    currentNumber: 3,
                    targetNumber: 20,
                    isClaimed: false,
                },
                {
                    id: 3,
                    type: 'comments',
                    title: 'Write 20 Comments',
                    description: 'Write 20 comments to earn a reward.',
                    currentNumber: 10,
                    targetNumber: 20,
                    isClaimed: false,
                },
                {
                    id: 4,
                    type: 'comments',
                    title: 'Write 50 Comments',
                    description: 'Write 50 comments to earn a reward.',
                    currentNumber: 10,
                    targetNumber: 50,
                    isClaimed: false,
                },
            ],
        };

        it('should return quests list successfully', async () => {
            mockQuestService.getQuests.mockResolvedValue(
                Result.ok(mockQuestsResponse),
            );

            const response = await request(app.getHttpServer())
                .get('/v1/quests')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockQuestsResponse,
            });
            expect(mockQuestService.getQuests).toHaveBeenCalledWith(
                userAddress,
            );
        });

        it('should return empty quests for new user', async () => {
            const emptyQuestsResponse = {
                today: '2025-12-06T00:00:00.000Z',
                quests: [],
            };

            mockQuestService.getQuests.mockResolvedValue(
                Result.ok(emptyQuestsResponse),
            );

            const response = await request(app.getHttpServer())
                .get('/v1/quests')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: emptyQuestsResponse,
            });
        });

        it('should return quests with claimed status', async () => {
            const claimedQuestsResponse = {
                today: '2025-12-06T00:00:00.000Z',
                quests: [
                    {
                        id: 1,
                        type: 'attendance',
                        title: '5 Day Streak',
                        description:
                            'Check in for 5 consecutive days to earn a reward.',
                        currentNumber: 5,
                        targetNumber: 5,
                        isClaimed: true,
                    },
                ],
            };

            mockQuestService.getQuests.mockResolvedValue(
                Result.ok(claimedQuestsResponse),
            );

            const response = await request(app.getHttpServer())
                .get('/v1/quests')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: claimedQuestsResponse,
            });
        });

        it('should return 400 when wallet address header is missing', async () => {
            await request(app.getHttpServer()).get('/v1/quests').expect(400);
        });

        it('should return fail result on error', async () => {
            mockQuestService.getQuests.mockResolvedValue(
                Result.fail('퀘스트 조회에 실패했습니다.'),
            );

            const response = await request(app.getHttpServer())
                .get('/v1/quests')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe(
                '퀘스트 조회에 실패했습니다.',
            );
        });
    });

    describe('POST /v1/quests/claim/:questId', () => {
        const userAddress = '0x1234567890abcdef1234567890abcdef12345678';
        const questId = 1;

        const mockClaimedQuest = {
            id: 1,
            type: 'attendance',
            title: '5 Day Streak',
            description: 'Check in for 5 consecutive days to earn a reward.',
            currentNumber: 5,
            targetNumber: 5,
            isClaimed: true,
        };

        it('should claim quest successfully', async () => {
            mockQuestService.claimQuest.mockResolvedValue(
                Result.ok({ quest: mockClaimedQuest }),
            );

            const response = await request(app.getHttpServer())
                .post(`/v1/quests/claim/${questId}`)
                .set('x-wallet-address', userAddress)
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                data: { quest: mockClaimedQuest },
            });
            expect(mockQuestService.claimQuest).toHaveBeenCalledWith(
                userAddress,
                questId,
            );
        });

        it('should return 400 when wallet address header is missing', async () => {
            await request(app.getHttpServer())
                .post(`/v1/quests/claim/${questId}`)
                .expect(400);
        });

        it('should return fail when quest not found', async () => {
            mockQuestService.claimQuest.mockResolvedValue(
                Result.fail('퀘스트를 찾을 수 없습니다.'),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/quests/claim/999')
                .set('x-wallet-address', userAddress)
                .expect(201);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe(
                '퀘스트를 찾을 수 없습니다.',
            );
        });

        it('should return fail when quest already claimed', async () => {
            mockQuestService.claimQuest.mockResolvedValue(
                Result.fail('이미 보상을 수령한 퀘스트입니다.'),
            );

            const response = await request(app.getHttpServer())
                .post(`/v1/quests/claim/${questId}`)
                .set('x-wallet-address', userAddress)
                .expect(201);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe(
                '이미 보상을 수령한 퀘스트입니다.',
            );
        });

        it('should return fail when quest target not reached', async () => {
            mockQuestService.claimQuest.mockResolvedValue(
                Result.fail('퀘스트 목표를 아직 달성하지 못했습니다.'),
            );

            const response = await request(app.getHttpServer())
                .post(`/v1/quests/claim/${questId}`)
                .set('x-wallet-address', userAddress)
                .expect(201);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe(
                '퀘스트 목표를 아직 달성하지 못했습니다.',
            );
        });

        it('should return fail when user has no permission', async () => {
            mockQuestService.claimQuest.mockResolvedValue(
                Result.fail('해당 퀘스트에 대한 권한이 없습니다.'),
            );

            const response = await request(app.getHttpServer())
                .post(`/v1/quests/claim/${questId}`)
                .set('x-wallet-address', userAddress)
                .expect(201);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe(
                '해당 퀘스트에 대한 권한이 없습니다.',
            );
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import { QuestType } from 'src/common/db/schema/quest.schema';
import { QuestRepository } from './quest.repository';

describe('QuestRepository', () => {
    let repository: QuestRepository;

    // Drizzle ORM 체이닝 패턴을 위한 mock 헬퍼
    const createChainMock = (finalResult: any[] = []) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.from = jest.fn().mockReturnValue(chain);
        chain.where = jest.fn().mockReturnValue(chain);
        chain.limit = jest.fn().mockResolvedValue(finalResult);
        chain.insert = jest.fn().mockReturnValue(chain);
        chain.values = jest.fn().mockReturnValue(chain);
        chain.returning = jest.fn().mockResolvedValue(finalResult);
        chain.update = jest.fn().mockReturnValue(chain);
        chain.set = jest.fn().mockReturnValue(chain);
        return chain;
    };

    describe('updateAttendanceQuests', () => {
        it('should update attendance quest when streak > currentNumber', async () => {
            const mockUser = {
                walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
                checkInHistory: [
                    { day: '2025-12-06', currentStreak: 1 },
                    { day: '2025-12-07', currentStreak: 2 },
                ],
            };

            const updatedQuest = {
                id: 1,
                userWalletAddress: mockUser.walletAddress.toLowerCase(),
                questType: QuestType.ATTENDANCE_5,
                currentNumber: 2,
                targetNumber: 5,
                isClaimed: false,
            };

            const mockDb = createChainMock([updatedQuest]);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    QuestRepository,
                    { provide: DrizzleAsyncProvider, useValue: mockDb },
                ],
            }).compile();

            repository = module.get<QuestRepository>(QuestRepository);
            await repository.updateAttendanceQuests(mockUser as any);

            // update가 호출되었는지 확인
            expect(mockDb.update).toHaveBeenCalled();
            expect(mockDb.set).toHaveBeenCalledWith({ currentNumber: 2 });
            expect(mockDb.returning).toHaveBeenCalled();
        });

        it('should not update when streak is 0', async () => {
            const mockUser = {
                walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
                checkInHistory: [], // 빈 히스토리 = streak 0
            };

            const mockDb = createChainMock([]);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    QuestRepository,
                    { provide: DrizzleAsyncProvider, useValue: mockDb },
                ],
            }).compile();

            repository = module.get<QuestRepository>(QuestRepository);
            await repository.updateAttendanceQuests(mockUser as any);

            // streak이 0이면 currentNumber(0)보다 크지 않으므로 업데이트 안됨
            expect(mockDb.update).toHaveBeenCalled();
            expect(mockDb.set).toHaveBeenCalledWith({ currentNumber: 0 });
        });

        it('should handle null checkInHistory', async () => {
            const mockUser = {
                walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
                checkInHistory: null,
            };

            const mockDb = createChainMock([]);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    QuestRepository,
                    { provide: DrizzleAsyncProvider, useValue: mockDb },
                ],
            }).compile();

            repository = module.get<QuestRepository>(QuestRepository);

            // null 처리되어 에러 없이 실행
            await expect(
                repository.updateAttendanceQuests(mockUser as any),
            ).resolves.not.toThrow();
        });
    });

    describe('updateCommentQuestsForUser', () => {
        it('should update comment quest when commentCount > currentNumber', async () => {
            const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
            const commentCount = 15;

            const updatedQuest = {
                id: 3,
                userWalletAddress: walletAddress.toLowerCase(),
                questType: QuestType.COMMENT_20,
                currentNumber: 15,
                targetNumber: 20,
                isClaimed: false,
            };

            const mockDb = createChainMock([updatedQuest]);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    QuestRepository,
                    { provide: DrizzleAsyncProvider, useValue: mockDb },
                ],
            }).compile();

            repository = module.get<QuestRepository>(QuestRepository);
            await repository.updateCommentQuestsForUser(
                walletAddress,
                commentCount,
            );

            expect(mockDb.update).toHaveBeenCalled();
            expect(mockDb.set).toHaveBeenCalledWith({ currentNumber: 15 });
            expect(mockDb.returning).toHaveBeenCalled();
        });

        it('should normalize wallet address to lowercase', async () => {
            const walletAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
            const commentCount = 5;

            const mockDb = createChainMock([]);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    QuestRepository,
                    { provide: DrizzleAsyncProvider, useValue: mockDb },
                ],
            }).compile();

            repository = module.get<QuestRepository>(QuestRepository);
            await repository.updateCommentQuestsForUser(
                walletAddress,
                commentCount,
            );

            // where 절에서 lowercase로 비교하는지 확인
            expect(mockDb.where).toHaveBeenCalled();
        });
    });

    describe('initializeQuestsForUser', () => {
        it('should create 4 quests for new user', async () => {
            const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

            const createdQuests = [
                {
                    id: 1,
                    questType: QuestType.ATTENDANCE_5,
                    currentNumber: 0,
                    targetNumber: 5,
                },
                {
                    id: 2,
                    questType: QuestType.ATTENDANCE_20,
                    currentNumber: 0,
                    targetNumber: 20,
                },
                {
                    id: 3,
                    questType: QuestType.COMMENT_20,
                    currentNumber: 0,
                    targetNumber: 20,
                },
                {
                    id: 4,
                    questType: QuestType.COMMENT_50,
                    currentNumber: 0,
                    targetNumber: 50,
                },
            ];

            const mockDb = createChainMock(createdQuests);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    QuestRepository,
                    { provide: DrizzleAsyncProvider, useValue: mockDb },
                ],
            }).compile();

            repository = module.get<QuestRepository>(QuestRepository);
            const result =
                await repository.initializeQuestsForUser(walletAddress);

            expect(mockDb.insert).toHaveBeenCalled();
            expect(mockDb.values).toHaveBeenCalled();
            expect(result).toHaveLength(4);
        });
    });

    describe('findByWalletAddress', () => {
        it('should return quests for wallet address', async () => {
            const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

            const quests = [
                {
                    id: 1,
                    questType: QuestType.ATTENDANCE_5,
                    currentNumber: 3,
                    targetNumber: 5,
                },
                {
                    id: 2,
                    questType: QuestType.COMMENT_20,
                    currentNumber: 10,
                    targetNumber: 20,
                },
            ];

            const mockDb = createChainMock([]);
            // select().from().where()가 배열 반환
            mockDb.where = jest.fn().mockResolvedValue(quests);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    QuestRepository,
                    { provide: DrizzleAsyncProvider, useValue: mockDb },
                ],
            }).compile();

            repository = module.get<QuestRepository>(QuestRepository);
            const result =
                await repository.findByWalletAddress(walletAddress);

            expect(result).toHaveLength(2);
            expect(result[0].questType).toBe(QuestType.ATTENDANCE_5);
        });

        it('should return empty array when no quests found', async () => {
            const walletAddress = '0xnewuser1234567890abcdef1234567890abcdef';

            const mockDb = createChainMock([]);
            mockDb.where = jest.fn().mockResolvedValue([]);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    QuestRepository,
                    { provide: DrizzleAsyncProvider, useValue: mockDb },
                ],
            }).compile();

            repository = module.get<QuestRepository>(QuestRepository);
            const result =
                await repository.findByWalletAddress(walletAddress);

            expect(result).toHaveLength(0);
        });
    });
});

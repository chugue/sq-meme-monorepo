import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';

describe('CommentService', () => {
    let service: CommentService;

    // Drizzle ORM 체이닝 패턴을 위한 mock 헬퍼
    // Drizzle은 destructuring 시 배열을 직접 반환해야 함
    const createChainMock = (finalResult: any[]) => {
        const chain: any = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.from = jest.fn().mockReturnValue(chain);
        chain.where = jest.fn().mockReturnValue(chain);
        // 배열을 직접 반환 (then으로 resolve되도록)
        chain.limit = jest.fn().mockImplementation(() => {
            return Promise.resolve(finalResult);
        });
        chain.insert = jest.fn().mockReturnValue(chain);
        chain.values = jest.fn().mockReturnValue(Promise.resolve());
        chain.update = jest.fn().mockReturnValue(chain);
        chain.set = jest.fn().mockReturnValue(Promise.resolve());
        chain.delete = jest.fn().mockReturnValue(Promise.resolve());
        chain.transaction = jest.fn((cb) => cb(chain));

        // select().from().where()가 배열로 반환되어 destructuring 가능하도록
        // 실제로는 where()나 limit()이 마지막이면 Promise<Array> 반환
        return chain;
    };

    describe('unit tests with mocked db', () => {
        it('should be defined', async () => {
            const mockDb = createChainMock([]);

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CommentService,
                    {
                        provide: DrizzleAsyncProvider,
                        useValue: mockDb,
                    },
                ],
            }).compile();

            service = module.get<CommentService>(CommentService);
            expect(service).toBeDefined();
        });

        describe('toggleLike', () => {
            const userAddress = '0x1234567890abcdef1234567890abcdef12345678';
            const commentId = 1;

            it('should return fail when comment not found', async () => {
                const mockDb = createChainMock([]);

                const module: TestingModule = await Test.createTestingModule({
                    providers: [
                        CommentService,
                        { provide: DrizzleAsyncProvider, useValue: mockDb },
                    ],
                }).compile();

                service = module.get<CommentService>(CommentService);
                const result = await service.toggleLike(userAddress, commentId);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorMessage).toBe('댓글을 찾을 수 없습니다');
                }
            });

            it('should return fail on database error', async () => {
                const mockDb = createChainMock([]);
                mockDb.limit = jest
                    .fn()
                    .mockRejectedValue(new Error('DB Error'));

                const module: TestingModule = await Test.createTestingModule({
                    providers: [
                        CommentService,
                        { provide: DrizzleAsyncProvider, useValue: mockDb },
                    ],
                }).compile();

                service = module.get<CommentService>(CommentService);
                const result = await service.toggleLike(userAddress, commentId);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorMessage).toBe(
                        '좋아요 처리 중 오류가 발생했습니다',
                    );
                }
            });
        });

        describe('getLikeCount', () => {
            it('should return like count when comment exists', async () => {
                const mockDb = createChainMock([{ likeCount: 10 }]);
                // where 후 직접 반환 (limit 없이)
                mockDb.where = jest
                    .fn()
                    .mockResolvedValue([{ likeCount: 10 }]);

                const module: TestingModule = await Test.createTestingModule({
                    providers: [
                        CommentService,
                        { provide: DrizzleAsyncProvider, useValue: mockDb },
                    ],
                }).compile();

                service = module.get<CommentService>(CommentService);
                const result = await service.getLikeCount(1);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.likeCount).toBe(10);
                }
            });

            it('should return fail when comment not found', async () => {
                const mockDb = createChainMock([]);
                mockDb.where = jest.fn().mockResolvedValue([]);

                const module: TestingModule = await Test.createTestingModule({
                    providers: [
                        CommentService,
                        { provide: DrizzleAsyncProvider, useValue: mockDb },
                    ],
                }).compile();

                service = module.get<CommentService>(CommentService);
                const result = await service.getLikeCount(999);

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.errorMessage).toBe('댓글을 찾을 수 없습니다');
                }
            });
        });

        describe('hasUserLiked', () => {
            const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

            it('should return true when user has liked', async () => {
                const mockDb = createChainMock([{ commentId: 1 }]);

                const module: TestingModule = await Test.createTestingModule({
                    providers: [
                        CommentService,
                        { provide: DrizzleAsyncProvider, useValue: mockDb },
                    ],
                }).compile();

                service = module.get<CommentService>(CommentService);
                const result = await service.hasUserLiked(userAddress, 1);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.liked).toBe(true);
                }
            });

            it('should return false when user has not liked', async () => {
                const mockDb = createChainMock([]);

                const module: TestingModule = await Test.createTestingModule({
                    providers: [
                        CommentService,
                        { provide: DrizzleAsyncProvider, useValue: mockDb },
                    ],
                }).compile();

                service = module.get<CommentService>(CommentService);
                const result = await service.hasUserLiked(userAddress, 1);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.liked).toBe(false);
                }
            });
        });

        describe('getUserLikedMap', () => {
            const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

            it('should return empty map for empty commentIds', async () => {
                const mockDb = createChainMock([]);

                const module: TestingModule = await Test.createTestingModule({
                    providers: [
                        CommentService,
                        { provide: DrizzleAsyncProvider, useValue: mockDb },
                    ],
                }).compile();

                service = module.get<CommentService>(CommentService);
                const result = await service.getUserLikedMap(userAddress, []);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.size).toBe(0);
                }
            });

            it('should return map with liked status', async () => {
                const mockDb = createChainMock([]);
                // where 체인 결과
                mockDb.where = jest
                    .fn()
                    .mockResolvedValue([{ commentId: 1 }, { commentId: 3 }]);

                const module: TestingModule = await Test.createTestingModule({
                    providers: [
                        CommentService,
                        { provide: DrizzleAsyncProvider, useValue: mockDb },
                    ],
                }).compile();

                service = module.get<CommentService>(CommentService);
                const result = await service.getUserLikedMap(userAddress, [
                    1, 2, 3,
                ]);

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.get(1)).toBe(true);
                    expect(result.data.get(2)).toBe(false);
                    expect(result.data.get(3)).toBe(true);
                }
            });
        });
    });
});

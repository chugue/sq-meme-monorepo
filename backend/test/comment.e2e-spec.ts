import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Result } from '../src/common/types';
import { CommentController } from '../src/domains/comment/comment.controller';
import { CommentService } from '../src/domains/comment/comment.service';

describe('CommentController (e2e)', () => {
    let app: INestApplication<App>;

    const mockCommentService = {
        createComment: jest.fn(),
        getCommentsByGameId: jest.fn(),
        toggleLike: jest.fn(),
        getLikeCount: jest.fn(),
        hasUserLiked: jest.fn(),
        getUserLikedMap: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [CommentController],
            providers: [
                {
                    provide: CommentService,
                    useValue: mockCommentService,
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

    describe('POST /v1/comments', () => {
        const validTxHash =
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

        it('should create comment successfully', async () => {
            mockCommentService.createComment.mockResolvedValue(
                Result.ok({ id: 1, newEndTime: '1700000000' }),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/comments')
                .send({ txHash: validTxHash })
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                data: { id: 1, newEndTime: '1700000000' },
            });
            expect(mockCommentService.createComment).toHaveBeenCalledWith({
                txHash: validTxHash.toLowerCase(),
            });
        });

        it('should create comment with imageUrl', async () => {
            mockCommentService.createComment.mockResolvedValue(
                Result.ok({ id: 2, newEndTime: '1700000000' }),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/comments')
                .send({
                    txHash: validTxHash,
                    imageUrl: 'https://example.com/image.png',
                })
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                data: { id: 2, newEndTime: '1700000000' },
            });
            expect(mockCommentService.createComment).toHaveBeenCalledWith({
                txHash: validTxHash.toLowerCase(),
                imageUrl: 'https://example.com/image.png',
            });
        });

        it('should return 400 for invalid txHash format', async () => {
            await request(app.getHttpServer())
                .post('/v1/comments')
                .send({ txHash: 'invalid-hash' })
                .expect(400);
        });

        it('should return 400 for missing txHash', async () => {
            await request(app.getHttpServer())
                .post('/v1/comments')
                .send({})
                .expect(400);
        });

        it('should return 400 for invalid imageUrl format', async () => {
            await request(app.getHttpServer())
                .post('/v1/comments')
                .send({ txHash: validTxHash, imageUrl: 'not-a-url' })
                .expect(400);
        });

        it('should return fail result when transaction not found', async () => {
            mockCommentService.createComment.mockResolvedValue(
                Result.fail('트랜잭션을 찾을 수 없습니다.'),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/comments')
                .send({ txHash: validTxHash })
                .expect(201);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe(
                '트랜잭션을 찾을 수 없습니다.',
            );
        });

        it('should return fail result for duplicate comment', async () => {
            mockCommentService.createComment.mockResolvedValue(
                Result.fail('이미 처리된 댓글입니다.'),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/comments')
                .send({ txHash: validTxHash })
                .expect(201);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe('이미 처리된 댓글입니다.');
        });
    });

    describe('POST /v1/comments/:id/like', () => {
        const commentId = 1;
        const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

        it('should toggle like successfully', async () => {
            mockCommentService.toggleLike.mockResolvedValue(
                Result.ok({ liked: true, likeCount: 10 }),
            );

            const response = await request(app.getHttpServer())
                .post(`/v1/comments/${commentId}/like`)
                .set('x-wallet-address', userAddress)
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                data: { liked: true, likeCount: 10 },
            });
        });

        it('should return 400 when wallet address header is missing', async () => {
            await request(app.getHttpServer())
                .post(`/v1/comments/${commentId}/like`)
                .expect(400);
        });

        it('should return fail result when comment not found', async () => {
            mockCommentService.toggleLike.mockResolvedValue(
                Result.fail('댓글을 찾을 수 없습니다'),
            );

            const response = await request(app.getHttpServer())
                .post(`/v1/comments/${commentId}/like`)
                .set('x-wallet-address', userAddress)
                .expect(201);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe('댓글을 찾을 수 없습니다');
        });
    });

    describe('GET /v1/comments/:id/like/count', () => {
        const commentId = 1;

        it('should return like count', async () => {
            mockCommentService.getLikeCount.mockResolvedValue(
                Result.ok({ likeCount: 42 }),
            );

            const response = await request(app.getHttpServer())
                .get(`/v1/comments/${commentId}/like/count`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: { likeCount: 42 },
            });
        });

        it('should return fail when comment not found', async () => {
            mockCommentService.getLikeCount.mockResolvedValue(
                Result.fail('댓글을 찾을 수 없습니다'),
            );

            const response = await request(app.getHttpServer())
                .get(`/v1/comments/999/like/count`)
                .expect(200);

            expect(response.body.success).toBe(false);
            expect(response.body.errorMessage).toBe('댓글을 찾을 수 없습니다');
        });
    });

    describe('GET /v1/comments/:id/like/check', () => {
        const commentId = 1;
        const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

        it('should return true when user has liked', async () => {
            mockCommentService.hasUserLiked.mockResolvedValue(
                Result.ok({ liked: true }),
            );

            const response = await request(app.getHttpServer())
                .get(`/v1/comments/${commentId}/like/check`)
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: { liked: true },
            });
        });

        it('should return false when user has not liked', async () => {
            mockCommentService.hasUserLiked.mockResolvedValue(
                Result.ok({ liked: false }),
            );

            const response = await request(app.getHttpServer())
                .get(`/v1/comments/${commentId}/like/check`)
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: { liked: false },
            });
        });

        it('should return 400 when wallet address header is missing', async () => {
            await request(app.getHttpServer())
                .get(`/v1/comments/${commentId}/like/check`)
                .expect(400);
        });
    });
});

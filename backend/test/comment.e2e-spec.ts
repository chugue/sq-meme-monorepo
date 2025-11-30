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

            expect(response.body).toEqual({
                success: false,
                errorMessage: '댓글을 찾을 수 없습니다',
            });
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

            expect(response.body).toEqual({
                success: false,
                errorMessage: '댓글을 찾을 수 없습니다',
            });
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

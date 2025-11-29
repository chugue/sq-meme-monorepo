import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { Result } from 'src/common/types';

describe('CommentController', () => {
    let controller: CommentController;
    let service: CommentService;

    const mockCommentService = {
        toggleLike: jest.fn(),
        getLikeCount: jest.fn(),
        hasUserLiked: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CommentController],
            providers: [
                {
                    provide: CommentService,
                    useValue: mockCommentService,
                },
            ],
        }).compile();

        controller = module.get<CommentController>(CommentController);
        service = module.get<CommentService>(CommentService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('toggleLike', () => {
        const commentId = 1;
        const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

        it('should return success result when like is toggled', async () => {
            const expectedResult = Result.ok({ liked: true, likeCount: 10 });
            mockCommentService.toggleLike.mockResolvedValue(expectedResult);

            const result = await controller.toggleLike(commentId, userAddress);

            expect(result).toEqual(expectedResult);
            expect(service.toggleLike).toHaveBeenCalledWith(
                userAddress,
                commentId,
            );
        });

        it('should return fail result when comment not found', async () => {
            const expectedResult = Result.fail('댓글을 찾을 수 없습니다');
            mockCommentService.toggleLike.mockResolvedValue(expectedResult);

            const result = await controller.toggleLike(commentId, userAddress);

            expect(result).toEqual(expectedResult);
        });
    });

    describe('getLikeCount', () => {
        const commentId = 1;

        it('should return like count', async () => {
            const expectedResult = Result.ok({ likeCount: 42 });
            mockCommentService.getLikeCount.mockResolvedValue(expectedResult);

            const result = await controller.getLikeCount(commentId);

            expect(result).toEqual(expectedResult);
            expect(service.getLikeCount).toHaveBeenCalledWith(commentId);
        });

        it('should return fail result when comment not found', async () => {
            const expectedResult = Result.fail('댓글을 찾을 수 없습니다');
            mockCommentService.getLikeCount.mockResolvedValue(expectedResult);

            const result = await controller.getLikeCount(commentId);

            expect(result).toEqual(expectedResult);
        });
    });

    describe('checkUserLiked', () => {
        const commentId = 1;
        const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

        it('should return true when user has liked', async () => {
            const expectedResult = Result.ok({ liked: true });
            mockCommentService.hasUserLiked.mockResolvedValue(expectedResult);

            const result = await controller.checkUserLiked(
                commentId,
                userAddress,
            );

            expect(result).toEqual(expectedResult);
            expect(service.hasUserLiked).toHaveBeenCalledWith(
                userAddress,
                commentId,
            );
        });

        it('should return false when user has not liked', async () => {
            const expectedResult = Result.ok({ liked: false });
            mockCommentService.hasUserLiked.mockResolvedValue(expectedResult);

            const result = await controller.checkUserLiked(
                commentId,
                userAddress,
            );

            expect(result).toEqual(expectedResult);
        });
    });
});

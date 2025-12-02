import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Result } from '../src/common/types';
import { UsersController } from '../src/domains/users/users.controller';
import { UsersService } from '../src/domains/users/users.service';

describe('UsersController (e2e)', () => {
    let app: INestApplication<App>;

    const mockUser = {
        id: 1,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        userName: 'testuser',
        userTag: '@testuser',
        profileImage: 'https://example.com/avatar.png',
        memexLink: 'https://memex.social/testuser',
        memexWalletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        myTokenAddr: '0x9876543210fedcba9876543210fedcba98765432',
        myTokenSymbol: 'TEST',
        mTokenBalance: '0',
        myTokenBalance: '0',
        otherTokenBalances: [],
        checkInHistory: [{ day: '2025-12-02', currentStreak: 1 }],
        isPolicyAgreed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockUsersService = {
        join: jest.fn(),
        getUserByWalletAddress: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: mockUsersService,
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

    describe('POST /v1/users/join', () => {
        const joinDto = {
            walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            userName: 'testuser',
            userTag: '@testuser',
            profileImage: 'https://example.com/avatar.png',
            memexLink: 'https://memex.social/testuser',
        };

        it('should create a new user successfully', async () => {
            mockUsersService.join.mockResolvedValue(
                Result.ok({ user: mockUser, isNew: true }),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/users/join')
                .send(joinDto)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: { user: expect.any(Object), isNew: true },
            });
            expect(mockUsersService.join).toHaveBeenCalled();
        });

        it('should return existing user with isNew=false', async () => {
            mockUsersService.join.mockResolvedValue(
                Result.ok({ user: mockUser, isNew: false }),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/users/join')
                .send(joinDto)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: { user: expect.any(Object), isNew: false },
            });
        });

        it('should return fail result on error', async () => {
            mockUsersService.join.mockResolvedValue(
                Result.fail('회원가입에 실패했습니다.'),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/users/join')
                .send(joinDto)
                .expect(200);

            expect(response.body).toEqual({
                success: false,
                errorMessage: '회원가입에 실패했습니다.',
            });
        });

        it('should work with minimal data (only walletAddress)', async () => {
            const minimalDto = {
                walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            };

            mockUsersService.join.mockResolvedValue(
                Result.ok({ user: mockUser, isNew: true }),
            );

            const response = await request(app.getHttpServer())
                .post('/v1/users/join')
                .send(minimalDto)
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /v1/users/me', () => {
        const userAddress = '0x1234567890abcdef1234567890abcdef12345678';

        it('should return user info when found', async () => {
            mockUsersService.getUserByWalletAddress.mockResolvedValue(
                Result.ok({ user: mockUser }),
            );

            const response = await request(app.getHttpServer())
                .get('/v1/users/me')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: { user: expect.any(Object) },
            });
        });

        it('should return null user when not found', async () => {
            mockUsersService.getUserByWalletAddress.mockResolvedValue(
                Result.ok({ user: null }),
            );

            const response = await request(app.getHttpServer())
                .get('/v1/users/me')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: { user: null },
            });
        });

        it('should return 400 when wallet address header is missing', async () => {
            await request(app.getHttpServer())
                .get('/v1/users/me')
                .expect(400);
        });

        it('should return fail result on error', async () => {
            mockUsersService.getUserByWalletAddress.mockResolvedValue(
                Result.fail('사용자 조회에 실패했습니다.'),
            );

            const response = await request(app.getHttpServer())
                .get('/v1/users/me')
                .set('x-wallet-address', userAddress)
                .expect(200);

            expect(response.body).toEqual({
                success: false,
                errorMessage: '사용자 조회에 실패했습니다.',
            });
        });
    });
});

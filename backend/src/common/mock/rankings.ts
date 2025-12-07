import {
    GameRankItem,
    MostCommentUserRankDto,
    PrizeRankItem,
} from 'src/domains/users/dto/users.resp.dto';

/**
 * Game Ranking Mock Data (토큰별 상금 랭킹)
 */
export const mockGameRanking: GameRankItem[] = [
    {
        rank: 1,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/59_7e3.png',
        tokenAddress: '0x7e3c5F7E0C2C91C8a20c6A65e28F0f9DB3F8a5e0',
        tokenSymbol: 'PEPE',
        tokenUsername: 'PepeMaster',
        tokenUserTag: '1234',
        totalPrize: '125000000000000000000000',
    },
    {
        rank: 2,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/841981_c8d.png',
        tokenAddress: '0xfe9ab6aed9e6ebb3f65e2a3678c99d3765d2add8',
        tokenSymbol: 'DOGE',
        tokenUsername: 'DogeKing',
        tokenUserTag: '5678',
        totalPrize: '98500000000000000000000',
    },
    {
        rank: 3,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/818115_318.png',
        tokenAddress: '0x6adf9d385dff1feb41b966e24447cbc8973d1b50',
        tokenSymbol: 'SHIB',
        tokenUsername: 'ShibArmy',
        tokenUserTag: '9012',
        totalPrize: '76000000000000000000000',
    },
    {
        rank: 4,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/59_7e3.png',
        tokenAddress: '0x7a4e0ad4b668afcd9f8edfebce6237e262c20a60',
        tokenSymbol: 'FLOKI',
        tokenUsername: 'FlokiViking',
        tokenUserTag: '3456',
        totalPrize: '54000000000000000000000',
    },
    {
        rank: 5,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/841981_c8d.png',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenSymbol: 'WOJAK',
        tokenUsername: 'WojakFeel',
        tokenUserTag: '7890',
        totalPrize: '42000000000000000000000',
    },
    {
        rank: 6,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/818115_318.png',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'BONK',
        tokenUsername: 'BonkDog',
        tokenUserTag: '2345',
        totalPrize: '38000000000000000000000',
    },
    {
        rank: 7,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/59_7e3.png',
        tokenAddress: '0x2345678901abcdef2345678901abcdef23456789',
        tokenSymbol: 'WIF',
        tokenUsername: 'DogWifHat',
        tokenUserTag: '6789',
        totalPrize: '31000000000000000000000',
    },
    {
        rank: 8,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/841981_c8d.png',
        tokenAddress: '0x3456789012abcdef3456789012abcdef34567890',
        tokenSymbol: 'MEME',
        tokenUsername: 'MemeLord',
        tokenUserTag: '0123',
        totalPrize: '28000000000000000000000',
    },
    {
        rank: 9,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/818115_318.png',
        tokenAddress: '0x4567890123abcdef4567890123abcdef45678901',
        tokenSymbol: 'CHAD',
        tokenUsername: 'GigaChad',
        tokenUserTag: '4567',
        totalPrize: '24000000000000000000000',
    },
    {
        rank: 10,
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/59_7e3.png',
        tokenAddress: '0x5678901234abcdef5678901234abcdef56789012',
        tokenSymbol: 'MOON',
        tokenUsername: 'ToTheMoon',
        tokenUserTag: '8901',
        totalPrize: '19000000000000000000000',
    },
];

/**
 * Prize Ranking Mock Data (유저별 획득 상금 랭킹)
 */
export const mockPrizeRanking: PrizeRankItem[] = [
    {
        rank: 1,
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user1.png',
        username: 'CryptoWhale',
        totalAmount: '15000',
        tokenAddress: '0x7e3c5F7E0C2C91C8a20c6A65e28F0f9DB3F8a5e0',
        tokenSymbol: 'PEPE',
    },
    {
        rank: 2,
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user2.png',
        username: 'DiamondHands',
        totalAmount: '12500',
        tokenAddress: '0xfe9ab6aed9e6ebb3f65e2a3678c99d3765d2add8',
        tokenSymbol: 'DOGE',
    },
    {
        rank: 3,
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user3.png',
        username: 'MoonBoy',
        totalAmount: '9800',
        tokenAddress: '0x6adf9d385dff1feb41b966e24447cbc8973d1b50',
        tokenSymbol: 'SHIB',
    },
    {
        rank: 4,
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user4.png',
        username: 'DeFiGuru',
        totalAmount: '7600',
        tokenAddress: '0x7a4e0ad4b668afcd9f8edfebce6237e262c20a60',
        tokenSymbol: 'FLOKI',
    },
    {
        rank: 5,
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user5.png',
        username: 'TokenTrader',
        totalAmount: '6200',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenSymbol: 'WOJAK',
    },
    {
        rank: 6,
        profileImage: null,
        username: 'AnonWhale',
        totalAmount: '5100',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'BONK',
    },
    {
        rank: 7,
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user7.png',
        username: 'HodlKing',
        totalAmount: '4300',
        tokenAddress: '0x2345678901abcdef2345678901abcdef23456789',
        tokenSymbol: 'WIF',
    },
    {
        rank: 8,
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user8.png',
        username: 'MemeMaster',
        totalAmount: '3800',
        tokenAddress: '0x3456789012abcdef3456789012abcdef34567890',
        tokenSymbol: 'MEME',
    },
    {
        rank: 9,
        profileImage: null,
        username: 'Satoshi2',
        totalAmount: '3200',
        tokenAddress: '0x4567890123abcdef4567890123abcdef45678901',
        tokenSymbol: 'CHAD',
    },
    {
        rank: 10,
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user10.png',
        username: 'AlphaTrader',
        totalAmount: '2700',
        tokenAddress: '0x5678901234abcdef5678901234abcdef56789012',
        tokenSymbol: 'MOON',
    },
];

/**
 * Most Comments Mock Data (댓글 많은 유저 랭킹)
 */
export const mockMostCommentors: MostCommentUserRankDto[] = [
    {
        rank: 1,
        userWalletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8dE41',
        username: 'CommentKing',
        userTag: '1111',
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user1.png',
        commentCount: 1523,
    },
    {
        rank: 2,
        userWalletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        username: 'ChattyDev',
        userTag: '2222',
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user2.png',
        commentCount: 1287,
    },
    {
        rank: 3,
        userWalletAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
        username: 'DiscussionPro',
        userTag: '3333',
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user3.png',
        commentCount: 1089,
    },
    {
        rank: 4,
        userWalletAddress: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
        username: 'ActiveUser',
        userTag: '4444',
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user4.png',
        commentCount: 876,
    },
    {
        rank: 5,
        userWalletAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
        username: 'Commenter5',
        userTag: '5555',
        profileImage: null,
        commentCount: 754,
    },
    {
        rank: 6,
        userWalletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        username: 'TalkativeTom',
        userTag: '6666',
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user6.png',
        commentCount: 632,
    },
    {
        rank: 7,
        userWalletAddress: '0x09DB0a93B389bEF724429898f539AEB7ac2Dd55f',
        username: 'VoiceMaker',
        userTag: '7777',
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user7.png',
        commentCount: 521,
    },
    {
        rank: 8,
        userWalletAddress: '0x02484cb50AAC86Eae85610D6f4Bf026f30f6627D',
        username: 'FeedbackFan',
        userTag: '8888',
        profileImage: null,
        commentCount: 445,
    },
    {
        rank: 9,
        userWalletAddress: '0x08A2DE6F3528319123b25935C92888B16db8913E',
        username: 'ReplyMaster',
        userTag: '9999',
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user9.png',
        commentCount: 398,
    },
    {
        rank: 10,
        userWalletAddress: '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
        username: 'PostPro',
        userTag: '0000',
        profileImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/user10.png',
        commentCount: 312,
    },
];

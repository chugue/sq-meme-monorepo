export interface MyAsset {
    tokenAddress: string;
    tokenSymbol: string;
    balance: string;
    tokenImage: string;
}

export interface MyAssetsRespDto {
    memex: MyAsset;
    myToken: MyAsset;
    otherTokens: MyAsset[];
}

export const mockMyAssets = [
    {
        tokenId: 1,
        tokenName: 'MemeX',
        tokenAddress: '0x7e3c5F7E0C2C91C8a20c6A65e28F0f9DB3F8a5e0',
        tokenSymbol: 'M',
        balance: '100230099300000000000000000',
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/59_7e3.png',
    },
    {
        tokenId: 2,
        tokenName: 'ZOMBU',
        tokenAddress: '0x7a4e0ad4b668afcd9f8edfebce6237e262c20a60',
        tokenSymbol: 'ZOM',
        balance: '100339300000000000000000',
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/59_7e3.png',
    },
    {
        tokenId: 3,
        tokenName: 'CondingCat',
        tokenAddress: '0xfe9ab6aed9e6ebb3f65e2a3678c99d3765d2add8',
        tokenSymbol: 'CC',
        balance: '298342938479800000000000000000',
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/841981_c8d.png',
    },
    {
        tokenId: 4,
        tokenName: 'MCAT',
        tokenAddress: '0x6adf9d385dff1feb41b966e24447cbc8973d1b50',
        tokenSymbol: 'MCAT',
        balance: '2838700000000000000000',
        tokenImage:
            'https://cdn.memex.xyz/memex/prod/v1/profileImage/818115_318.png',
    },
];

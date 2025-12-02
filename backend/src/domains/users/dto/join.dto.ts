import { IsNotEmpty, IsString } from 'class-validator';

export class JoinDto {
    @IsString()
    @IsNotEmpty()
    walletAddress: string;

    @IsString()
    @IsNotEmpty()
    userName: string;

    @IsString()
    @IsNotEmpty()
    userTag: string;

    @IsString()
    @IsNotEmpty()
    profileImage: string;

    @IsString()
    @IsNotEmpty()
    memexLink: string;

    @IsString()
    @IsNotEmpty()
    memexWalletAddress: string;

    @IsString()
    @IsNotEmpty()
    myTokenAddr: string;

    @IsString()
    @IsNotEmpty()
    myTokenSymbol: string;
}

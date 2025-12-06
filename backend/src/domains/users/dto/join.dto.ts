import { z } from 'zod';

export const JoinDtoSchema = z.object({
    walletAddress: z.string().min(1),
    userName: z.string().min(1),
    userTag: z.string().min(1),
    profileImage: z.string().min(1),
    memexLink: z.string().min(1),
    memexWalletAddress: z.string().min(1),
    myTokenAddr: z.string().min(1),
    myTokenSymbol: z.string().min(1),
});

export type JoinDto = z.infer<typeof JoinDtoSchema>;

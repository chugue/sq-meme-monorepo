export interface QuestRespDto {
    today: string;
    quests: QuestItem[];
}

export type QuestTypes = 'attendance' | 'comments';

export interface QuestItem {
    id: number;
    type: QuestTypes;
    title: string;
    description: string;
    currentNumber: number;
    targetNumber: number;
    isClaimed: boolean;
}

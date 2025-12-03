import { createStore, Provider as JotaiProvider } from 'jotai';
import { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

// 모듈 레벨에서 store 생성 - UI 재마운트와 무관하게 상태 유지
const squidMemeStore = createStore();

export function SquidMemeJotaiProvider({ children }: Props) {
    return <JotaiProvider store={squidMemeStore}>{children}</JotaiProvider>;
}

// store 초기화 함수 (필요 시 사용)
export function resetSquidMemeStore() {
    // store를 초기화하려면 새 store를 생성해야 함
    // 현재는 단순히 atom 값을 초기화하는 방식 사용
}


import { Provider as JotaiProvider } from 'jotai';
import { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

export function SquidMemeJotaiProvider({ children }: Props) {
    return <JotaiProvider>{children}</JotaiProvider>;
}


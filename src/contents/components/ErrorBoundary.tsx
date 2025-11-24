import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('❌ React Error Boundary:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    background: '#2a1a1a',
                    border: '3px solid #ff4444',
                    color: '#ff6666',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#ff4444' }}>ERROR</h3>
                    <p style={{ margin: '0', color: '#ff6666' }}>
                        {this.state.error?.message || 'Unknown error'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            background: '#ff4444',
                            color: 'white',
                            border: '2px solid #ff0000',
                            cursor: 'pointer',
                            fontFamily: 'monospace'
                        }}
                    >
                        RETRY
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}


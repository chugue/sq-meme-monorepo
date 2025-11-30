/**
 * 구조화된 로깅 유틸리티
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

class Logger {
    private readonly prefix = '🦑 [SQUID_MEME]';
    private readonly isDevelopment = process.env.NODE_ENV === 'development';

    private log(level: LogLevel, message: string, context?: LogContext): void {
        if (!this.isDevelopment && level === 'debug') {
            return;
        }

        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${this.prefix} ${message}`;

        if (context) {
            console[level](logMessage, context);
        } else {
            console[level](logMessage);
        }
    }

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    error(message: string, error?: Error | unknown, context?: LogContext): void {
        const errorContext = {
            ...context,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        };
        this.log('error', message, errorContext);
    }
}

export const logger = new Logger();


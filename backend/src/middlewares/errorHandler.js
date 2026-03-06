import logger from '../utils/logger.js';

function normalizeModuleName(modulePath = '') {
    if (!modulePath || typeof modulePath !== 'string') return 'unknown';
    const normalizedPath = modulePath.replace(/\\/g, '/');
    const lastSlashIdx = normalizedPath.lastIndexOf('/');
    return lastSlashIdx >= 0 ? normalizedPath.slice(lastSlashIdx + 1) : normalizedPath;
}

function parseOriginFromStack(stackText = '') {
    const lines = String(stackText || '').split('\n');

    for (const line of lines) {
        if (
            line.includes('node:internal') ||
            line.includes('node_modules') ||
            line.includes('(internal/')
        ) {
            continue;
        }

        const match = line.match(/at\s+(?:.+\s+\()?(?:file:\/\/\/)?(.+?):(\d+):(\d+)\)?$/);
        if (match) {
            return {
                module_name: normalizeModuleName(match[1]),
                source: `${match[2]}:${match[3]}`
            };
        }
    }

    return { module_name: 'unknown', source: 'unknown' };
}

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    // 1) 予測可能な運用エラー(入力ミスなど) : クライアントにメッセージ送信
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else { // プログラムのバグやその他未知のエラー : 詳細を出さない
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong'
        });
    }
};

const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    const origin = parseOriginFromStack(err?.stack || '');
    const module_name = origin.module_name !== 'unknown' ? origin.module_name : undefined;
    const source = origin.source !== 'unknown' ? origin.source : undefined;

    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
    const logMessage = err.statusCode === 404
        ? `Not Found: ${req?.method} ${req?.originalUrl}`
        : (err.message || 'Unhandled error');

    const clientIp = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress;
    const sessionUser = req?.session?.user;

    logger[logLevel](logMessage, {
        module_name,
        source,
        option: {
            statusCode: err.statusCode,
            status: err.status,
            path: req?.originalUrl,
            method: req?.method,
            ip: clientIp,
            user_id: sessionUser?.id ?? null,
            user_name: sessionUser?.user_name ?? null,
            employee_no: sessionUser?.employee_no ?? null,
            error_origin_file: module_name ?? null,
            error_origin_line: source ?? null,
            stack: err.statusCode >= 500 ? err.stack : undefined
        }
    });

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;
        sendErrorProd(error, res);
    }
};

export default globalErrorHandler;
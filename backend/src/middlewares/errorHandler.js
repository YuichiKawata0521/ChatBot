import logger from '../utils/logger.js';

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

    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
    const logMessage = err.statusCode === 404
        ? `Not Found: ${req?.method} ${req?.originalUrl}`
        : (err.message || 'Unhandled error');

    const clientIp = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress;
    const sessionUser = req?.session?.user;

    logger[logLevel](logMessage, {
        option: {
            statusCode: err.statusCode,
            status: err.status,
            path: req?.originalUrl,
            method: req?.method,
            ip: clientIp,
            user_id: sessionUser?.id ?? null,
            employee_no: sessionUser?.employee_no ?? null,
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
import { AppError } from '../utils/appError.js';

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
        console.error('ERROR: ', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong'
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;
        sendErrorProd(error, res);
    }
};
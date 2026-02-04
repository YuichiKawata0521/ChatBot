import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { sessionConfig } from './config/session.js';
import viewRoutes from './routes/viewRoutes.js';
import indexRoutes from './routes/indexRoutes.js';
import * as globalErrorHandler from './middlewares/errorHandler.js';
import AppError from './utils/appError.js';

const app = express();

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session(sessionConfig));
app.use(helmet());

app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    optionsSuccessStatus: 200
}));

app.use('/', viewRoutes);
app.use('/api/v1', indexRoutes);
app.get('/api/health', (req, res) => {
    res.status(200).json({success: true, message: 'Backend is runngin'});
});

app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

app.use((err, req, res, next) => {
    if (res.headerSent) return next(err);

    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({success: false, message: 'CSRFトークンが無効です。'});
    }

    console.error('Error: ', err.message);
    if (err.stack && process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'サーバーでエラーが発生しました',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
}) ;

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);

export default app;
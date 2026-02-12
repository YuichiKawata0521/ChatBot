import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { getSessionConfig } from './config/session.js';
import viewRoutes from './routes/viewRoutes.js';
import indexRoutes from './routes/indexRoutes.js';
import globalErrorHandler from './middlewares/errorHandler.js';
import AppError from './utils/appError.js';

const app = express();

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session(getSessionConfig()));
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
    res.status(200).json({success: true, message: 'Backend is running'});
});

app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);

export default app;
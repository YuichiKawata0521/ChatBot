import { getPool } from '../config/db.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';
import * as logModels from '../models/logModels.js';

export const getLogs = async (req, res, next) => {
    const pool = getPool();
    try {
        const logData = await logModels.getAllLogs(pool);
        res.status(200).json({
            success: true,
            data: logData
        });
    } catch (error) {
        logger.error('DBからログ情報取得に失敗しました', { option: { employee_no: req.user?.employee_no } });
        return next(new AppError('Failed to get all log datas', 400));
    }
};
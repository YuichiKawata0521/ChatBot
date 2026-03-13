import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { format } from 'winston';
import fs from 'fs';
import path from 'path';
import Email from './email.js';
import { getPool } from '../config/db.js';
import { insertSystemLog } from '../models/logModels.js';

// ログディレクトリの有無を確認
function ensureLogDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function getTimeStamp() {
    const date = new Date();
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().replace('T', ' ').split('.')[0];
}

// エラー発生ファイルと関数名を取得 (同期的に呼び出す必要がある)
function parseErrorInfo() {
    const err = new Error();
    const stackLines = err.stack?.split('\n') || [];
    
    let module_name = 'unknown';
    let source = 'unknown';

    for (let i = 2; i < stackLines.length; i++) {
        const line = stackLines[i];
        
        // このファイル自身のスタックは除外する
        if (line.includes('logger.js')) continue;

        // ESMの file:/// にも対応し、ファイルパス・行・列をキャプチャする
        const match = line.match(/at \S+ \((?:file:\/\/\/)?(.+):(\d+):(\d+)\)/) || 
                      line.match(/at (?:file:\/\/\/)?(.+):(\d+):(\d+)/);

        if (match) {
            module_name = match[1];             // 例: /app/src/utils/app.js
            source = `${match[2]}:${match[3]}`; // 例: 23:17
            break;
        }
    }

    return { module_name, source };
}

// ログレベルの定義
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6
    },
    colors: {
        error: 'bold red yellowBG',
        warn: 'green',
        info: 'blue',
        http: 'magenta',
        verbose: 'cyan',
        debug: 'white',
        silly: 'gray'
    }
};

winston.addColors(customLevels.colors);

// フォーマッター内では情報を取得せず、受け取ったメタデータを使用する
const customLogFormat = format.printf((info) => {
    return JSON.stringify({
        timeStamp: getTimeStamp(),
        level: info.level,
        source: info.source || 'unknown',
        module_name: info.module_name || 'unknown',
        message: info.message,
        option: info.option ?? null
    });
});

function createSystemLog() {
    const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'LOGS');
    ensureLogDir(logDir);

    async function sendErrorEmail(info) {
        const to = process.env.ERROR_ALERT_EMAIL_TO || process.env.ERROR_USERNAME;
        if (!to) return;

        const emailUser = {
            email: to,
            user_name: 'System'
        };

        const errorMail = new Email(emailUser, process.env.APP_URL || '');
        const subject = '[ChatBot] Error Log Alert';
        const message = [
            `time: ${getTimeStamp()}`,
            `level: ${info.level}`,
            `source: ${info.source}`,
            `module: ${info.module_name}`,
            `message: ${info.message}`,
            `option: ${JSON.stringify(info.option ?? null)}`
        ].join('\n');

        await errorMail.send(subject, message);
    }

    async function saveLogToDB(level, message, safeMeta, module_name, source) {
        if (process.env.NODE_ENV === 'test') return;

        const pool = getPool();
        const ignoreLevels = ['silly', 'debug'];
        if (ignoreLevels.includes(level)) return;

        try {
            const context = {
                source,
                module_name,
                option: safeMeta.option ?? null,
                ...safeMeta
            };

            delete context.event_type;
            delete context.request_id;
            delete context.user_id;
            delete context.department_id;

            const logData = {
                level,
                event_type: safeMeta.event_type,
                message: typeof message === 'string' ? message : JSON.stringify(message),
                context,
                request_id: safeMeta.request_id,
                user_id: safeMeta.user_id,
                department_id: safeMeta.department_id,
                service: process.env.SERVICE_NAME,
                environment: process.env.NODE_ENV
            };

            await insertSystemLog(pool, logData);
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            console.error(`[logger] ログをDBへ保存するのに失敗しました: ${reason}`);
        }
    }

    function normalizeMeta(meta) {
        const safeMeta = meta && typeof meta === 'object' ? meta : {};
        const safeOption = safeMeta.option && typeof safeMeta.option === 'object' ? safeMeta.option : {};

        return {
            ...safeMeta,
            user_id: safeMeta.user_id ?? safeOption.user_id ?? null,
            department_id: safeMeta.department_id ?? safeOption.department_id ?? null,
            request_id: safeMeta.request_id ?? safeOption.request_id ?? null,
            user_name: safeMeta.user_name ?? safeOption.user_name ?? null,
            employee_no: safeMeta.employee_no ?? safeOption.employee_no ?? null
        };
    }

    // Winstonロガーの本体を作成
    const winstonLogger = winston.createLogger({
        levels: customLevels.levels,
        format: customLogFormat,
        transports: [
            new winston.transports.Console({
                format: format.combine(
                    format.colorize({ all: true }),
                    format.printf((info) => {
                        const source = info.source || 'unknown';
                        const module_name = info.module_name || 'unknown';
                        const optStr = info.option ? JSON.stringify(info.option) : '';
                        return `${getTimeStamp()} [${info.level}] ${module_name} line.${source}: ${info.message} ${optStr}`;
                    })
                )
            }),
            new DailyRotateFile({
                dirname: logDir,
                filename: 'ChatBot_%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '90d',
                zippedArchive: true
            }),
            new DailyRotateFile({
                level: 'error',
                dirname: logDir,
                filename: 'ChatBot_error_%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '90d',
                zippedArchive: true
            })
        ]
    });

    // 共通のログ書き込みロジック (ここで parseErrorInfo を同期的に呼ぶ)
    const logWrapper = (level, message, meta = {}) => {
        const safeMeta = normalizeMeta(meta);
        const parsed = parseErrorInfo();
        
        // オプション等ですでに source が指定されていれば優先し、なければ parsed を使用
        const module_name = safeMeta.module_name ?? parsed.module_name;
        const source = safeMeta.source ?? parsed.source;

        // エラー時のメール送信ロジック
        if (level === 'error') {
            const payload = {
                level: 'error',
                message: typeof message === 'string' ? message : JSON.stringify(message),
                source,
                module_name,
                option: safeMeta.option ?? null
            };

            sendErrorEmail(payload).catch((mailError) => {
                console.error('Failed to send error alert email:', mailError);
            });
        }

        saveLogToDB(level, message, safeMeta, module_name, source);

        // Winstonにメタデータを付与してログを出力
        winstonLogger.log(level, message, { ...safeMeta, module_name, source });
    };

    // 外部に公開するラッパーオブジェクト
    return {
        error: (message, meta) => logWrapper('error', message, meta),
        warn:  (message, meta) => logWrapper('warn', message, meta),
        info:  (message, meta) => logWrapper('info', message, meta),
        http:  (message, meta) => logWrapper('http', message, meta),
        verbose:(message, meta) => logWrapper('verbose', message, meta),
        debug: (message, meta) => logWrapper('debug', message, meta),
        silly: (message, meta) => logWrapper('silly', message, meta),
        
        // express/morgan 用のストリーム
        stream: {
            write(message) {
                logWrapper('http', message.trim(), { module_name: 'express', source: 'morgan' });
            }
        }
    };
}

const logger = createSystemLog();

export default logger;
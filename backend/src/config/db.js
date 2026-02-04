import { Pool } from 'pg';

let pool;

// DB接続情報を取得する関数
const getPoolConfig = () => ({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutmillis: 10000
});

// DB疎通確認用関数
export const connectDB = async () => {
    if (pool) {
        return pool;
    }

    pool = new Pool(getPoolConfig());

    try {
        const res = await pool.query("SELECT NOW()");
        return pool;
    } catch  (error) {
        console.errir('DB応答確認 NG: ', error.message);
        process.exit(1);
    }
};

// 初期化済みのpoolを返す
export const getPool = () => {
    if (!pool) {
        console.error("DB Poolが初期化されていません");
        throw new Error('DB Pool not initialized.');
    }
    return pool;
}

process.on('SIGINT', async () => {
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});
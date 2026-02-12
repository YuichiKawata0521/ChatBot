import { Pool } from 'pg';

let pool;

// DB接続情報を取得する関数
const getPoolConfig = () => ({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || 'db',
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// DB疎通確認用関数
export const connectDB = async () => {
    if (pool) {
        return pool;
    }
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            pool = new Pool(getPoolConfig());
            const res = await pool.query("SELECT NOW()");
            console.log('DB応答確認 OK!!');
            return pool;
        } catch (error) {
            retries++;
            console.error(`DB応答確認 NG (Attempt ${retries}/${maxRetries}): `, error.message);

            if (retries >= maxRetries) {
                console.error('Max retries reached. Exiting・・・');
                process.exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
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
import { connectDB } from "./config/db.js";
import logger from "./utils/logger.js";

const PORT = process.env.BACKEND_PORT || 3000;

const startServer = async () => {
    try {
        const checkDB = await connectDB();  // connectDBのcatchでexitしているので、ここが続く場合はpoolはあるものとして進める

        const { default: app } = await import('./app.js');
        app.listen(PORT, () => {
            logger.info('サーバーが起動しました');
        });
    } catch (error) {
        logger.error('サーバー起動中にエラーが発生しました', {
            option: {
                detail: error?.message,
                stack: error?.stack
            }
        });
        process.exit(1);
    }
};

startServer();
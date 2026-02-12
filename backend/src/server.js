import { connectDB } from "./config/db.js";

const PORT = process.env.BACKEND_PORT || 3000;

const startServer = async () => {
    try {
        const checkDB = await connectDB();  // connectDBのcatchでexitしているので、ここが続く場合はpoolはあるものとして進める

        const { default: app } = await import('./app.js');
        app.listen(PORT, () => {});
    } catch (error) {
        console.error('サーバー起動中にエラーが発生しました: ', error && error.stack ? error.stack : error);
        process.exit(1);
    }
};

startServer();
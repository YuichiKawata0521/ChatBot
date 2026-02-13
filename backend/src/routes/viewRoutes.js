import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Chatbot API Server is running');
});

router.get('/dashboard', protect, (req, res) => {
    res.send('Dashboard: Login Successful');
});

router.get('/register/:token', (req, res) => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const htmlPath = path.join(__dirname, '../../../frontend/pages/change_password.html');
    res.sendFile(htmlPath);
});

export default router;
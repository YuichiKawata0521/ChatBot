import express from 'express';
import * as loginController from '../controllers/loginController.js';
import loginLimiter from '../middlewares/loginMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post("/login", loginLimiter, loginController.login);

router.post('/logout', protect, loginController.logout);

router.get('/me', protect, loginController.authMe);

router.post('/register', protect, loginController.register);

export default router;
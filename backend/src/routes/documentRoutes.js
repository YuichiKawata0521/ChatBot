import express from 'express';
import * as documentController from '../controllers/documentController.js';
import { authorizeRoles, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // 認証必須

router.route('/')
    .get(documentController.getDocuments)
    .post(authorizeRoles('admin'), documentController.createDocument); // 登録は管理者のみ

export default router;
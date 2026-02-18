import express from 'express';
import multer from 'multer';
import * as documentController from '../controllers/documentController.js';
import { authorizeRoles, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

router.use(protect); // 認証必須
router.use(authorizeRoles('admin'));

router.route('/')
    .get(documentController.getDocuments)
    .post(documentController.createDocument); // 登録は管理者のみ

router.post('/upload', upload.single('file'), documentController.uploadDocument);

export default router;
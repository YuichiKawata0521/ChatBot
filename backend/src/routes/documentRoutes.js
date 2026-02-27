import express from 'express';
import multer from 'multer';
import * as documentController from '../controllers/documentController.js';
import * as docManageController from '../controllers/docManageController.js';
import { authorizeRoles, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

router.use(protect); // 認証必須
router.use(authorizeRoles('admin'));

router.route('/')
    .get(documentController.getDocuments)
    .post(documentController.createDocument); // 登録は管理者のみ

router.get('/:id', docManageController.getDocContent);

router.post('/upload', upload.single('file'), documentController.uploadDocument);

router.post('/delete/:id', docManageController.deleteDocument)
router.post('/file/:id', upload.single('file'), docManageController.reUploadDocument);
router.post('/rename/:id', docManageController.updateTitle);
export default router;
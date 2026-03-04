import express from 'express';
import multer from 'multer';
import * as userController from '../controllers/userController.js';
import { authorizeRoles, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

router.use(protect); // 認証必須
router.use(authorizeRoles('admin'));

router.get('/departments', userController.getDepartments);
router.get('/csv-template', userController.downloadUserCsvTemplate);
router.post('/csv', upload.single('file'), userController.uploadUsersCsv);

router.route('/')
    .get(userController.getUsers)
    .post(userController.createUser)
router.route('/:id')
    .put(userController.updateUser)
    .delete(userController.deleteUser);

export default router;
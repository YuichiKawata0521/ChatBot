import express from 'express';
import * as userController from '../controllers/userController.js';
import { authorizeRoles, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // 認証必須
router.use(authorizeRoles('admin'));

router.route('/')
    .get(userController.getUsers)
    .post(userController.createUser)

export default router;
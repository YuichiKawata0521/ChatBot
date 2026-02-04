import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { protect, authorizeRoles } from '../middlewares/authMiddleware';

const router = express.Router();

// frontendディレクトリ構造が分からないからかけない
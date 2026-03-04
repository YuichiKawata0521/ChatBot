import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authorizeRoles, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/operation/kpi', dashboardController.getOperationKpiSummary);
router.get('/operation/trend', dashboardController.getOperationTrend);
router.get('/operation/rag-quality', dashboardController.getOperationRagQuality);
router.get('/operation/cost', dashboardController.getOperationCost);
router.get('/operation/low-usage-departments', dashboardController.getLowUsageDepartmentRanking);
router.get('/analysis/active-user-trend', dashboardController.getAnalysisActiveUserTrend);
router.get('/analysis/rag-quality-trend', dashboardController.getAnalysisRagQualityTrend);
router.get('/analysis/rag-quality-details', dashboardController.getAnalysisRagQualityDailyDetails);
router.get('/analysis/department-usage', dashboardController.getAnalysisDepartmentUsage);
router.get('/analysis/department-members', dashboardController.getAnalysisDepartmentMembers);
router.get('/analysis/cost-trend', dashboardController.getAnalysisCostTrend);

export default router;

import { dashboardAnalysisQueries } from './dashboard/analysisQueries.js';
import { dashboardOperationQueries } from './dashboard/operationQueries.js';

export const dashboardModel = {
    ...dashboardAnalysisQueries,
    ...dashboardOperationQueries
};

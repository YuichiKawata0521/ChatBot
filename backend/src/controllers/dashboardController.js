import { getPool } from '../config/db.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';
import { dashboardModel } from '../models/dashboardModel.js';
import { getEnvValue } from '../utils/envUtils.js';
import {
    safeNumber,
    safeDivide,
    safeRate,
    formatTokyoYmd,
    isValidYmd,
    buildAnalysisDateRange,
    buildDateContext,
    resolveRequestedScope,
    getDepartmentFilters
} from '../utils/dashboardUtils.js';
import {
    getMasterUserIdentities,
    buildMasterDepartmentSet,
    isMasterDepartmentRow
} from '../utils/masterIdentityUtils.js';

export const getOperationKpiSummary = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();
        const dateContext = buildDateContext(resolveRequestedScope(req.query));

        const [dauMetrics, ragMetrics, retentionMetrics, errorMetrics] = await Promise.all([
            dashboardModel.getDauMetrics(pool, masterIdentities, dateContext),
            dashboardModel.getRagUsageMetrics(pool, masterIdentities, dateContext),
            dashboardModel.getRetentionMetrics(pool, masterIdentities, dateContext),
            dashboardModel.getErrorRateMetrics(pool, masterIdentities, dateContext)
        ]);

        const activeUsersToday = safeNumber(dauMetrics.dau_today);
        const activeUsersYesterday = safeNumber(dauMetrics.dau_yesterday);

        const totalMessagesToday = safeNumber(ragMetrics.total_user_messages_today);
        const totalMessagesYesterday = safeNumber(ragMetrics.total_user_messages_yesterday);
        const ragModeMessagesToday = safeNumber(ragMetrics.rag_user_messages_today);
        const ragModeMessagesYesterday = safeNumber(ragMetrics.rag_user_messages_yesterday);

        const totalBotMessagesToday = safeNumber(errorMetrics.total_bot_messages_today);
        const totalBotMessagesYesterday = safeNumber(errorMetrics.total_bot_messages_yesterday);
        const errorMessagesToday = safeNumber(errorMetrics.error_messages_today);
        const errorMessagesYesterday = safeNumber(errorMetrics.error_messages_yesterday);

        const responseData = {
            activeUsersToday,
            totalMessagesToday,
            ragModeMessagesToday,
            retention: {
                firstUseUsers: safeNumber(retentionMetrics.first_use_users),
                reusedWithin7Days: safeNumber(retentionMetrics.reused_within_7_days),
                reusedWithin30Days: safeNumber(retentionMetrics.reused_within_30_days)
            },
            errorMessagesToday,
            totalBotMessagesToday,
            previousDay: {
                dau: activeUsersYesterday,
                ragUsageRate: safeDivide(ragModeMessagesYesterday, totalMessagesYesterday),
                errorRate: safeDivide(errorMessagesYesterday, totalBotMessagesYesterday)
            },
            scope: dateContext.scope,
            monthLabel: dateContext.monthLabel,
            fetchedAt: new Date().toISOString()
        };

        res.status(200).json({
            success: true,
            data: responseData
        });
    } catch (error) {
        logger.error('運用KPIサマリー取得エラー', {option: {detail: error.message}});
        next(new AppError('運用KPIサマリーの取得に失敗しました', 500));
    }
};

export const getOperationTrend = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();
        const dateContext = buildDateContext(resolveRequestedScope(req.query));

        const trendRows = await dashboardModel.getOperationTrendSeries(pool, masterIdentities, dateContext);

        const data = {
            scope: dateContext.scope,
            monthLabel: dateContext.monthLabel,
            labels: trendRows.map((row) => row.target_date),
            messageCounts: trendRows.map((row) => safeNumber(row.message_count)),
            activeUserCounts: trendRows.map((row) => safeNumber(row.active_user_count))
        };

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('利用トレンド取得エラー', {option: {detail: error.message}});
        next(new AppError('利用トレンドの取得に失敗しました', 500));
    }
};

export const getOperationRagQuality = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();
        const dateContext = buildDateContext(resolveRequestedScope(req.query));

        const ragQualityMetrics = await dashboardModel.getRagQualityMetrics(pool, masterIdentities, dateContext);

        const ragResponseCount = safeNumber(ragQualityMetrics.rag_response_count);
        const hitResponseCount = safeNumber(ragQualityMetrics.hit_response_count);
        const hitRate = safeDivide(hitResponseCount, ragResponseCount);
        const avgParentChunkCount = Number(ragQualityMetrics.avg_parent_chunk_count || 0);

        res.status(200).json({
            success: true,
            data: {
                scope: dateContext.scope,
                monthLabel: dateContext.monthLabel,
                ragResponseCount,
                hitResponseCount,
                hitRate,
                avgParentChunkCount
            }
        });
    } catch (error) {
        logger.error('RAG精度・品質指標取得エラー', {option: {detail: error.message}});
        next(new AppError('RAG精度・品質指標の取得に失敗しました', 500));
    }
};

export const getOperationCost = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();
        const dateContext = buildDateContext(resolveRequestedScope(req.query));

        const tokenMetrics = await dashboardModel.getCostTokenMetrics(pool, masterIdentities, dateContext);

        const inputRatePer1kUsd = safeRate(getEnvValue('OPENAI_INPUT_COST_PER_1K_USD', 'COST_INPUT_USD_PER_1K'), 0.00015);
        const outputRatePer1kUsd = safeRate(getEnvValue('OPENAI_OUTPUT_COST_PER_1K_USD', 'COST_OUTPUT_USD_PER_1K'), 0.0006);

        const totalInputTokens = safeNumber(tokenMetrics.total_input_tokens);
        const totalOutputTokens = safeNumber(tokenMetrics.total_output_tokens);
        const completionCount = safeNumber(tokenMetrics.completion_count);

        const estimatedCostUsd =
            ((totalInputTokens / 1000) * inputRatePer1kUsd)
            + ((totalOutputTokens / 1000) * outputRatePer1kUsd);
        const roundedEstimatedCostUsd = Number(estimatedCostUsd.toFixed(5));

        res.status(200).json({
            success: true,
            data: {
                scope: dateContext.scope,
                monthLabel: dateContext.monthLabel,
                totalInputTokens,
                totalOutputTokens,
                completionCount,
                inputRatePer1kUsd,
                outputRatePer1kUsd,
                estimatedCostUsd: roundedEstimatedCostUsd
            }
        });
    } catch (error) {
        logger.error('運用コスト取得エラー', {option: {detail: error.message}});
        next(new AppError('運用コストの取得に失敗しました', 500));
    }
};

export const getLowUsageDepartmentRanking = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();
        const dateContext = buildDateContext(resolveRequestedScope(req.query));
        const masterDepartmentSet = buildMasterDepartmentSet();

        const rankingRows = await dashboardModel.getLowUsageDepartments(pool, masterIdentities, dateContext);

        const allRanking = rankingRows
            .filter((row) => !isMasterDepartmentRow(row, masterDepartmentSet))
            .map((row, idx) => ({
                rank: idx + 1,
                dep1Name: row.dep1_name || '',
                dep2Name: row.dep2_name || '',
                dep3Name: row.dep3_name || '',
                departmentName: [row.dep1_name, row.dep2_name, row.dep3_name].filter(Boolean).join(' / '),
                messageCount: safeNumber(row.message_count)
            }));

        const topRanking = allRanking.slice(0, 5);

        res.status(200).json({
            success: true,
            data: {
                scope: dateContext.scope,
                monthLabel: dateContext.monthLabel,
                ranking: topRanking,
                allRanking
            }
        });
    } catch (error) {
        logger.error('利用低迷部署ランキング取得エラー', {option: {detail: error.message}});
        next(new AppError('利用低迷部署ランキングの取得に失敗しました', 500));
    }
};

export const getAnalysisActiveUserTrend = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();

        const { period, fromDate, toDate } = buildAnalysisDateRange(req.query || {});
        const { dep1Name, dep2Name, dep3Name } = getDepartmentFilters(req.query);

        const rows = await dashboardModel.getAnalysisActiveUserTrend(pool, masterIdentities, {
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        });

        res.status(200).json({
            success: true,
            data: {
                period,
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                labels: rows.map((row) => row.target_date),
                activeUserCounts: rows.map((row) => safeNumber(row.active_user_count))
            }
        });
    } catch (error) {
        logger.error('分析用アクティブユーザー推移取得エラー', {option: {detail: error.message}});
        next(new AppError('分析用アクティブユーザー推移の取得に失敗しました', 500));
    }
};

export const getAnalysisRagQualityTrend = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();

        const { period, fromDate, toDate } = buildAnalysisDateRange(req.query || {});
        const { dep1Name, dep2Name, dep3Name } = getDepartmentFilters(req.query);

        const rows = await dashboardModel.getAnalysisRagQualityTrend(pool, masterIdentities, {
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        });

        const ragResponseCounts = rows.map((row) => safeNumber(row.rag_response_count));
        const hitResponseCounts = rows.map((row) => safeNumber(row.hit_response_count));
        const ratedResponseCounts = rows.map((row) => safeNumber(row.rated_response_count));
        const goodResponseCounts = rows.map((row) => safeNumber(row.good_response_count));

        res.status(200).json({
            success: true,
            data: {
                period,
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                labels: rows.map((row) => formatTokyoYmd(row.target_date)),
                ragResponseCounts,
                hitResponseCounts,
                ratedResponseCounts,
                goodResponseCounts,
                hitRates: rows.map((row) => safeDivide(safeNumber(row.hit_response_count), safeNumber(row.rag_response_count))),
                accuracyRates: rows.map((row) => safeDivide(safeNumber(row.good_response_count), safeNumber(row.rated_response_count)))
            }
        });
    } catch (error) {
        logger.error('分析用RAG品質推移取得エラー', {option: {detail: error.message}});
        next(new AppError('分析用RAG品質推移の取得に失敗しました', 500));
    }
};

export const getAnalysisRagQualityDailyDetails = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();

        const targetDate = String(req.query?.targetDate || '').trim();
        if (!isValidYmd(targetDate)) {
            return next(new AppError('targetDate は YYYY-MM-DD 形式で指定してください', 400));
        }

        const { dep1Name, dep2Name, dep3Name } = getDepartmentFilters(req.query);

        const rows = await dashboardModel.getAnalysisRagQualityDailyDetails(pool, masterIdentities, {
            targetDate,
            dep1Name,
            dep2Name,
            dep3Name
        });

        res.status(200).json({
            success: true,
            data: {
                targetDate,
                dep1Name,
                dep2Name,
                dep3Name,
                items: rows.map((row) => ({
                    messageId: safeNumber(row.message_id),
                    createdAt: row.created_at,
                    threadId: safeNumber(row.thread_id),
                    threadTitle: row.thread_title || '',
                    userName: row.user_name || '',
                    dep1Name: row.dep1_name || '',
                    dep2Name: row.dep2_name || '',
                    dep3Name: row.dep3_name || '',
                    rating: row.rating || null,
                    question: row.question_content || '',
                    answer: row.answer_content || '',
                    hasHit: safeNumber(row.has_hit) > 0,
                    maxRelevanceScore: Number(row.max_relevance_score || 0)
                }))
            }
        });
    } catch (error) {
        logger.error('分析用RAG日別詳細取得エラー', {option: {detail: error.message}});
        next(new AppError('分析用RAG日別詳細の取得に失敗しました', 500));
    }
};

export const getAnalysisRatingRecent = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();

        const { period, fromDate, toDate } = buildAnalysisDateRange(req.query || {});
        const { dep1Name, dep2Name, dep3Name } = getDepartmentFilters(req.query);

        const [goodRows, badRows] = await Promise.all([
            dashboardModel.getAnalysisRatedMessages(pool, masterIdentities, {
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                rating: 'good',
                limit: 5
            }),
            dashboardModel.getAnalysisRatedMessages(pool, masterIdentities, {
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                rating: 'bad',
                limit: 5
            })
        ]);

        const mapItem = (row) => ({
            messageId: safeNumber(row.message_id),
            createdAt: row.created_at,
            threadId: safeNumber(row.thread_id),
            threadTitle: row.thread_title || '',
            userName: row.user_name || '',
            dep1Name: row.dep1_name || '',
            dep2Name: row.dep2_name || '',
            dep3Name: row.dep3_name || '',
            rating: row.rating || null,
            question: row.question_content || '',
            answer: row.answer_content || ''
        });

        res.status(200).json({
            success: true,
            data: {
                period,
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                goodItems: goodRows.map(mapItem),
                badItems: badRows.map(mapItem)
            }
        });
    } catch (error) {
        logger.error('分析用レーティング直近データ取得エラー', {option: {detail: error.message}});
        next(new AppError('分析用レーティング直近データの取得に失敗しました', 500));
    }
};

export const getAnalysisRatingList = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();

        const { period, fromDate, toDate } = buildAnalysisDateRange(req.query || {});
        const { dep1Name, dep2Name, dep3Name } = getDepartmentFilters(req.query);
        const rating = String(req.query?.rating || '').trim();

        if (!['good', 'bad'].includes(rating)) {
            return next(new AppError('rating は good または bad を指定してください', 400));
        }

        const rows = await dashboardModel.getAnalysisRatedMessages(pool, masterIdentities, {
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name,
            rating,
            limit: null
        });

        res.status(200).json({
            success: true,
            data: {
                period,
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                rating,
                items: rows.map((row) => ({
                    messageId: safeNumber(row.message_id),
                    createdAt: row.created_at,
                    threadId: safeNumber(row.thread_id),
                    threadTitle: row.thread_title || '',
                    userName: row.user_name || '',
                    dep1Name: row.dep1_name || '',
                    dep2Name: row.dep2_name || '',
                    dep3Name: row.dep3_name || '',
                    rating: row.rating || null,
                    question: row.question_content || '',
                    answer: row.answer_content || ''
                }))
            }
        });
    } catch (error) {
        logger.error('分析用レーティング一覧取得エラー', {option: {detail: error.message}});
        next(new AppError('分析用レーティング一覧の取得に失敗しました', 500));
    }
};

export const getAnalysisDepartmentUsage = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();

        const { period, fromDate, toDate } = buildAnalysisDateRange(req.query || {});
        const { dep1Name, dep2Name, dep3Name } = getDepartmentFilters(req.query);
        const inputRatePer1kUsd = safeRate(getEnvValue('OPENAI_INPUT_COST_PER_1K_USD', 'COST_INPUT_USD_PER_1K'), 0.00015);
        const outputRatePer1kUsd = safeRate(getEnvValue('OPENAI_OUTPUT_COST_PER_1K_USD', 'COST_OUTPUT_USD_PER_1K'), 0.0006);

        const rows = await dashboardModel.getAnalysisDepartmentUsage(pool, masterIdentities, {
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        });

        const totalMessages = rows.reduce((sum, row) => sum + safeNumber(row.message_count), 0);
        const items = rows.map((row) => {
            const messageCount = safeNumber(row.message_count);
            const usageRate = totalMessages > 0 ? (messageCount / totalMessages) * 100 : 0;
            const inputTokens = safeNumber(row.input_tokens);
            const outputTokens = safeNumber(row.output_tokens);
            const estimatedCostUsd = ((inputTokens / 1000) * inputRatePer1kUsd) + ((outputTokens / 1000) * outputRatePer1kUsd);

            return {
                dep1Name: row.dep1_name || '',
                dep2Name: row.dep2_name || '',
                dep3Name: row.dep3_name || '',
                departmentName: [row.dep1_name, row.dep2_name, row.dep3_name].filter(Boolean).join(' / ') || '未設定',
                messageCount,
                activeUserCount: safeNumber(row.active_user_count),
                usageRate: Number(usageRate.toFixed(2)),
                inputTokens,
                outputTokens,
                estimatedCostUsd: Number(estimatedCostUsd.toFixed(5))
            };
        });

        res.status(200).json({
            success: true,
            data: {
                period,
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                inputRatePer1kUsd,
                outputRatePer1kUsd,
                totalMessages,
                items
            }
        });
    } catch (error) {
        logger.error('分析用部署別利用割合取得エラー', {option: {detail: error.message}});
        next(new AppError('分析用部署別利用割合の取得に失敗しました', 500));
    }
};

export const getAnalysisDepartmentMembers = async (req, res, next) => {
    try {
        const pool = getPool();
        const masterIdentities = getMasterUserIdentities();

        const { period, fromDate, toDate } = buildAnalysisDateRange(req.query || {});
        const { dep1Name, dep2Name, dep3Name } = getDepartmentFilters(req.query);

        if (!dep1Name && !dep2Name && !dep3Name) {
            return next(new AppError('部署情報が指定されていません', 400));
        }

        const rows = await dashboardModel.getAnalysisDepartmentMembers(pool, masterIdentities, {
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        });

        const items = rows.map((row) => {
            const messageCount = safeNumber(row.message_count);
            const ragMessageCount = safeNumber(row.rag_message_count);
            const ragUsageRate = messageCount > 0 ? (ragMessageCount / messageCount) * 100 : 0;

            return {
                userId: safeNumber(row.user_id),
                employeeNo: row.employee_no || '',
                userName: row.user_name || '',
                email: row.email || '',
                dep1Name: row.dep1_name || '',
                dep2Name: row.dep2_name || '',
                dep3Name: row.dep3_name || '',
                messageCount,
                ragMessageCount,
                ragUsageRate: Number(ragUsageRate.toFixed(2)),
                lastMessageAt: row.last_message_at || null
            };
        });

        res.status(200).json({
            success: true,
            data: {
                period,
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                departmentName: [dep1Name, dep2Name, dep3Name].filter(Boolean).join(' / ') || '未設定',
                memberCount: items.length,
                items
            }
        });
    } catch (error) {
        logger.error('分析用部署所属社員一覧取得エラー', {option: {detail: error.message}});
        next(new AppError('分析用部署所属社員一覧の取得に失敗しました', 500));
    }
};

export const getAnalysisCostTrend = async (req, res, next) => {
    try {
        const pool = getPool();

        const { period, fromDate, toDate } = buildAnalysisDateRange(req.query || {});
        const { dep1Name, dep2Name, dep3Name } = getDepartmentFilters(req.query);

        const inputRatePer1kUsd = safeRate(getEnvValue('OPENAI_INPUT_COST_PER_1K_USD', 'COST_INPUT_USD_PER_1K'), 0.00015);
        const outputRatePer1kUsd = safeRate(getEnvValue('OPENAI_OUTPUT_COST_PER_1K_USD', 'COST_OUTPUT_USD_PER_1K'), 0.0006);

        const rows = await dashboardModel.getAnalysisCostTrend(pool, {
            fromDate,
            toDate,
            dep1Name,
            dep2Name,
            dep3Name
        });

        const costAmounts = rows.map((row) => {
            const inputTokens = safeNumber(row.input_tokens);
            const outputTokens = safeNumber(row.output_tokens);
            const dailyCost = ((inputTokens / 1000) * inputRatePer1kUsd) + ((outputTokens / 1000) * outputRatePer1kUsd);
            return Number(dailyCost.toFixed(5));
        });

        res.status(200).json({
            success: true,
            data: {
                period,
                fromDate,
                toDate,
                dep1Name,
                dep2Name,
                dep3Name,
                inputRatePer1kUsd,
                outputRatePer1kUsd,
                labels: rows.map((row) => row.target_date),
                inputTokens: rows.map((row) => safeNumber(row.input_tokens)),
                outputTokens: rows.map((row) => safeNumber(row.output_tokens)),
                costAmounts
            }
        });
    } catch (error) {
        logger.error('分析用コスト推移取得エラー', {option: {detail: error.message}});
        next(new AppError('分析用コスト推移の取得に失敗しました', 500));
    }
};

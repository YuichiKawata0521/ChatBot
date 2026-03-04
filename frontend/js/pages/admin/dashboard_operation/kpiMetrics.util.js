const safeDivide = (numerator, denominator) => {
    if (!denominator) return 0;
    return numerator / denominator;
};

export const calculateOperationKpiSummary = (raw) => {
    const dau = Number(raw?.activeUsersToday || 0);
    const ragUsageRate = safeDivide(
        Number(raw?.ragModeMessagesToday || 0),
        Number(raw?.totalMessagesToday || 0)
    );

    const firstUseUsers = Number(raw?.retention?.firstUseUsers || 0);
    const retention7dRate = safeDivide(
        Number(raw?.retention?.reusedWithin7Days || 0),
        firstUseUsers
    );
    const retention30dRate = safeDivide(
        Number(raw?.retention?.reusedWithin30Days || 0),
        firstUseUsers
    );

    const errorRate = safeDivide(
        Number(raw?.errorMessagesToday || 0),
        Number(raw?.totalBotMessagesToday || 0)
    );

    return {
        dau,
        ragUsageRate,
        retention7dRate,
        retention30dRate,
        errorRate,
        previousDay: {
            dau: Number(raw?.previousDay?.dau || 0),
            ragUsageRate: Number(raw?.previousDay?.ragUsageRate || 0),
            errorRate: Number(raw?.previousDay?.errorRate || 0)
        },
        raw
    };
};

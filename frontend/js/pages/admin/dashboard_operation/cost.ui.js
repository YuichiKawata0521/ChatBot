const formatUsd = (value) => {
    const amount = Number(value || 0);
    return `$${amount.toFixed(5)}`;
};

export const renderOperationCost = (costData) => {
    const costEl = document.getElementById('estimated-cost');
    if (!costEl) return;

    costEl.textContent = formatUsd(costData?.estimatedCostUsd);
};

export function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function parseDateAtStartOfDay(dateValue) {
    if (!dateValue) return null;
    const date = new Date(`${dateValue}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateAtEndOfDay(dateValue) {
    if (!dateValue) return null;
    const date = new Date(`${dateValue}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function getLevelBadgeHTML(level = '') {
    const lower = String(level).toLowerCase();
    let badgeClass = 'badge-info';
    if (lower === 'error') badgeClass = 'badge-error';
    if (lower === 'warn') badgeClass = 'badge-warn';
    return `<span class="badge ${badgeClass}">${String(level).toUpperCase()}</span>`;
}

export function escapeCsvCell(value) {
    const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
    return `"${normalized.replace(/"/g, '""')}"`;
}

export function formatFileTimestamp(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function resolveUserName(log) {
    if (log?.user_name) return log.user_name;
    if (log?.context?.option?.user_name) return log.context.option.user_name;
    if (log?.user_id) return String(log.user_id);
    return 'system';
}

export function formatContextForCsv(context) {
    if (!context) return '';
    try {
        return JSON.stringify(context);
    } catch {
        return String(context);
    }
}

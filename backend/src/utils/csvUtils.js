export const CSV_HEADERS = [
    'employee_no',
    'username',
    'email',
    'role',
    'dep1_code',
    'dep1_name',
    'dep2_code',
    'dep2_name',
    'dep3_code',
    'dep3_name'
];

const parseCsvLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }
    values.push(current.trim());
    return values;
};

export const parseCsv = (csvContent) => {
    const normalized = String(csvContent || '')
        .replace(/^\uFEFF/, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    const lines = normalized
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length < 2) {
        return [];
    }

    const headerColumns = parseCsvLine(lines[0]).map((col) => col.replace(/^\uFEFF/, '').trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const row = {};

        headerColumns.forEach((header, idx) => {
            row[header] = (values[idx] || '').trim();
        });

        rows.push(row);
    }

    return rows;
};

export const normalizeDepartmentValue = (value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : null;
};

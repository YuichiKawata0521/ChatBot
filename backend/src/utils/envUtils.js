export const getEnvValue = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (value !== undefined && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
};

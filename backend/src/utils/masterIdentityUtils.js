import { getEnvValue } from './envUtils.js';

const normalizeDepartmentPart = (value) => {
    const normalized = String(value || '').trim();
    return normalized.length ? normalized : '';
};

const toDepartmentKey = (prefix) => [
    normalizeDepartmentPart(getEnvValue(`${prefix}_dep1_code`, `${prefix}_DEP1_CODE`)),
    normalizeDepartmentPart(getEnvValue(`${prefix}_dep1_name`, `${prefix}_DEP1_NAME`)),
    normalizeDepartmentPart(getEnvValue(`${prefix}_dep2_code`, `${prefix}_DEP2_CODE`)),
    normalizeDepartmentPart(getEnvValue(`${prefix}_dep2_name`, `${prefix}_DEP2_NAME`)),
    normalizeDepartmentPart(getEnvValue(`${prefix}_dep3_code`, `${prefix}_DEP3_CODE`)),
    normalizeDepartmentPart(getEnvValue(`${prefix}_dep3_name`, `${prefix}_DEP3_NAME`))
].join('|');

export const getMasterUserIdentities = () => {
    const employeeNos = [
        getEnvValue('MASTER_ADMIN_EMPLOYEE_NO'),
        getEnvValue('MASTER_USER_EMPLOYEE_NO')
    ].filter((value) => !!value);

    const emails = [
        getEnvValue('MASTER_ADMIN_EMAIL'),
        getEnvValue('MASTER_USER_EMAIL')
    ].map((value) => String(value || '').toLowerCase()).filter((value) => !!value);

    return { employeeNos, emails };
};

export const buildMasterUserIdentitySet = () => {
    const identities = new Set();

    const adminEmployeeNo = getEnvValue('MASTER_ADMIN_EMPLOYEE_NO');
    const adminEmail = getEnvValue('MASTER_ADMIN_EMAIL');
    const userEmployeeNo = getEnvValue('MASTER_USER_EMPLOYEE_NO');
    const userEmail = getEnvValue('MASTER_USER_EMAIL');

    if (adminEmployeeNo) identities.add(`employee_no:${adminEmployeeNo}`);
    if (adminEmail) identities.add(`email:${adminEmail.toLowerCase()}`);
    if (userEmployeeNo) identities.add(`employee_no:${userEmployeeNo}`);
    if (userEmail) identities.add(`email:${userEmail.toLowerCase()}`);

    return identities;
};

export const buildMasterDepartmentSet = () => new Set([
    toDepartmentKey('MASTER_ADMIN'),
    toDepartmentKey('MASTER_USER')
]);

export const isMasterUserRow = (row, identitySet) => {
    const employeeNoKey = `employee_no:${String(row.employee_no || '').trim()}`;
    const emailKey = `email:${String(row.email || '').trim().toLowerCase()}`;
    return identitySet.has(employeeNoKey) || identitySet.has(emailKey);
};

export const isMasterDepartmentRow = (row, departmentSet) => {
    const key = [
        String(row.dep1_code || '').trim(),
        String(row.dep1_name || '').trim(),
        String(row.dep2_code || '').trim(),
        String(row.dep2_name || '').trim(),
        String(row.dep3_code || '').trim(),
        String(row.dep3_name || '').trim()
    ].join('|');
    return departmentSet.has(key);
};

export const EXCLUDE_TZ = 'Asia/Tokyo';

export const buildMasterIdentityParams = (masterIdentities = {}) => {
    const employeeNos = (masterIdentities.employeeNos || []).filter((value) => !!value);
    const emails = (masterIdentities.emails || []).map((value) => String(value).toLowerCase()).filter((value) => !!value);
    return { employeeNos, emails };
};

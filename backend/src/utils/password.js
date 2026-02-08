import argon2 from 'argon2';
import { PASSWORD_PEPPER, ARGON2_OPTIONS } from '../config/security.js';

export const hashPassword = async (plainPassword) => {
    const pepperedPassword = plainPassword + PASSWORD_PEPPER;
    return argon2.hash(pepperedPassword, ARGON2_OPTIONS);
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
    const pepperedPassword = plainPassword + PASSWORD_PEPPER;
    return argon2.verify(hashedPassword, pepperedPassword);
};
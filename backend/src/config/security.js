if (!process.env.PASSWORD_PEPPER) {
  throw new Error('PASSWORD_PEPPER is not defined');
}

export const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER;

/**
 * argon2id 推奨パラメータ（Webアプリ向け）
 */
export const ARGON2_OPTIONS = {
  type: 2,           // argon2id
  memoryCost: 2 ** 16, // 64MB
  timeCost: 3,
  parallelism: 1,
};

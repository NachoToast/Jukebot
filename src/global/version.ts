 
export const version = process.env.npm_package_version ?? (require('../../package.json').version as string);

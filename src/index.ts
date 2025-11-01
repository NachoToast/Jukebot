import { connectToDiscord, loadAppConfig } from './loaders';

const appConfig = loadAppConfig();

await connectToDiscord(appConfig);

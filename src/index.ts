import { initialiseDatabaseService } from "./services/DatabaseService/initialise";
import { initialiseDiscordService } from "./services/DiscordService/initialise";
import { initialiseWebService } from "./services/WebService/initialise";
import { Color } from "./types/Color";
import { colorize } from "./utils/colorize";
import { log } from "./utils/logging";

await Promise.all([
	initialiseDiscordService(),
	initialiseDatabaseService(),
	initialiseWebService(),
]);

log(colorize("Jukebot is now running!", Color.FgGreen));

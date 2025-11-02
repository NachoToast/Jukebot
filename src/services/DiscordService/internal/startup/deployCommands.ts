import { DatabaseService } from '@services';
import { Color } from '@types';
import { colorize, log } from '@utils';
import {
    InteractionContextType,
    OAuth2Guild,
    REST,
    Routes,
    SlashCommandBuilder,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import { commands } from '../commands';
import { client } from '../state';

export async function deployCommands(): Promise<void> {
    const body = commands.map((command) => {
        const built = new SlashCommandBuilder()
            .setName(command.name)
            .setDescription(command.description)
            .setContexts(InteractionContextType.Guild);

        command.build?.(built);

        return built.toJSON();
    });

    const commandsString = JSON.stringify(body, null, 0);

    const { local, global } = await DatabaseService.evaluateDeployment(
        client.user.id,
        commandsString,
    );

    if (local === null && global === null) {
        log(`Skipping command deployment (no changes needed)`);
        return;
    }

    const promiseArr: Promise<void>[] = [];

    if (local !== null) {
        promiseArr.push(deployLocal(body, local));
    }

    if (global !== null) {
        promiseArr.push(deployGlobal(body, global));
    }

    await Promise.all(promiseArr);

    await DatabaseService.saveDeployment(client.user.id, commandsString);
}

async function deployLocal(
    body: RESTPostAPIChatInputApplicationCommandsJSONBody[],
    deploy: boolean,
): Promise<void> {
    const rest = new REST().setToken(client.token);

    const allGuilds = await client.guilds.fetch();

    const updateCommandsFor = deploy
        ? async (guild: OAuth2Guild): Promise<void> => {
              try {
                  await rest.put(Routes.applicationGuildCommands(client.application.id, guild.id), {
                      body,
                  });
                  log(`Deployed slash commands to ${colorize(guild.name, Color.FgMagenta)}`);
              } catch (error) {
                  log(
                      `Failed to deploy slash commands to ${colorize(guild.name, Color.FgMagenta)}`,
                      error,
                  );
              }
          }
        : async (guild: OAuth2Guild): Promise<void> => {
              try {
                  await rest.put(Routes.applicationGuildCommands(client.application.id, guild.id), {
                      body: [],
                  });
                  log(`Undeployed slash commands from ${colorize(guild.name, Color.FgMagenta)}`);
              } catch (error) {
                  log(
                      `Failed to undeploy slash commands from ${colorize(
                          guild.name,
                          Color.FgMagenta,
                      )}`,
                      error,
                  );
              }
          };

    await Promise.all(allGuilds.map((guild) => updateCommandsFor(guild)));
}

async function deployGlobal(
    body: RESTPostAPIChatInputApplicationCommandsJSONBody[],
    deploy: boolean,
): Promise<void> {
    const rest = new REST().setToken(client.token);

    if (deploy) {
        try {
            await rest.put(Routes.applicationCommands(client.application.id), { body });
            log(`Deployed ${body.length.toLocaleString()} slash commands globally`);
        } catch (error) {
            log(`Failed to deploy slash commands globally`, error);
        }
    } else {
        try {
            await rest.put(Routes.applicationCommands(client.application.id), { body: [] });
            log(`Undeployed all slash commands globally`);
        } catch (error) {
            log(`Failed to undeploy slash commands globally`, error);
        }
    }
}

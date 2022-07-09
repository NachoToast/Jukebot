import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, extname } from 'path';

export enum DuplicateLogBehaviour {
    /** Will add new logs onto existing file. */
    Append,
    /** Will replace existing file with new logs. */
    Replace,
    /** Will make another file for new logs. */
    MakeNew,
}

export class Logger {
    public static readonly GLOBAL_LOG_FOLDER = `logs`;

    public readonly fileName: string;

    /**
     * @param {String} fileName Name of this log file, including any nested folders **and** the extension.
     * @param {DirectionSetting} behaviour How to handle duplicate files with this name.
     */
    public constructor(fileName: string, behaviour: DuplicateLogBehaviour) {
        Logger.makeFolder(Logger.GLOBAL_LOG_FOLDER);
        Logger.makeParentFolders(fileName);

        if (behaviour === DuplicateLogBehaviour.MakeNew) {
            this.fileName = Logger.nameLogFile(dirname(fileName));
        } else {
            this.fileName = `${Logger.GLOBAL_LOG_FOLDER}/${fileName}`;
        }

        if (!existsSync(this.fileName) || behaviour === DuplicateLogBehaviour.Replace) {
            writeFileSync(this.fileName, ``, `utf-8`);
        }
    }

    private parseToString(data: unknown): string {
        switch (typeof data) {
            case `string`:
                return data;
            case `boolean`:
                return data ? `true` : `false`;
            case `undefined`:
                return `undefined`;
            case `bigint`:
            case `function`:
            case `number`:
            case `symbol`:
                return data.toString();
            case `object`:
                break;
        }

        if (data === null) return `null`;
        if (Array.isArray(data)) return data.map((e) => this.parseToString(e)).join(`\n`);

        try {
            return JSON.stringify(data, undefined, 2);
        } catch (error) {
            console.log(error);
            return `${data}`;
        }
    }

    public logWithConsole(...messages: unknown[]): void {
        console.log(...messages);

        this.log(...messages);
    }

    public log(...messages: unknown[]): void {
        if (!messages.length) throw new Error(`Cannot log nothing to ${this.fileName}`);

        const timestamp = `[${new Date().toLocaleString(`en-NZ`)}] `;
        const output: string[] = messages.map((e) => this.parseToString(e).replaceAll(/.\[[0-9]{1,2}m/g, ``));
        output[0] = timestamp + output[0];

        for (let i = 1, len = output.length; i < len; i++) {
            output[i] = output[i]
                .split(`\n`)
                .map((e) => `  ` + e)
                .join(`\n`);
        }

        appendFileSync(this.fileName, output.join(`\n`) + `\n`, `utf-8`);
    }

    /**
     * Appends numbers to duplicate log files, e.g.
     * `myLogFile.log`, `myLogFile-1.log`, `myLogFile-2.log`.
     *
     * Only applicable if duplicate log behaviour is set to make new.
     */
    private static nameLogFile(fullPath: string): string {
        const dir = dirname(fullPath);
        const ext = extname(fullPath);

        let currentName = `${Logger.GLOBAL_LOG_FOLDER}/${dir}${ext}`;
        let fileCount = 0;

        while (existsSync(currentName)) {
            currentName = `${Logger.GLOBAL_LOG_FOLDER}/${dir}-${fileCount++}${ext}`;
        }
        return currentName;
    }

    /**
     * Creates nested folders recursively.
     *
     * @throws Throws an error if a parent folder was unable to be created (and did not already exist).
     */
    private static makeParentFolders(fullPath: string): void {
        // split path into its subfolders
        const parentDirectories = fullPath.split(/[/\\]/).slice(0, -1);

        // start at highest level
        let recursivePath = `${Logger.GLOBAL_LOG_FOLDER}/`;

        for (const folder of parentDirectories) {
            Logger.makeFolder(`${recursivePath}${folder}`);
            recursivePath += `${folder}/`;
        }
    }

    /**
     * Attempts to create a single, non-nested folder.
     *
     * @throws An error if creation failed, unless the failure reason was that the folder already existed.
     */
    private static makeFolder(name: string): void {
        try {
            mkdirSync(name);
        } catch (error) {
            if ((error as { code?: string })?.code !== `EEXIST`) {
                throw error;
            }
        }
    }
}

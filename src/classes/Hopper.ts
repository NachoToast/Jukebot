import { JukebotGlobals } from '../global';
import { QueueLengthInfo } from '../types';
import { MusicDisc } from './MusicDisc';

/** Represents a queue of MusicDiscs. */
export class Hopper {
    private readonly _maxSize: number;

    public constructor(maxSize: number = JukebotGlobals.config.maxQueueSize) {
        this._maxSize = maxSize;
    }

    private _inventory: MusicDisc[] = [];

    public isFull(): boolean {
        return this._inventory.length >= this._maxSize;
    }

    public getFreeSlots(): number {
        return this._maxSize - this._inventory.length;
    }

    public getNext(): MusicDisc | undefined {
        return this._inventory.shift();
    }

    public addItems(items: MusicDisc[], startIndex?: number): void {
        if (startIndex !== undefined) this._inventory.splice(startIndex, 0, ...items);
        else this._inventory.push(...items);
    }

    public removeItems(startIndex: number, deleteCount?: number): void {
        this._inventory.splice(startIndex, deleteCount);
    }

    public clear(): void {
        this._inventory = [];
    }

    public shuffle(): void {
        this._inventory.sort(() => Math.random() - 0.5);
    }

    public getLength(): QueueLengthInfo {
        let totalDuration = 0;
        let durationTillFirstLive = 0;
        let numLiveVideos = 0;

        for (const disc of this._inventory) {
            if (disc.isLive) numLiveVideos++;
            else {
                totalDuration += disc.durationSeconds;
                if (numLiveVideos === 0) durationTillFirstLive += disc.durationSeconds;
            }
        }

        return { totalItems: this._inventory.length, totalDuration, durationTillFirstLive, numLiveVideos };
    }
}

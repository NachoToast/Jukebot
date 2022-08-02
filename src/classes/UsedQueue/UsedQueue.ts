export class UsedQueue<T> {
    public static readonly MaxSize: number = 6;

    private _items: T[] = [];

    public addItems(...items: T[]): void {
        this._items.push(...items);
        if (this._items.length > UsedQueue.MaxSize) {
            this._items.splice(0, this._items.length - UsedQueue.MaxSize);
        }
    }

    public getItems(): T[] {
        return this._items;
    }

    public clear(): void {
        this._items = [];
    }

    public get length(): number {
        return this._items.length;
    }
}

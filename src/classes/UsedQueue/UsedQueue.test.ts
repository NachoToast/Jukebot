import { UsedQueue } from './UsedQueue';

describe(`UsedQueue`, () => {
    it(`Doesn't store more items than configured`, () => {
        const myQueue = new UsedQueue<number>();

        for (let i = 0, len = UsedQueue.MaxSize + 10; i < len; i++) {
            myQueue.addItems(i);
        }

        expect(myQueue.getItems().length).toBe(UsedQueue.MaxSize);
    });

    it(`Stores items in a predictable order`, () => {
        const myQueue = new UsedQueue<number>();

        const firstInsertion = new Array<number>(5).fill(-1).map((_, i) => i);
        firstInsertion.forEach((e) => myQueue.addItems(e));

        expect(myQueue.getItems()).toEqual(firstInsertion.slice(-UsedQueue.MaxSize));

        myQueue.clear();

        const secondInsertion = new Array<number>(15).fill(-1).map((_, i) => i);
        secondInsertion.forEach((e) => myQueue.addItems(e));

        expect(myQueue.getItems()).toEqual(secondInsertion.slice(-UsedQueue.MaxSize));
    });
});

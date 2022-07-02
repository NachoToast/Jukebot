import { DiscImages } from '../types/DiscImages';

export const defaultDiscArray: DiscImages[] = [
    DiscImages.Thirteen,
    DiscImages.Cat,
    DiscImages.Blocks,
    DiscImages.Chirp,
    DiscImages.Far,
    DiscImages.Mall,
    DiscImages.Mellohi,
    DiscImages.Stal,
    DiscImages.Strad,
    DiscImages.Ward,
    DiscImages.Eleven,
    DiscImages.Wait,
    DiscImages.Otherside,
    DiscImages.Five,
    DiscImages.Pigstep,
];

export function chooseRandomDisc(): DiscImages {
    const randomIndex = Math.floor(Math.random() * defaultDiscArray.length);
    return defaultDiscArray[randomIndex];
}

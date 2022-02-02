import { DiscImages } from '../types/MusicDisc';

export const defaultDiscArray: DiscImages[] = [
    DiscImages.Blocks,
    DiscImages.Cat,
    DiscImages.Chip,
    DiscImages.Eleven,
    DiscImages.Eleven2,
    DiscImages.Far,
    DiscImages.Mall,
    DiscImages.Mellohi,
    DiscImages.Otherwise,
    DiscImages.Pigstep,
    DiscImages.Stal,
    DiscImages.Strad,
    DiscImages.Thirteen,
    DiscImages.Wait,
    DiscImages.Ward,
];

export function chooseRandomDisc(): DiscImages {
    const randomIndex = Math.floor(Math.random() * defaultDiscArray.length);
    return defaultDiscArray[randomIndex];
}

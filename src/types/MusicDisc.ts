export enum DiscImages {
    thirteen = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/a/aa/Music_Disc_13_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20200130150458',

    cat = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/44/Music_Disc_Cat_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20200130151216',

    blocks = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/4e/Music_Disc_Blocks_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080031',

    chirp = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/1/1a/Music_Disc_Chirp_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080100',

    far = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/0/09/Music_Disc_Far_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080114',

    mall = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/0/04/Music_Disc_Mall_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080126',

    mellohi = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/46/Music_Disc_Mellohi_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080138',

    stal = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/7/7e/Music_Disc_Stal_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080151',

    strad = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/4c/Music_Disc_Strad_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080203',

    ward = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/0/0e/Music_Disc_Ward_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080225',

    eleven = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/d/d7/Music_Disc_11_JE2_BE2.png/revision/latest/scale-to-width-down/160?cb=20190717080013',

    wait = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/d/d8/Music_Disc_Wait_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20190717080214',

    pigstep = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/5/5f/Music_Disc_Pigstep_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20200523232941',

    otherside = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/45/Music_Disc_Otherside_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20211020151516',

    eleven_2 = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/47/Music_Disc_11_JE1_BE1.png/revision/latest/scale-to-width-down/160?cb=20191127011614',
}

export const defaultDiscArray: DiscImages[] = [
    DiscImages.blocks,
    DiscImages.cat,
    DiscImages.chirp,
    DiscImages.eleven,
    DiscImages.eleven_2,
    DiscImages.far,
    DiscImages.mall,
    DiscImages.mellohi,
    DiscImages.otherside,
    DiscImages.pigstep,
    DiscImages.stal,
    DiscImages.strad,
    DiscImages.thirteen,
    DiscImages.wait,
    DiscImages.ward,
];

/** Input data for a `MusicDisc`. */
export interface InputDiscData {
    title: string;
    duration?: string;
    thumbnail?: string;
    url: string;
}

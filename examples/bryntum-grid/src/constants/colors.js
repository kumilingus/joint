import { util } from "@joint/core";

export const colors = {
    lightPink: '#FFB3BA',
    peach: '#FFDFBA',
    lightYellow: '#FFFFBA',
    mintGreen: '#BAFFC9',
    skyBlue: '#BAE1FF',
    lavender: '#E2C6FF',
    blush: '#FFD6E8',
    paleAqua: '#C9F9FF',
    softLime: '#D4F1B4',
    warmBeige: '#FFE3B3',
    softViolet: '#E8D3FF',
    roseTint: '#F6CACA',
    seafoam: '#C8E9D7',
    lightSand: '#F9E2AE',
    babyBlue: '#CDE7FF',
    apricot: '#FFE6CC',
    paleLilac: '#EADCF8',
    lightMint: '#DFF5E2',
    paleButter: '#FFF5CC',
    coralTint: '#F4D8CD',
    icyBlue: '#E3F1FF',
    lightMagenta: '#FFD0F7',
    mintyWhite: '#D9FFF7'
};

export const darkColors = {
    deepPink: '#C94C7C',
    burntPeach: '#D97B48',
    goldenAmber: '#D6B600',
    forestGreen: '#3B8A57',
    royalBlue: '#3C78D8',
    violet: '#7E57C2',
    dustyRose: '#C06080',
    deepTeal: '#3B9FA1',
    oliveGreen: '#7A9E3F',
    warmTan: '#C59D5F',
    darkLavender: '#8E6BAE',
    brickRed: '#B64B4B',
    pineGreen: '#4E8C72',
    ochre: '#C49B3F',
    steelBlue: '#5A89B6',
    copper: '#C9854A',
    plum: '#9466A1',
    mossGreen: '#78A071',
    mustard: '#C2A13E',
    terracotta: '#B66E52',
    midnightBlue: '#3A4C77',
    magenta: '#B84FA5',
    deepMint: '#4EBE96'
};

export const colorPalette = createColorPalette(colors);
export const darkColorPalette = createColorPalette(darkColors);

function createColorPalette(colors) {
    return Object.keys(colors).map((name) => {
        return {
            color: colors[name],
            text: util.toKebabCase(name).replace(/-/g, " "),
        };
    });
}

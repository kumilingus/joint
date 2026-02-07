import { dia, util } from '@joint/core';

// Male: rectangle (blue)
const maleMarkup = util.svg`
    <rect @selector="body"/>
    <line @selector="deceasedLine"/>
    <text @selector="label"/>
`;

// Female: ellipse (pink)
const femaleMarkup = util.svg`
    <ellipse @selector="body"/>
    <line @selector="deceasedLine"/>
    <text @selector="label"/>
`;

// Unknown: polygon/diamond (gray)
const unknownMarkup = util.svg`
    <polygon @selector="body"/>
    <line @selector="deceasedLine"/>
    <text @selector="label"/>
`;

export const ELEMENT_WIDTH = 50;
export const ELEMENT_HEIGHT = 50;
const COUPLE_GAP = 20;
export const COUPLE_WIDTH = ELEMENT_WIDTH * 2 + COUPLE_GAP;
export const COUPLE_HEIGHT = ELEMENT_HEIGHT;

const commonAttrs = {
    label: {
        textVerticalAnchor: 'top' as const,
        textAnchor: 'middle' as const,
        x: 'calc(0.5*w)',
        y: 'calc(h+4)',
        fontSize: 11,
        fontFamily: 'Arial, helvetica, sans-serif',
        fill: '#333',
        textWrap: {
            width: 'calc(w+20)',
            maxLineCount: 2,
            ellipsis: true
        }
    },
    deceasedLine: {
        display: 'none',
        stroke: '#333',
        strokeWidth: 2,
        x1: 0,
        y1: 0,
        x2: 'calc(w)',
        y2: 'calc(h)'
    }
};

export class MalePerson extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'genogram.MalePerson',
            size: { width: ELEMENT_WIDTH, height: ELEMENT_HEIGHT },
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: '#a8d4f0',
                    stroke: '#4a90c4',
                    strokeWidth: 2,
                    rx: 4,
                    ry: 4
                },
                ...commonAttrs
            }
        };
    }

    preinitialize() {
        this.markup = maleMarkup;
    }
}

export class FemalePerson extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'genogram.FemalePerson',
            size: { width: ELEMENT_WIDTH, height: ELEMENT_HEIGHT },
            attrs: {
                body: {
                    cx: 'calc(0.5*w)',
                    cy: 'calc(0.5*h)',
                    rx: 'calc(0.5*w)',
                    ry: 'calc(0.5*h)',
                    fill: '#f0a8c8',
                    stroke: '#c44a80',
                    strokeWidth: 2
                },
                ...commonAttrs
            }
        };
    }

    preinitialize() {
        this.markup = femaleMarkup;
    }
}

export class UnknownPerson extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'genogram.UnknownPerson',
            size: { width: ELEMENT_WIDTH, height: ELEMENT_HEIGHT },
            attrs: {
                body: {
                    points: `calc(0.5*w),0 calc(w),calc(0.5*h) calc(0.5*w),calc(h) 0,calc(0.5*h)`,
                    fill: '#d0d0d0',
                    stroke: '#808080',
                    strokeWidth: 2
                },
                ...commonAttrs
            }
        };
    }

    preinitialize() {
        this.markup = unknownMarkup;
    }
}

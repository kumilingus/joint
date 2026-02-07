import { dia, shapes, util } from '@joint/core';
import { colors, sizes } from './theme';

// Male: rectangle (blue)
const maleMarkup = util.svg`
    <rect @selector="body"/>
    <path @selector="deceasedCross"/>
    <text @selector="ageLabel"/>
    <text @selector="name"/>
`;

// Female: ellipse (pink)
const femaleMarkup = util.svg`
    <ellipse @selector="body"/>
    <path @selector="deceasedCross"/>
    <text @selector="ageLabel"/>
    <text @selector="name"/>
`;

// Unknown: polygon/diamond (gray)
const unknownMarkup = util.svg`
    <polygon @selector="body"/>
    <path @selector="deceasedCross"/>
    <text @selector="ageLabel"/>
    <text @selector="name"/>
`;

// --- Dimensions ---

const { elementWidth, elementHeight, crossPadding } = sizes;

const commonAttrs = {
    ageLabel: {
        textVerticalAnchor: 'middle' as const,
        textAnchor: 'middle' as const,
        x: 'calc(0.5*w)',
        y: 'calc(0.5*h)',
        fontSize: 16,
        fontFamily: 'Arial, helvetica, sans-serif',
        fontWeight: 'bold' as const,
        fill: colors.dark,
        text: '',
        stroke: colors.white,
        strokeWidth: 3,
        paintOrder: 'stroke' as const
    },
    name: {
        textVerticalAnchor: 'top' as const,
        textAnchor: 'middle' as const,
        x: 'calc(0.5*w)',
        y: 'calc(h+4)',
        fontSize: 11,
        fontFamily: 'Arial, helvetica, sans-serif',
        fill: colors.dark,
        textWrap: {
            width: 'calc(w+20)',
            maxLineCount: 2,
            ellipsis: true
        }
    },
    deceasedCross: {
        display: 'none',
        stroke: colors.dark,
        strokeWidth: 2,
        fill: 'none',
        d: `M ${crossPadding} ${crossPadding} calc(w-${crossPadding}) calc(h-${crossPadding}) M calc(w-${crossPadding}) ${crossPadding} ${crossPadding} calc(h-${crossPadding})`,
        strokeLinecap: 'round' as const
    }
};

export class MalePerson extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'genogram.MalePerson',
            size: { width: elementWidth, height: elementHeight },
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: colors.maleFill,
                    stroke: colors.maleStroke,
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
            size: { width: elementWidth, height: elementHeight },
            attrs: {
                body: {
                    cx: 'calc(0.5*w)',
                    cy: 'calc(0.5*h)',
                    rx: 'calc(0.5*w)',
                    ry: 'calc(0.5*h)',
                    fill: colors.femaleFill,
                    stroke: colors.femaleStroke,
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
            size: { width: elementWidth, height: elementHeight },
            attrs: {
                body: {
                    points: `calc(0.5*w),0 calc(w),calc(0.5*h) calc(0.5*w),calc(h) 0,calc(0.5*h)`,
                    fill: colors.unknownFill,
                    stroke: colors.unknownStroke,
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

// --- Link shapes ---

export class ParentChildLink extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep({
            type: 'genogram.ParentChildLink',
            z: -1,
            attrs: {
                line: {
                    stroke: '#0F1108',
                    strokeWidth: 1.5,
                    targetMarker: null,
                }
            }
        }, super.defaults);
    }
}

export class MateLink extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep({
            type: 'genogram.MateLink',
            z: 2,
            attrs: {
                line: {
                    stroke: colors.mateStroke,
                    strokeWidth: 3,
                    targetMarker: null,
                }
            },
        }, super.defaults);
    }
}

export class IdenticalLink extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep({
            type: 'genogram.IdenticalLink',
            z: 3,
            attrs: {
                line: {
                    stroke: colors.identicalStroke,
                    strokeWidth: 1.5,
                    strokeDasharray: '4 2',
                    targetMarker: null,
                }
            },
        }, super.defaults);
    }
}

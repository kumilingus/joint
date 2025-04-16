import { dia, highlighters } from "@joint/core";

export const effects = {
    CONNECTION_SOURCE: 'connection-source',
    CONNECTION_TARGET: 'connection-target',
    SIBLING: 'sibling'
} as const;

export function addEffect(elementView: dia.CellView, effect: typeof effects[keyof typeof effects]) {
    switch (effect) {
        case effects.CONNECTION_SOURCE:
            highlighters.mask.add(elementView, 'body', effects.CONNECTION_SOURCE, {
                padding: 2,
                attrs: {
                    stroke: '#004DFF',
                    strokeWidth: 2,
                }
            });
            break;
        case effects.CONNECTION_TARGET:
            highlighters.mask.add(elementView, 'body', effects.CONNECTION_TARGET, {
                padding: 2,
                attrs: {
                    stroke: '#004DFF',
                    strokeWidth: 2,
                    strokeDasharray: '5,3',
                }
            });
            break;
        case effects.SIBLING:
            highlighters.opacity.add(elementView, 'root', effects.SIBLING, {
                opacity: 0.7
            });

    }
}

export function removeEffect(paper: dia.Paper, effect: typeof effects[keyof typeof effects]) {
    switch (effect) {
        case effects.CONNECTION_SOURCE:
            highlighters.mask.removeAll(paper, effects.CONNECTION_SOURCE);
            break;
        case effects.CONNECTION_TARGET:
            highlighters.mask.removeAll(paper, effects.CONNECTION_TARGET);
            break;
        case effects.SIBLING:
            highlighters.opacity.removeAll(paper, effects.SIBLING);
            break;
    }
}

export function removeEffects(paper: dia.Paper, effect: typeof effects[keyof typeof effects]) {
    switch (effect) {
        case effects.CONNECTION_SOURCE:
            highlighters.mask.removeAll(paper, effects.CONNECTION_SOURCE);
            break;
        case effects.CONNECTION_TARGET:
            highlighters.mask.removeAll(paper, effects.CONNECTION_TARGET);
            break;
        case effects.SIBLING:
            highlighters.opacity.removeAll(paper, effects.SIBLING);
            break;
    }
}

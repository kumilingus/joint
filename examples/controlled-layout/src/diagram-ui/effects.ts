import { dia, highlighters } from "@joint/core";
import { HIGHLIGHTER_COLOR, VALID_COLOR } from './theme';

export const effects = {
    CONNECTION_SOURCE: 'connection-source',
    CONNECTION_PREVIEW: 'connection-target',
    CONNECTION_CANDIDATE: 'connection-candidate',
    SIBLING: 'sibling'
} as const;

export function addEffect(cellView: dia.CellView, effect: typeof effects[keyof typeof effects]) {
    const selector = cellView.model.isLink() ? 'line' : 'body';
    switch (effect) {
        case effects.CONNECTION_SOURCE:
            highlighters.mask.add(cellView, selector, effects.CONNECTION_SOURCE, {
                padding: 2,
                attrs: {
                    stroke: HIGHLIGHTER_COLOR,
                    strokeWidth: 2,
                }
            });
            break;
        case effects.CONNECTION_PREVIEW:
            highlighters.mask.add(cellView, selector, effects.CONNECTION_PREVIEW, {
                padding: 2,
                attrs: {
                    stroke: HIGHLIGHTER_COLOR,
                    strokeWidth: 2,
                    strokeDasharray: '10,2',
                }
            });
            break;
        case effects.CONNECTION_CANDIDATE:
            highlighters.mask.add(cellView, selector, effects.CONNECTION_CANDIDATE, {
                padding: 0,
                layer: dia.Paper.Layers.BACK,
                attrs: {
                    stroke: VALID_COLOR,
                    strokeWidth: 5
                }
            });
            break;
        case effects.SIBLING:
            highlighters.opacity.add(cellView, 'root', effects.SIBLING, {
                opacity: 0.7
            });
            break;
    }
}

export function removeEffect(paper: dia.Paper, effect: typeof effects[keyof typeof effects]) {
    switch (effect) {
        case effects.CONNECTION_SOURCE:
            highlighters.mask.removeAll(paper, effects.CONNECTION_SOURCE);
            break;
        case effects.CONNECTION_PREVIEW:
            highlighters.mask.removeAll(paper, effects.CONNECTION_PREVIEW);
            break;
        case effects.CONNECTION_CANDIDATE:
            highlighters.mask.removeAll(paper, effects.CONNECTION_CANDIDATE);
            break;
        case effects.SIBLING:
            highlighters.opacity.removeAll(paper, effects.SIBLING);
            break;
    }
}


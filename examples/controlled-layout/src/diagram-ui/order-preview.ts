import { type dia, mvc } from '@joint/core';
import { Button } from '../diagram-engine/shapes';
import { sortChildren } from '../diagram-engine';
import type { DiagramContext } from './DiagramController';
import { addEffect, removeEffects, effects } from './effects';

export function showOrderPreviewOnNextInteraction(ctx: DiagramContext) {
    const { paper, graph, json, updateDiagram } = ctx;
    const listener = new mvc.Listener();
    listener.listenTo(paper, {
        'element:pointermove': (elementView: dia.ElementView, evt: dia.Event, x: number, _y: number) => {
            const data = evt.data;
            const graph = paper.model;
            const element = elementView.model;

            let previewEl = data.preview;
            if (!previewEl) {

                // Find the parent of the element
                const [parent, ...otherParents] = graph.getNeighbors(element, { inbound: true });
                if (!parent || otherParents.length > 0) {
                    listener.stopListening();
                    return;
                }

                // Find all siblings of the element
                const siblings = graph.getNeighbors(parent, { outbound: true })
                    .filter(sibling => sibling !== element)
                    .filter(sibling => !Button.isButton(sibling));
                if (siblings.length === 0) {
                    listener.stopListening();
                    return;
                }

                siblings.forEach(sibling => {
                    addEffect(sibling.findView(paper), effects.SIBLING);
                });

                previewEl = createPreview(elementView);
                paper.viewport.appendChild(previewEl);
                data.preview = previewEl;
            }
            const bbox = element.getBBox();
            previewEl.setAttribute('transform', `translate(${x - bbox.width / 2}, ${bbox.y})`)
        },
        'element:pointerup': (elementView: dia.ElementView, evt: dia.Event, x: number, y: number) => {

            listener.stopListening();

            const data = evt.data;
            if (!data.preview) return;

            removeEffects(paper, effects.SIBLING);
            paper.viewport.removeChild(data.preview);

            const element = elementView.model;
            const [parent] = graph.getNeighbors(element, { inbound: true });

            element.position(x, y);
            sortChildren(json, parent.id, graph);

            updateDiagram();
        }
    });
}

function createPreview(elementView: dia.ElementView) {
    const previewEl = elementView.el.cloneNode(true) as SVGElement;
    previewEl.style.pointerEvents = 'none';
    previewEl.style.opacity = '0.4';
    return previewEl;
}

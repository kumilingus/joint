import { dia, util, linkTools, elementTools } from '@joint/core';
import { Placeholder } from '../diagram-engine/shapes';
import { DiagramContext } from './DiagramController';
import { removeEdge, removeNode } from '../diagram-engine/data-api';
import { isBridge, getChildrenCount } from '../diagram-engine/utils';

export function addLinkTools(ctx: DiagramContext, linkView: dia.LinkView) {
    const { graph, json, updateDiagram } = ctx;
    const link = linkView.model;

    const removeTool = new linkTools.Button({
        markup: util.svg/* xml */`
            <circle r="10" fill="#333" stroke="white" />
            <path d="M -4 -4 4 4 M -4 4 4 -4" stroke="white" stroke-width="2" />
        `,
        distance: '50%',
        disabled: isBridge(graph, link),
        action: () => {
            removeEdge(json, link.source().id, link.target().id);
            updateDiagram({ disableOptimalOrderHeuristic: !isBridge(graph, link) });
        }
    });

    linkView.addTools(new dia.ToolsView({
        name: 'persistent-tool',
        tools: [removeTool]
    }));
}

export function addLinkHoverTools(ctx: DiagramContext, linkView: dia.LinkView) {
    const { paper } = ctx;

    const insertNodeTool = new linkTools.Button({
        attributes: {
            cursor: 'pointer'
        },
        markup: util.svg/* xml */`
            <circle r="10" fill="#fff" stroke="gray"  />
            <path d="M -4 0 4 0 M 0 -4 0 4" stroke="gray" stroke-width="2" />
        `,
        distance: -40,
        action: () => {
            paper.trigger('button:pointerclick', linkView);
        },
    });

    linkView.addTools(new dia.ToolsView({
        name: 'hover-tool',
        tools: [insertNodeTool]
    }));
}

export function addElementTools(ctx: DiagramContext, elementView: dia.ElementView) {
    const { graph, json, updateDiagram, growthLimit } = ctx;
    const element = elementView.model;
    const [parent] = graph.getNeighbors(element, { inbound: true });

    let canBeRemoved = true;
    if (!parent) {
        canBeRemoved = false;
    } else if (Placeholder.isPlaceholder(parent)) {
        canBeRemoved = true;
    } else {
        const maxChildren = growthLimit(parent);
        const currentChildren = getChildrenCount(parent, graph) - 1;
        const possibleChildren = getChildrenCount(element, graph);
        canBeRemoved = currentChildren + possibleChildren <= maxChildren;
    }

    const removeButton = new elementTools.Button({
        markup: util.svg/* xml */`
            <circle r="10" fill="#333" stroke="white" />
            <path d="M -4 -4 4 4 M -4 4 4 -4" stroke="white" stroke-width="2" />
        `,
        x: 'calc(w + 15)',
        y: '50%',
        disabled: !canBeRemoved,
        action: () => {
            removeNode(json, element.id);
            updateDiagram();
        }
    });

    const elementsTools = new dia.ToolsView({
        tools: [removeButton]
    });

    elementView.addTools(elementsTools);
}

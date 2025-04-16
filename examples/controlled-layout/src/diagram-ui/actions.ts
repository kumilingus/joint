import { dia, util, linkTools, elementTools } from '@joint/core';
import { Button, Placeholder } from '../diagram-engine/shapes';
import { addEffect, removeEffect, effects } from './effects';
import { DiagramControllerContext } from './DiagramController';
import { createExistingElementListItem, createNewElementListItem } from '../app/utils';
import { removeEdge, removeNode } from '../diagram-engine/data-api';
import { isBridge, getChildrenCount } from '../diagram-engine/utils';

const connectionsList = document.querySelector<HTMLDivElement>('#connections-list')!;

export function openPlaceholderMenu(ctx: DiagramControllerContext, element: Placeholder) {
    const { paper } = ctx;
    const { x, y } = paper.localToPagePoint(element.getBBox().center());
    connectionsList.style.left = `${x}px`;
    connectionsList.style.top = `${y}px`;
    const scale = paper.scale().sx;
    const clampedScale = Math.max(0.75, Math.min(scale, 1.25));
    connectionsList.style.transform = `scale(${clampedScale}) translate(-50%, 0)`;

    openConnectionsList(ctx, element);
    addEffect(element.findView(paper), effects.CONNECTION_SOURCE);
}

export function openButtonMenu(ctx: DiagramControllerContext, element: Button) {
    const { paper, graph } = ctx;
    const [parent] = graph.getNeighbors(element, { inbound: true });
    // Open the connections list at the buttons's position
    const { x, y } = paper.localToPagePoint(element.getBBox().topMiddle());
    connectionsList.style.left = `${x}px`;
    connectionsList.style.top = `${y}px`;
    const scale = paper.scale().sx;
    const clampedScale = Math.max(0.75, Math.min(scale, 1.25));
    connectionsList.style.transform = `scale(${clampedScale}) translate(-50%, 0)`;

    openConnectionsList(ctx, parent);
    addEffect(parent.findView(paper), effects.CONNECTION_SOURCE);
}

export function positionConnectionsList(ctx: DiagramControllerContext, x: number, y: number) {
    const { paper } = ctx;
    // Open the connections list at the buttons's position
    connectionsList.style.left = `${x}px`;
    connectionsList.style.top = `${y}px`;
    const scale = paper.scale().sx;
    const clampedScale = Math.max(0.75, Math.min(scale, 1.25));
    connectionsList.style.transform = `scale(${clampedScale}) translate(-50%, -50%)`;
}

export function openConnectionsList(ctx: DiagramControllerContext, parent: dia.Element, insertBefore?: dia.Element) {
    const { paper, json } = ctx;

    closeConnectionsList(ctx);
    connectionsList.style.display = 'block';

    const graph = paper.model;

    // New Connections
    const addElementSubtitle = document.createElement('h3');
    addElementSubtitle.textContent = 'Add element:';
    connectionsList.appendChild(addElementSubtitle);

    const addElementList = document.createElement('div');
    addElementList.classList.add('element-list');

    const newStepItem = createNewElementListItem(json, 'Step', parent, paper, insertBefore);
    const newDecisionItem = createNewElementListItem(json, 'Decision', parent, paper, insertBefore);

    addElementList.appendChild(newStepItem);
    addElementList.appendChild(newDecisionItem);

    if (!insertBefore) {
        const newEndItem = createNewElementListItem(json, 'End', parent, paper, insertBefore);
        addElementList.appendChild(newEndItem);
    }

    connectionsList.appendChild(addElementList);

    // Existing Connections

    if (Placeholder.isPlaceholder(parent)) {
        // Don't show existing connections for placeholders
        return;
    }

    const intermediateChildren = graph.getNeighbors(parent, { outbound: true });

    const elements = graph
        .getElements()
        .filter((element) => !Button.isButton(element) && element.id !== parent.id)
        .filter((element) => !intermediateChildren.some(child => child.id === element.id));

    // No elements to connect to or element is being inserted between two elements
    if (elements.length === 0 || insertBefore) return;

    const connectionsSubtitle = document.createElement('h3');
    connectionsSubtitle.textContent = 'Make connection to:';
    connectionsList.appendChild(connectionsSubtitle);

    const availableConnections = document.createElement('div');
    availableConnections.classList.add('element-list');

    elements.forEach((element) => {
        availableConnections.appendChild(createExistingElementListItem(parent, element, paper));
    });

    connectionsList.appendChild(availableConnections);
}

export function closeConnectionsList(ctx: DiagramControllerContext) {
    const { paper } = ctx;
    connectionsList.style.display = 'none';
    // Clear all child elements from the connections list
    connectionsList.innerHTML = '';
    removeEffect(paper, effects.CONNECTION_SOURCE);
}

export function addLinkTools(ctx: DiagramControllerContext, linkView: dia.LinkView) {
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

export function addLinkHoverTools(ctx: DiagramControllerContext, linkView: dia.LinkView) {
    const { paper } = ctx;
    const link = linkView.model;

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
            const { x, y } = paper.localToPagePoint(linkView.getPointAtRatio(0.5));
            positionConnectionsList(ctx, x, y);
            openConnectionsList(ctx, link.getSourceElement(), link.getTargetElement());
        },
    });

    linkView.addTools(new dia.ToolsView({
        name: 'hover-tool',
        tools: [insertNodeTool]
    }));
}

export function addElementTools(ctx: DiagramControllerContext, elementView: dia.ElementView) {
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

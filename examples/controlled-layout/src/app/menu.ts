import { dia } from "@joint/core";
import { Placeholder, Button } from "../diagram-engine/shapes";
import { insertNode, appendNode, setNode, addEdge } from '../diagram-engine';
import { addEffect, effects, removeEffect } from "../diagram-ui/effects";
import { DiagramContext } from '../diagram-ui/DiagramController';
import { createBlankThumbnail } from './utils';

export function openButtonMenu(ctx: DiagramContext, elementView: dia.ElementView) {
    const { paper, graph } = ctx;
    const element = elementView.model;
    const [parent] = graph.getNeighbors(element, { inbound: true });
    // Open the connections list at the buttons's position
    const { x, y } = paper.localToPagePoint(element.getBBox().topMiddle());
    positionConnectionsList(ctx, x, y);
    openConnectionsList(ctx, parent);
    addEffect(parent.findView(paper), effects.CONNECTION_SOURCE);
}

export function openLinkButtonMenu(ctx: DiagramContext, linkView: dia.LinkView) {
    const { paper } = ctx;
    const link = linkView.model;
    const { x, y } = paper.localToPagePoint(linkView.getPointAtRatio(0.5));
    positionConnectionsList(ctx, x, y);
    openConnectionsList(ctx, link.getSourceElement(), link.getTargetElement());
    addEffect(linkView, effects.CONNECTION_SOURCE);
}

export function openPlaceholderMenu(ctx: DiagramContext, elementView: dia.ElementView) {
    const { paper } = ctx;
    const element = elementView.model
    const { x, y } = paper.localToPagePoint(element.getBBox().center());
    positionConnectionsList(ctx, x, y);
    openConnectionsList(ctx, element);
    addEffect(elementView, effects.CONNECTION_SOURCE);
}

export function closeMenu(ctx: DiagramContext) {
    const { paper } = ctx;
    connectionsList.style.display = 'none';
    // Clear all child elements from the connections list
    connectionsList.innerHTML = '';
    removeEffect(paper, effects.CONNECTION_SOURCE);
}

const connectionsList = document.querySelector<HTMLDivElement>('#connections-list')!;

function createListItem(thumbnail: SVGSVGElement, label: string) {
    const item = document.createElement('div');
    item.classList.add('connection-list-item');
    item.appendChild(thumbnail);
    const span = document.createElement('span');
    span.textContent = label;
    item.appendChild(span);
    return item;
}

function createNewElementListItem(ctx: DiagramContext, type: string, parent: dia.Element, insertBefore?: dia.Element) {
    const { updateDiagram, json } = ctx;
    const item = createListItem(createBlankThumbnail(type), type);
    item.addEventListener('click', () => {
        if (Placeholder.isPlaceholder(parent)) {
            setNode(type, json, parent.id);
        } else {
            if (insertBefore) {
                insertNode(type, json, parent.id, insertBefore.id);
            } else {
                appendNode(type, json, parent.id);
            }
        }
        updateDiagram();
        closeMenu(ctx);
    });
    return item;
}

function createExistingElementListItem(ctx: DiagramContext, parent: dia.Element, element: dia.Element) {
    const { paper, updateDiagram } = ctx;
    const elementView = element.findView(paper) as dia.ElementView;
    const item = createListItem(createBlankThumbnail(element.get('type')), String(element.id));
    item.addEventListener('mouseenter', () => {
        addEffect(elementView, effects.CONNECTION_TARGET);
    });
    item.addEventListener('mouseleave', () => {
        removeEffect(paper, effects.CONNECTION_TARGET);
    });
    item.addEventListener('click', () => {
        removeEffect(paper, effects.CONNECTION_TARGET);
        addEdge(ctx.json, parent.id, element.id);
        updateDiagram({ disableOptimalOrderHeuristic: true });
        closeMenu(ctx);
    });
    return item;
}

function positionConnectionsList(ctx: DiagramContext, x: number, y: number) {
    const { paper } = ctx;
    // Open the connections list at the buttons's position
    connectionsList.style.left = `${x}px`;
    connectionsList.style.top = `${y}px`;
    const scale = paper.scale().sx;
    const clampedScale = Math.max(0.75, Math.min(scale, 1.25));
    connectionsList.style.transform = `scale(${clampedScale}) translate(-50%, -50%)`;
}

function openConnectionsList(ctx: DiagramContext, parent: dia.Element, insertBefore?: dia.Element) {
    const { paper } = ctx;

    closeMenu(ctx);
    connectionsList.style.display = 'block';

    const graph = paper.model;

    // New Connections
    const addElementSubtitle = document.createElement('h3');
    addElementSubtitle.textContent = 'Add element:';
    connectionsList.appendChild(addElementSubtitle);

    const addElementList = document.createElement('div');
    addElementList.classList.add('element-list');

    const newStepItem = createNewElementListItem(ctx, 'Step', parent, insertBefore);
    const newDecisionItem = createNewElementListItem(ctx, 'Decision', parent, insertBefore);

    addElementList.appendChild(newStepItem);
    addElementList.appendChild(newDecisionItem);

    if (!insertBefore) {
        const newEndItem = createNewElementListItem(ctx, 'End', parent, insertBefore);
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
        availableConnections.appendChild(createExistingElementListItem(ctx, parent, element));
    });

    connectionsList.appendChild(availableConnections);
}


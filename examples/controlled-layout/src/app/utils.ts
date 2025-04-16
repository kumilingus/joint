// @ts-nocheck
import { dia } from "@joint/core";
import { Placeholder } from "../diagram-engine/shapes";
import { addEffect, effects, removeEffect } from "../diagram-ui/effects";
import { insertNode, appendNode, setNode, addEdge } from '../diagram-engine/data-api';

export function createListItem(thumbnail: SVGSVGElement, label: string) {
    const item = document.createElement('div');
    item.classList.add('connection-list-item');
    item.appendChild(thumbnail);
    const span = document.createElement('span');
    span.textContent = label;
    item.appendChild(span);
    return item;
}

export function createNewElementListItem(json: any, type: string, parent: dia.Element, paper: dia.Paper, insertBefore?: dia.Element) {
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
        paper.model.trigger('request-layout');
    });

    return item;
}

export function createExistingElementListItem(ctx: DiagramContext, parent: dia.Element, element: dia.Element) {
    const { paper, graph } = ctx;
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
        graph.trigger('request-layout', { disableOptimalOrderHeuristic: true });
    });

    return item;
}


function getShapePath(shapeType: string): Element {

    if (shapeType === 'Step') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        rect.setAttribute('width', '30');
        rect.setAttribute('height', '30');
        return rect;
    } else if (shapeType === 'End') {
        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('cx', '15');
        ellipse.setAttribute('cy', '15');
        ellipse.setAttribute('rx', '15');
        ellipse.setAttribute('ry', '15');
        return ellipse;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 5 0 H 25 L 30 15 L 25 30 H 5 L 0 15 Z');
    return path;
}

export function createBlankThumbnail(shapeType: string): SVGSVGElement {
    const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgContainer.setAttribute('width', '30');
    svgContainer.setAttribute('height', '30');
    svgContainer.setAttribute('viewBox', '-4 -4 38 38');

    const shape = getShapePath(shapeType);
    shape.setAttribute('fill', 'white');
    shape.setAttribute('stroke', '#333');
    shape.setAttribute('stroke-width', '2');
    svgContainer.appendChild(shape);

    return svgContainer;
}

export function fitContent(paper: dia.Paper) {
    paper.transformToFitContent({
        padding: {
            top: 100,
            left: 100,
            bottom: 250,
            right: 100
        },
        verticalAlign: 'middle',
        horizontalAlign: 'middle',
        contentArea: paper.model.getBBox()
    });
}

import { dia } from "@joint/core";
import { DECISION_TYPE, END_TYPE, STEP_TYPE } from './shapes';

function getShapeNode(shapeType: string): Element {
    switch (shapeType) {
        case STEP_TYPE:
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '0');
            rect.setAttribute('y', '0');
            rect.setAttribute('rx', '5');
            rect.setAttribute('ry', '5');
            rect.setAttribute('width', '30');
            rect.setAttribute('height', '30');
            return rect;
        case END_TYPE:
            const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            ellipse.setAttribute('cx', '15');
            ellipse.setAttribute('cy', '15');
            ellipse.setAttribute('rx', '15');
            ellipse.setAttribute('ry', '15');
            return ellipse;
        case DECISION_TYPE:
        default:
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M 5 0 H 25 L 30 15 L 25 30 H 5 L 0 15 Z');
            return path;
    }
}

export function createBlankThumbnail(shapeType: string): SVGSVGElement {
    const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgContainer.setAttribute('width', '30');
    svgContainer.setAttribute('height', '30');
    svgContainer.setAttribute('viewBox', '-4 -4 38 38');

    const shape = getShapeNode(shapeType);
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


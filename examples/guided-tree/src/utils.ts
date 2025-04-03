import { dia, shapes, util } from "@joint/core";
import { Button, Rectangle, isButton } from "./shapes";
import { addEffect, effects, removeEffect } from "./effects";
import { DirectedGraph } from "@joint/layout-directed-graph";

export function fitContent(paper: dia.Paper) {
    paper.transformToFitContent({
        padding: 200,
        verticalAlign: 'middle',
        horizontalAlign: 'middle',
        contentArea: paper.model.getBBox()
    });
}

export function runLayout(paper: dia.Paper) {
    paper.freeze();
    const elements = paper.model.getElements();

    const otherElements: dia.Element[] = [];
    const buttons: dia.Element[] = [];

    elements.forEach(element => {
        if (isButton(element)) {
            buttons.push(element);
        } else {
            otherElements.push(element);
        }
    });


    const links = paper.model.getLinks();

    const otherLinks: dia.Link[] = [];
    const buttonLinks: dia.Link[] = [];

    links.forEach(link => {

        const target = link.getTargetCell();

        if (isButton(target)) {
            buttonLinks.push(link);
        } else {
            otherLinks.push(link);
        }
    });

    DirectedGraph.layout([...otherElements, ...otherLinks, ...buttonLinks, ...buttons], { disableOptimalOrderHeuristic: true });
    fitContent(paper);
    paper.unfreeze();
}

export function constructGraphLayer(parent: string | dia.Element, children: string[], graph: dia.Graph) {

    let parentElement = typeof parent === 'string' ? graph.getCell(parent) as dia.Element : parent;

    if (!parentElement) {
        parentElement = Rectangle.create(parent as string);
        graph.addCell(parentElement);
    }

    children.forEach(child => {
        const childElement = graph.getCell(child) as dia.Element ?? Rectangle.create(child);
        graph.addCell(childElement);

        const link = new shapes.standard.Link({
            source: { id: parentElement.id },
            target: { id: childElement.id }
        });
        graph.addCell(link);
    });
}

export function makeConnection(source: dia.Element, target: dia.Element, paper: dia.Paper, opt: any = {}) {
    const link = new shapes.standard.Link({
        source: { id: source.id },
        target: { id: target.id }
    });
    paper.model.addCell(link, opt);
    return link;
}

export function addButtonToElement(element: dia.Element, paper: dia.Paper, opt: any = {}) {
    const button = new Button();
    paper.model.addCell(button, opt);
    const link = makeConnection(element, button, paper, opt);
    return [link, button];
}

export function createListItem(thumbnail: SVGSVGElement) {

    const item = document.createElement('div');
    item.classList.add('connection-list-item');
    item.appendChild(thumbnail);

    return item;
}

export function createNewElementListItem(shape: dia.Element, parent: dia.Element, paper: dia.Paper) {
    const item = createListItem(createBlankThumbnail(shape.get('type') satisfies ShapeType));

    const graph = paper.model;
    const previewShape = shape.clone();
    previewShape.attr('label/text', null);

    let previewButton: dia.Element;
    let previewLink: dia.Link;

    const debouncedRunLayout = util.debounce(runLayout, 100);

    item.addEventListener('click', () => {
        graph.removeCells([previewShape, previewLink, previewButton]);
        graph.addCell(shape);
        makeConnection(parent, shape, paper);
        addButtonToElement(shape, paper);
        runLayout(paper);
    });

    item.addEventListener('mouseenter', () => {
        graph.addCell(previewShape, { preview: true });
        makeConnection(parent, previewShape, paper, { preview: true });
        const [link, button] = addButtonToElement(previewShape, paper, { preview: true });
        previewLink = link as dia.Link;
        previewButton = button as dia.Element;
        runLayout(paper);
        addEffect(previewShape.findView(paper) as dia.ElementView, effects.CONNECTION_TARGET);
    });

    item.addEventListener('mouseleave', () => {
        removeEffect(paper, effects.CONNECTION_TARGET);
        graph.removeCells([previewShape, previewLink, previewButton]);
        debouncedRunLayout(paper);
    });

    return item;
}

export function createExistingElementListItem(parent: dia.Element, element: dia.Element, paper: dia.Paper) {
    const elementView = element.findView(paper) as dia.ElementView;

    const item = createListItem(createElementThumbnail(elementView));

    item.addEventListener('mouseenter', () => {
        addEffect(elementView, effects.CONNECTION_TARGET);
    });

    item.addEventListener('mouseleave', () => {
        removeEffect(paper, effects.CONNECTION_TARGET);
    });

    item.addEventListener('click', () => {
        makeConnection(parent, element, paper);
        runLayout(paper);
    });

    return item;
}

export enum ShapeType {
    Rectangle = 'app.Rectangle',
    Ellipse = 'app.Ellipse',
    Triangle = 'app.Triangle'
}

function getShapePath(shapeType: ShapeType): Element {
    if (shapeType === ShapeType.Rectangle) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        rect.setAttribute('width', '30');
        rect.setAttribute('height', '30');
        return rect;
    } else if (shapeType === ShapeType.Ellipse) {
        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('cx', '15');
        ellipse.setAttribute('cy', '15');
        ellipse.setAttribute('rx', '15');
        ellipse.setAttribute('ry', '15');
        return ellipse;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 15 0 L 30 30 L 0 30 Z');
    return path;
}

export function createBlankThumbnail(shapeType: ShapeType): SVGSVGElement {
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

export function createElementThumbnail(elementView: dia.ElementView): SVGSVGElement {
    // Clone the SVG element to use as a thumbnail
    const svgGroup = elementView.el as SVGGElement;
    const svgClone = svgGroup.cloneNode(true) as SVGGElement;

    // Create a small SVG container for the thumbnail
    const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgContainer.setAttribute('width', '30');
    svgContainer.setAttribute('height', '30');
    const bbox = elementView.model.getBBox().inflate(4);
    svgContainer.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

    // Add the cloned element to the container
    svgContainer.appendChild(svgClone);

    return svgContainer;
}

// Check if removing a link would disconnect the graph
export function isBridge(graph: dia.Graph, linkToTest: dia.Link): boolean {
    // Store original source and target
    const sourceData = linkToTest.get('source');
    const targetData = linkToTest.get('target');

    if (!sourceData || !targetData) return false;

    const source = linkToTest.getSourceElement();
    const target = linkToTest.getTargetElement();

    linkToTest.disconnect();

    let targetVisited = false;

    graph.bfs(source, (element) => {
        if (element.id === target.id) {
            targetVisited = true;
        }

        return !targetVisited;
    })

    linkToTest.source(sourceData);
    linkToTest.target(targetData);

    return !targetVisited;
}

import { dia, shapes } from "@joint/core";
import { DirectedGraph } from "@joint/layout-directed-graph";
import { Link, Button, ButtonLink, Placeholder } from "./shapes";
import { LINK_LABEL_ATTRIBUTES } from "./theme";
import { measureTextSize, getChildrenCount } from './utils';
import type { DiagramData, NodeData } from "./data-api";
import { getNodeEdges } from "./data-api";

export type GrowthLimit = (element: dia.Element) => number;

export type MakeElement = (node: NodeData, id: string) => dia.Element;

export interface BuildDiagramOptions {
    makeElement?: MakeElement;
    growthLimit?: GrowthLimit;
    disableOptimalOrderHeuristic?: boolean;
}

export function buildDiagram(data: DiagramData, graph: dia.Graph, options: BuildDiagramOptions = {}) {
    const {
        makeElement = defaultMakeElement,
        growthLimit = defaultGrowthLimit,
        disableOptimalOrderHeuristic = true,
    } = options;
    updateGraph(graph, data, makeElement);
    updateButtons(graph, growthLimit);
    layoutGraph(graph, data, disableOptimalOrderHeuristic);
}

export function updateGraph(graph: dia.Graph, json: DiagramData, makeElement: (node: NodeData, id: string) => dia.Element) {

    // TODO: Remove elements that are not needed (not all of them)
    graph.clear({ async: false });

    const { nodes } = json;

    Object.keys(nodes).forEach(sourceId => {
        const node = nodes[sourceId];
        const nodeType = node.type;
        let element = graph.getCell(sourceId) as dia.Element;
        if (!element) {
            if (!nodeType) {
                // The node type is not defined in the data, so we create a placeholder
                element = Placeholder.create(sourceId);
            } else {
                element = makeElement(node, sourceId);
            }
            graph.addCell(element);
        } else {
            // TODO: update element
        }
    });

    Object.keys(nodes).forEach(sourceId => {
        const targets = (nodes[sourceId].to || []);
        targets.forEach(target => {
            const targetId = target.id;
            const linkId = `${sourceId}-${targetId}`;
            let link = graph.getCell(linkId) as dia.Link;
            if (link) {
                link.set({
                    source: { id: sourceId },
                    target: { id: targetId }
                });
            } else {
                const sourceElement = graph.getCell(sourceId) as dia.Element;
                let targetElement = graph.getCell(targetId) as dia.Element;
                if (!targetElement) {
                    // The target element is not defined in the data, so we create a placeholder
                    targetElement = Placeholder.create(targetId);
                    graph.addCell(targetElement);
                }
                link = addLink(sourceElement, targetElement, graph);
            }

            if (target.label) {
                const margin = 5;
                const { fontSize, fontFamily } = LINK_LABEL_ATTRIBUTES;
                const size = measureTextSize(target.label || '', fontSize, fontFamily);
                link.set({
                    labelSize: {
                        width: 2 * margin + size.width,
                        height: 2 * margin + size.height
                    },
                })
                link.labels([{
                    attrs: {
                        labelText: {
                            text: target.label,
                        }
                    }
                }]);
            }
        });
    });
}

function layoutGraph(
    graph: dia.Graph,
    data: DiagramData,
    disableOptimalOrderHeuristic: boolean
): dia.BBox {

    const elements: dia.Element[] = [];
    const buttons: dia.Element[] = [];
    const links: dia.Link[] = [];
    const buttonLinks: dia.Link[] = [];

    graph.getElements().forEach(element => {
        if (Button.isButton(element)) {
            buttons.push(element);
            buttonLinks.push(...graph.getConnectedLinks(element, { inbound: true }) as dia.Link[]);
        } else {
            elements.push(element);
            links.push(...getNodeEdges(data, element.id).map(linkId => graph.getCell(linkId) as dia.Link));
        }
    });

    return DirectedGraph.layout([...elements, ...links, ...buttonLinks, ...buttons], {
        disableOptimalOrderHeuristic,
        setVertices: true,
        // align: 'UL',
        rankSep: 100,
        setLabels: true,
        setPosition: (el, position) => {
            let x = position.x - position.width / 2;
            let y = position.y - position.height / 2;
            if (Button.isButton(el)) {
                const [parent] = graph.getNeighbors(el, { inbound: true });
                const siblings = graph.getNeighbors(parent, { outbound: true })
                if (siblings.length === 1) {
                    y -= 75;
                } else {
                    // y -= 25;
                }
            }
            el.position(x, y);
        },
    });
}

function updateButtons(graph: dia.Graph, growthLimit: GrowthLimit) {
    // TODO: Remove buttons that are not needed (not all of them)
    for (const element of graph.getElements()) {
        if (Button.isButton(element)) {
            element.remove();
            continue;
        }
        if (Placeholder.isPlaceholder(element)) {
            continue;
        }
        const maxChildren = growthLimit(element);
        const currentChildren = getChildrenCount(element, graph);
        if (currentChildren < maxChildren) {
            addButton(element, graph);
        }
    }
}

function addLink(source: dia.Element, target: dia.Element, graph: dia.Graph, opt: any = {}) {
    const LinkCtor = Button.isButton(target) ? ButtonLink : Link;
    const link = new LinkCtor({
        id: `${source.id}-${target.id}`,
        source: { id: source.id },
        target: { id: target.id }
    });
    graph.addCell(link, opt);
    return link;
}

function addButton(element: dia.Element, graph: dia.Graph, opt: any = {}) {
    const button = new Button();
    graph.addCell(button, opt);
    const link = addLink(element, button, graph, opt);
    return [link, button];
}

function defaultMakeElement(_node: NodeData, id: string) {
    return new shapes.standard.Rectangle({
        id,
        size: { width: 100, height: 30 },
    });
}

function defaultGrowthLimit(_element: dia.Element) {
    return Infinity;
}

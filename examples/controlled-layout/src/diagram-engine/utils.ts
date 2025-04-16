import type { dia } from '@joint/core';
import { Button } from "./shapes";

// Check if removing a link would disconnect the graph
export function isBridge(graph: dia.Graph, link: dia.Link): boolean {
    // Store original source and target
    const sourceData = link.get('source');
    const targetData = link.get('target');

    if (!sourceData || !targetData) return false;

    const source = link.getSourceElement();
    const target = link.getTargetElement();

    link.disconnect();

    let targetVisited = false;

    graph.bfs(source, (element) => {
        if (element.id === target.id) {
            targetVisited = true;
        }

        return !targetVisited;
    })

    link.source(sourceData);
    link.target(targetData);

    return !targetVisited;
}

export function getChildrenCount(element: dia.Element, graph: dia.Graph) {
    const children = graph.getNeighbors(element, { outbound: true });
    return children.reduce((acc, child) => {
        if (Button.isButton(child)) return acc;
        return acc + 1;
    }, 0);
}

export function measureTextSize(text: string, fontSize: number, fontFamily: string) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return { width: 0, height: 0 };
    context.font = `${fontSize}px ${fontFamily}`;
    const lines = text.split('\n');
    const maxWidth = Math.max(...lines.map(line => context.measureText(line).width));
    const lineHeight = lines.length * (fontSize * 1.2); // 1.2 is a common line height multiplier
    return {
        width: maxWidth,
        height: lineHeight
    };
}

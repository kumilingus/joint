import { util, dia } from '@joint/core';

export type NodeType = string;

export type EdgeData = {
    id: dia.Cell.ID;
    label?: string;
}

export interface NodeData<T extends string = string> {
    type?: T;
    to?: EdgeData[];
    [key: string]: any;
}

export interface DiagramData<T extends string = string> {
    nodes: {
        [id: dia.Cell.ID]: NodeData<T>;
    };
}

// Data modification

export function removeEdge(json: DiagramData, parentId: dia.Cell.ID, childId: dia.Cell.ID) {
    const parent = json.nodes[parentId];
    if (!parent) return;
    const index = parent.to.findIndex((target) => target.id === childId);
    if (index > -1) {
        parent.to.splice(index, 1);
    }
}

export function changeEdge(json: DiagramData, parentId: dia.Cell.ID, childId: dia.Cell.ID, edge: Partial<EdgeData>) {
    const parent = json.nodes[parentId];
    if (!parent) return;
    const index = parent.to.findIndex((target) => target.id === childId);
    if (index > -1) {
        const currentEdge = parent.to[index];
        parent.to[index] = { ...currentEdge, ...edge };
    }
}

export function insertNode(type: NodeType, json: DiagramData, parentId: dia.Cell.ID, childId: dia.Cell.ID) {
    const nodeId = setNode(type, json);
    changeEdge(json, parentId, childId, { id: nodeId });
    addEdge(json, nodeId, childId);
    return nodeId;
}

export function addEdge(json: DiagramData, parentId: dia.Cell.ID, childId: dia.Cell.ID) {
    const parent = json.nodes[parentId];
    if (!parent) return;
    if (!parent.to) {
        parent.to = [];
    }
    parent.to.push({ id: childId });
}

export function appendNode(type: NodeType, json: DiagramData, parentId: dia.Cell.ID) {
    const childId = util.uuid();
    setNode(type, json, childId);
    addEdge(json, parentId, childId);
    return childId;
}

export function setNode(type: NodeType, json: DiagramData, id: dia.Cell.ID = util.uuid()) {
    if (!json.nodes[id]) {
        const node: NodeData = { type, to: [] };
        json.nodes[id] = node;
    } else {
        json.nodes[id].type = type;
    }
    return id;
}

export function removeEdgesFromNode(json: DiagramData, id: dia.Cell.ID) {
    Object.keys(json.nodes).forEach((nodeId) => {
        const node = json.nodes[nodeId];
        if (node.to) {
            const index = node.to.findIndex((target) => target.id === id);
            if (index > -1) {
                node.to.splice(index, 1);
            }
        }
    });
    const node = json.nodes[id];
    if (node) {
        node.to = [];
    }
}

export function removeNode(json: DiagramData, id: dia.Cell.ID) {
    removeEdgesFromNode(json, id);
    delete json.nodes[id];
}

export function getNodeEdges(json: DiagramData, id: dia.Cell.ID) {
    const node = json.nodes[id];
    if (!node || !node.to) return [];
    return node.to.map(target => `${id}-${target.id}`);
}

export function sortChildren(json: DiagramData, id: dia.Cell.ID, graph: dia.Graph, coordinate: 'x' | 'y' = 'x') {
    const node = json.nodes[id];
    if (!node || !node.to) return;
    node.to = util.sortBy(node.to, (target) => {
        const targetEl = graph.getCell(target.id) as dia.Element;
        return targetEl.getBBox().center()[coordinate];
    });
}

export function sortNodes(json: DiagramData, graph: dia.Graph, coordinate: 'x' | 'y' = 'x') {
    Object.keys(json.nodes).forEach((id) => {
        sortChildren(json, id, graph, coordinate);
    });
}

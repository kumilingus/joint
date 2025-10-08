import { dia, highlighters, shapes } from '@joint/core';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { shapeKinds, LINK_COLOR, TEXT_COLOR, OUTLINE_COLOR } from '../constants';

export function syncDiagram(graph, gridRecords, action = 'update') {
    // Update the diagram based on the grid records and the action performed
    switch (action) {
        case 'update':
        case 'add':
            updateCells(graph, gridRecords);
            break;
        case 'remove':
            removeCells(graph, gridRecords);
            break;
        case 'batch':
            throw new Error('Not implemented');
        case 'filter':
            break;
        case 'removeall':
            graph.resetCells([]);
            break;
        default:
            throw new Error(`Unknown action: ${action}`);
    }
    // Perform layout
    if (graph.getCells().length > 0) {
        DirectedGraph.layout(graph, {
            rankDir: 'TB',
            setVertices: true,
        });
    }
    // Notify listeners that the graph has been updated
    graph.trigger('synced');
}

export function selectElements(paper, ids) {
    const graph = paper.model;
    highlighters.mask.removeAll(paper);
    ids.forEach((id) => {
        const element = graph.getCell(id);
        if (!element) return;
        const elementView = paper.findViewByModel(element);
        if (!elementView) return;
        highlighters.mask.add(elementView, 'body', 'selection', {
            layer: dia.Paper.Layers.BACK,
            attrs: {
                stroke: '#3B82F6',
                strokeWidth: 3,
            },
        });
    });
}

export function zoomToFit(paper, { margin = 10 } = {}) {
    const bbox = paper.model.getBBox();
    if (!bbox) return;
    paper.transformToFitContent({
        maxScale: 1,
        contentArea: bbox.inflate(margin),
        horizontalAlign: 'middle',
        verticalAlign: 'middle',
    });
}

// Define how each shape should look based on its kind
function getShapePath(kind, width, height) {
    let d;
    switch (kind) {
        case shapeKinds.Start:
        case shapeKinds.End:
            d = `M ${width / 2} 0
            A ${width / 2} ${height / 2} 0 1 1 ${width / 2} ${height}
            A ${width / 2} ${height / 2} 0 1 1 ${width / 2} 0 Z`;
            break;
        case shapeKinds.Decision:
            d = `M ${width / 2} 0
            L ${width} ${height / 2}
            L ${width / 2} ${height}
            L 0 ${height / 2} Z`;
            break;
        case shapeKinds.Document: {
            const CP1_X_FACTOR = 0.16;
            const CP2_X_FACTOR = 0.33;
            const CURVE_END_X_FACTOR = 0.5;
            const CP3_X_FACTOR = 0.75;
            const offset = 10;
            d = `
                M 0 0
                L 0 ${height - offset}
                C ${CP1_X_FACTOR * width} ${height} ${
                CP2_X_FACTOR * width
            } ${height} ${CURVE_END_X_FACTOR * width} ${height - offset}
                S ${CP3_X_FACTOR * width} ${height - 2 * offset} ${width} ${
                height - offset
            }
                L ${width} 0
                Z
            `;
            break;
        }
        case shapeKinds.Action:
        default:
            d = `M 10 0 L ${width - 10} 0 Q ${width} 0 ${width} 10 L ${width} ${
                height - 10
            } Q ${width} ${height} ${
                width - 10
            } ${height} L 10 ${height} Q 0 ${height} 0 ${
                height - 10
            } L 0 10 Q 0 0 10 0 Z`;
            break;
    }
    return d;
}

function removeCells(graph, gridRecords) {
    gridRecords.forEach((record) => {
        const cell = graph.getCell(record.id);
        if (cell) cell.remove();
    });
}

function updateCells(graph, gridRecords) {
    const existingConnectionsMap = {};
    gridRecords.forEach((record) => {
        const recordId = `${record.id}`;
        const cell = graph.getCell(recordId);
        const bodyColor = record.color || '#FFFFFF';
        // If the cell already exists, update its attributes
        if (cell) {
            // Update existing cell
            cell.attr({
                body: {
                    d: getShapePath(record.kind, 200, 100),
                    fill: bodyColor,
                },
                label: {
                    text: record.name,
                },
            });
            // Collect existing connections to avoid duplicates
            graph
                .getConnectedLinks(cell, { outbound: true })
                .forEach((link) => {
                    existingConnectionsMap[link.id] = link;
                });
        } else {
            // Add a new cell if it doesn't exist
            graph.addCell(
                new shapes.standard.Path({
                    id: recordId,
                    z: 2,
                    size: { width: 200, height: 100 },
                    attrs: {
                        body: {
                            d: getShapePath(record.kind, 200, 100),
                            fill: bodyColor,
                            stroke: OUTLINE_COLOR,
                            strokeWidth: 2,
                        },
                        label: {
                            text: record.name,
                            fill: TEXT_COLOR,
                            fontSize: 18,
                            fontFamily: 'Arial, sans-serif',
                            textWrap: {
                                width: -10,
                                height: -10,
                                ellipsis: true,
                            }
                        },
                    },
                })
            );
        }
        // Add connections
        const connections = record.get('connections') || [];
        connections.forEach(({ id: targetId, label, color }) => {
            const linkId = `link-${record.id}-${targetId}`;
            delete existingConnectionsMap[linkId];
            let link = graph.getCell(linkId);
            if (!link) {
                // Add new link
                link = new shapes.standard.Link({
                    id: linkId,
                    z: 1,
                    source: { id: record.id },
                    target: { id: targetId },
                    labelSize: { width: 100, height: 30 },
                    attrs: {
                        root: {
                            pointerEvents: 'none',
                        }
                    },
                });
                graph.addCell(link);
            }
            // Update existing link
            const labels = [];
            if (label) {
                labels.push({
                    position: 0.5,
                    attrs: {
                        text: {
                            text: label,
                            fill: TEXT_COLOR,
                            fontSize: 18,
                            fontFamily: 'Arial, sans-serif',
                        }
                    }
                });
            }
            link.labels(labels);
            link.attr('line/stroke', color || LINK_COLOR);
        });
        // Remove links that are no longer valid
        Object.values(existingConnectionsMap).forEach((link) => link.remove());
    });
}

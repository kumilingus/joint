// @ts-nocheck
import { dia, highlighters, shapes } from '@joint/core';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { ShapeKind, LINK_COLOR, TEXT_COLOR, OUTLINE_COLOR, BACKGROUND_COLOR, SELECTION_COLOR } from './constants';

export function syncDiagram(graph, gridRecords, partialUpdate = false) {

    updateCells(graph, gridRecords, partialUpdate);

    // Perform layout
    if (graph.getCells().length === 0) return;
    DirectedGraph.layout(graph, {
        rankDir: 'TB',
        setVertices: true,
    });
}

export function selectCells(paper, ids) {
    const graph = paper.model;
    highlighters.mask.removeAll(paper);
    ids.forEach((id) => {
        const cell = graph.getCell(id);
        if (!cell) return;
        const cellView = paper.findViewByModel(cell);
        if (!cellView) return;
        highlighters.mask.add(cellView, cell.isLink() ? 'line' : 'body', 'selection', {
            layer: dia.Paper.Layers.BACK,
            padding: 6,
            attrs: {
                stroke: SELECTION_COLOR,
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
        case ShapeKind.Start:
        case ShapeKind.End:
            d = `M ${width / 2} 0
            A ${width / 2} ${height / 2} 0 1 1 ${width / 2} ${height}
            A ${width / 2} ${height / 2} 0 1 1 ${width / 2} 0 Z`;
            break;
        case ShapeKind.Decision:
            d = `M ${width / 2} 0
            L ${width} ${height / 2}
            L ${width / 2} ${height}
            L 0 ${height / 2} Z`;
            break;
        case ShapeKind.Document: {
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
        case ShapeKind.Action:
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


function updateCells(graph, rows, partialUpdate = false) {
    const cells = [];
    rows.forEach((row) => {
        const rowId = row.id;
        const bodyColor = row.color || '#FFFFFF';
        cells.push({
            type: 'standard.Path',
            id: rowId,
            z: 2,
            size: { width: 200, height: 100 },
            attrs: {
                body: {
                    magnet: true,
                    d: getShapePath(row.kind, 200, 100),
                    stroke: bodyColor,
                    fill: OUTLINE_COLOR,
                    strokeWidth: 3,
                },
                label: {
                    text: row.name,
                    textVerticalAnchor: 'middle',
                    fill: TEXT_COLOR,
                    fontSize: 18,
                    fontFamily: 'Arial, sans-serif',
                    pointerEvents: 'none',
                    textWrap: {
                        width: -10,
                        height: -10,
                        ellipsis: true,
                    }
                },
            }
        });
        // Add connections
        const connections = row.connections || [];
        connections.forEach(({ targetId, label, color }) => {
            const linkId = `link-${row.id}-${targetId}`;
            const link = {
                id: linkId,
                type: 'standard.Link',
                z: 1,
                source: { id: rowId },
                target: { id: targetId },
                labelSize: { width: 100, height: 30 },
                attrs: {
                    line: {
                        connection: true,
                        stroke: color || LINK_COLOR,
                        strokeWidth: 1,
                        strokeLinejoin: 'round',
                        targetMarker: {
                            'type': 'path',
                            'd': 'M 10 -5 0 0 10 5 z'
                        }
                    },
                    wrapper: {
                        connection: true,
                        strokeWidth: 10,
                        strokeLinejoin: 'round'
                    }
                }
            };

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
                        },
                        rect: {
                            fill: BACKGROUND_COLOR,
                            x: 'calc(x - 3)',
                            y: 'calc(y - 3)',
                            width: 'calc(w + 6)',
                            height: 'calc(h + 6)',
                        }

                    }
                });
            }
            link.labels = labels;

            cells.push(link);
        });
    });
    graph.syncCells(cells, { remove: !partialUpdate });
}

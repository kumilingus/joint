import { dia, shapes, util } from '@joint/core';
import initialData from './initial-data';
import { selectCells, syncDiagram, zoomToFit } from './diagram-utils';
import { BACKGROUND_COLOR, Color, HIGHLIGHT_COLOR, ShapeKind } from './constants';
import {
    AllEnterpriseModule,
    GridApi,
    GridOptions,
    ModuleRegistry,
    createGrid,
    themeQuartz,
    colorSchemeDark,
    LicenseManager,
    IDetailCellRendererParams,
    ColDef,
} from "ag-grid-enterprise";

import '../styles.css';

ModuleRegistry.registerModules([
    AllEnterpriseModule,
]);

LicenseManager.setLicenseKey("[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-112707}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{22 December 2025}____[v3]_[0102]_MTc2NjM2MTYwMDAwMA==232a61eaa97b196d2371ed749d1554c3");

const shapeNamespace = {
    ...shapes,
};

const graph = new dia.Graph({}, { cellNamespace: shapeNamespace });

const GRID_SIZE = 10;

const paper = new dia.Paper({
    el: document.getElementById('paper'),
    width: '100%',
    height: '100%',
    gridSize: GRID_SIZE,
    model: graph,
    frozen: true,
    async: true,
    interactive: {
        addLinkFromMagnet: true,
        labelMove: false,
        linkMove: false,
        elementMove: false,
    },
    preventDefaultViewActions: false,
    highlighting: {
        connecting: {
            name: 'mask',
            options: {
                padding: 6,
                attrs: {
                    stroke: HIGHLIGHT_COLOR,
                    strokeWidth: 3,
                },
            },
        }
    },
    clickThreshold: 10,
    multiLinks: false,
    defaultLink: () => new shapes.standard.Link({
        attrs: {
            line: {
                stroke: HIGHLIGHT_COLOR,
            },
        },
        connector: {
            name: 'curve'
        }
    }),
    defaultConnector: {
        name: 'straight',
        args: {
            cornerType: 'cubic',
        }
    },
    validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet, end, linkView) => {
        const source = sourceView.model;
        const target = targetView.model;
        // Prevent linking to self
        if (source === target) return false;
        if (source.isLink() || target.isLink()) return false;
        // Is there already a link between these two elements?
        return graph.getNeighbors(source as dia.Element).every(neighbor => neighbor !== target);
    },
    magnetThreshold: 'onleave',
    linkPinning: false,
    snapLinks: true,
    background: {
        color: BACKGROUND_COLOR,
    },
    cellViewNamespace: shapeNamespace,
});

paper.el.style.border = `1px solid #e2e2e2`;

paper.unfreeze();


// Row Data Interface
interface INodeRow {
    id: string;
    name: string;
    kind: string;
    color?: string;
    connections?: Array<IConnection>;
    actions?: string;
}

interface IEdgeRow {
    id: string;
    targetId: string;
    label?: string;
    color?: string;
    actions?: string;
}

interface IConnection {
    id: string;
    targetId: string;
    label?: string;
}

// Grid API: Access to Grid API methods
let gridApi: GridApi;

let expandedRowId: string | null = null;

let idCounter = 8;

const edgeGridOptions: GridOptions<IEdgeRow> = {

    alwaysShowVerticalScroll: true,

    columnDefs: [
        {
            headerName: 'Target Node',
            field: "targetId",
            cellRenderer: (params: any) => {
                let nodeRow: INodeRow | undefined;
                gridApi.forEachNode((node) => {
                    if (node.data.id === params.value) {
                        nodeRow = node.data as INodeRow;
                    }
                });
                if (!nodeRow) {
                    return `<span style="color: red">Missing Node (ID: ${params.value})</span>`;
                }
                return `<span style="color: ${nodeRow?.color}">${nodeRow?.name}</span>`;
            }
        },
        {
            field: "label",
            editable: true,
            cellEditor: 'agTextCellEditor',
        },
        {
            ...getColorField<IEdgeRow>(),
        },
        {
            ...getActionField<IEdgeRow>(),
            cellRenderer: (params: any) => {
                const button = document.createElement('button');
                button.innerText = 'Delete';
                button.addEventListener('click', () => {
                    const rowId = params.data.id;
                    const transaction = {
                        remove: [params.data],
                        update: [] as INodeRow[],
                    };
                    const parentRowNode = gridApi.getRowNode(expandedRowId!);
                    if (parentRowNode) {
                        const connections: IConnection[] = parentRowNode.data.connections || [];
                        const updatedConnections = connections.filter(conn => conn.id !== rowId);
                        parentRowNode.data.connections = updatedConnections;
                        transaction.update.push(parentRowNode.data);
                    }
                    params.api.applyTransaction(transaction);
                });
                return button;
            },
        }
    ],


    onCellValueChanged: () => {
        const parentRowNode = gridApi.getRowNode(expandedRowId!);
        if (!parentRowNode) return;
        const parentData = parentRowNode.data as INodeRow;
        syncDiagram(graph, [parentData], true);
        zoomToFit(paper);
    },

    getRowId: function (params) {
        return params.data.id; // tell AG Grid to use your id field
    },

    rowSelection: 'multiple',
    onSelectionChanged: (event) => {
        if (!expandedRowId) return;
        const selectedRows = event.api.getSelectedRows();
        const selectedRow = gridApi.getRowNode(expandedRowId);
        if (selectedRow) {
            const targetIds = selectedRows.map(row => row.targetId);
            selectCells(paper, targetIds.map(id => `link-${expandedRowId}-${id}`));
        }
    },

    overlayNoRowsTemplate: '<span class="custom-no-rows">No edges yet…</span>'
};


// Grid Options: Contains all of the grid configurations
const nodeGridOptions: GridOptions<INodeRow> = {
    theme: themeQuartz.withPart(colorSchemeDark),
    // Data to be displayed
    rowData: initialData,

    alwaysShowVerticalScroll: true,

    masterDetail: true,
    isRowMaster: () => true,
    detailCellRendererParams: {
        detailGridOptions: edgeGridOptions,
        getDetailRowData: function (params: any) {
            params.successCallback(params.data.connections || []);
        },
    } as IDetailCellRendererParams<INodeRow, IEdgeRow>,

    getRowId: function (params) {
        return params.data.id; // tell AG Grid to use your id field
    },

    // Columns to be displayed (Should match rowData properties)
    columnDefs: [
        {
            field: "id",
            cellRenderer: 'agGroupCellRenderer',
            width: 80,
        },
        {
            field: "name",
            editable: true,
        },
        {
            field: "kind",
            editable: true,
            width: 120,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: Object.values(ShapeKind)
            }
        },
        {
            ...getColorField<INodeRow>(),
        },
        {
            ...getActionField<INodeRow>(),
            cellRenderer: (params: any) => {
                const button = document.createElement('button');
                button.innerText = 'Delete';
                button.addEventListener('click', () => {
                    const rowId = params.data.id;
                    const rowNode = gridApi.getRowNode(rowId);
                    if (rowNode) {
                        const transaction = {
                            remove: [rowNode.data],
                            update: [] as INodeRow[],
                        }
                        gridApi.forEachNode((node) => {
                            const connections: IConnection[] = node.data.connections || [];
                            const updatedConnections = connections.filter(conn => conn.targetId !== rowId);
                            if (updatedConnections.length !== connections.length) {
                                const updatedData = {
                                    ...node.data,
                                    connections: updatedConnections,
                                };
                                transaction.update.push(updatedData);
                            }
                        });
                        params.api.applyTransaction(transaction);
                    }
                });
                return button;
            },
        }
    ],

    defaultColDef: {
        flex: 1,
    },

    onCellValueChanged: (event) => {
        syncDiagram(graph, [event.data], true);
    },

    rowSelection: 'multiple',
    onSelectionChanged: (event) => {
        console.log(event);
        const selectedRows = gridApi.getSelectedRows();
        selectCells(paper, selectedRows.map(row => row.id));
    },

    // When a row is expanded, close all other expanded rows
    onRowGroupOpened: (event) => {
        if (event.node.expanded) {
            gridApi.deselectAll();
            gridApi.forEachNode((node) => {
                if (node.id !== event.node.id && node.expanded) {
                    node.setExpanded(false);
                }
            });
            expandedRowId = event.node.id!;
            event.node.setSelected(true);
        }
    },

    // Run on each `applyTransaction` call
    onRowDataUpdated: (event) => {
        const updatedData: INodeRow[] = [];
        event.api.forEachNode((node: any) => updatedData.push(node.data));
        syncDiagram(graph, updatedData, false);
        zoomToFit(paper);
    },

    overlayNoRowsTemplate: '<span class="custom-no-rows">No nodes yet…</span>'
};
// Create Grid: Create new grid within the #myGrid div, using the Grid Options object
gridApi = createGrid(
    document.querySelector<HTMLElement>("#grid")!,
    nodeGridOptions,
);

syncDiagram(graph, initialData);
zoomToFit(paper);

paper.on('element:pointerclick', (elementView) => {
    const elementId = elementView.model.id as string;
    deselectAll();
    const rowNode = gridApi.getRowNode(elementId);
    if (rowNode) {
        rowNode.setSelected(true, true);
    }
});

paper.on('link:pointerclick', (linkView) => {
    const linkId = linkView.model.id as string;
    const ids = linkId.replace('link-', '').split('-');
    const sourceId = ids[0];
    const targetId = ids[1];
    const sourceRowNode = gridApi.getRowNode(sourceId);
    if (sourceRowNode) {
        if (!sourceRowNode.expanded) {
            sourceRowNode.setExpanded(true, undefined, true);
        }
        setTimeout(() => {
            deselectAll();
            const detailGridApi = gridApi.getDetailGridInfo(`detail_${sourceId}`)?.api;
            if (detailGridApi) {
                const connections: IConnection[] = sourceRowNode.data.connections || [];
                const targetConnection = connections.find(conn => conn.targetId === targetId);
                if (targetConnection) {
                    const targetRowNode = detailGridApi.getRowNode(targetConnection.id);
                    if (targetRowNode) {
                        targetRowNode.setSelected(true, true);
                    }
                }
            }
        }, 0);
    }
});

paper.on('blank:pointerclick', () => {
    deselectAll();
    gridApi.collapseAll();
});

paper.on('blank:pointerdblclick', () => {
    // Add a new row on double click
    const newNode: INodeRow = {
        id: `${idCounter++}`,
        name: 'New Node',
        kind: ShapeKind.Action,
        connections: [],
    };
    gridApi.applyTransaction({ add: [newNode] });
});

paper.on('link:connect', (linkView) => {
    const link = linkView.model;
    const source = link.getSourceCell();
    const target = link.getTargetCell();
    const sourceRowNode = gridApi.getRowNode(source.id as string);
    if (sourceRowNode) {
        const currConnections: IConnection[] = sourceRowNode.data.connections || [];
        gridApi.applyTransaction({
            update: [{
                ...sourceRowNode.data,
                connections: currConnections.concat({
                    id: util.uuid(),
                    targetId: target.id as string,
                })
            }]
        });
    }
});

window.addEventListener('resize', () => {
    gridApi.sizeColumnsToFit();
});

// Initial size to fit columns
gridApi.sizeColumnsToFit();

function deselectAll() {
    gridApi.deselectAll();
    gridApi.forEachNode((node: any) => {
        node.detailNode?.detailGridInfo?.api.deselectAll()
    });
}


function getColorField<T extends { color?: string }>(): ColDef<T> {
    return {
        headerName: 'Color',
        field: 'color',
        width: 80,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: any) => {
            const color = params.value || 'transparent';
            return `
                <div style="
                width: 100%;
                height: 60%;
                margin: 8px 0;
                background: ${color};
                border-radius: 4px;
                border: 1px solid #ccc;
                "></div>
            `;
        },

        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
            values: Object.keys(Color),
        },
        valueSetter: (params) => {
            const selectedLabel = params.newValue as keyof typeof Color;
            const hex = Color[selectedLabel];
            if (!hex) return false;
            params.data.color = hex;
            return true;
        }
    } as ColDef<T>;
}

function getActionField<T>(): ColDef<T> {
    return {
        field: 'actions',
        width: 100,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
    } as ColDef<T>;
}

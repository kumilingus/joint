import { util } from "@joint/core";
import { Grid, GridRowModel, Store, Toast } from "@bryntum/grid";
import { shapeKinds, colors } from "../constants";
import { connectRows, deleteRow } from "../utils/grid-utils";

export class LinkModel extends GridRowModel {
    static fields = [
        "id", // id of the target element
        "label",
        "color",
    ];
}

export class ElementModel extends GridRowModel {
    static fields = [
        "id",
        "name",
        "kind",
        "color",
        // This is the field from which the expanded ConnectionsGrid will get its data
        // The type "store" means that this field has a number of records in itself
        {
            name: "connections",
            type: "store",
            storeClass: Store,
            modelClass: LinkModel,
        },
    ];
}

const colorPalette = Object.keys(colors).map((name) => {
    return {
        color: colors[name],
        text: util.toKebabCase(name).replace(/-/g, " "),
    };
});

const gridConfig = {
    columns: [
        {
            text: "Name",
            field: "name",
            flex: 1,
            minWidth: 170,
            renderer: ({ value }) => [{ tag: "b", text: value }],
        },
        {
            text: "Type",
            field: "kind",
            width: 100,
            editor: {
                type: "combo",
                items: Object.values(shapeKinds),
            },
        },
        {
            text: "Color",
            type: "color",
            field: "color",
            width: 70,
            colors: colorPalette,
        },
        {
            text: "Connections",
            field: "connections",
            flex: 3,
            autoHeight: true,
            editor: false,
            // editor: {
            //     type: "combo",
            //     multiSelect: true,
            //     valueField: "value",
            //     displayField: "text",
            //     editable: true,
            //     // `store` will be set in the `beforeCellEditStart` listener
            // },
            renderer: ({ record, grid }) => {
                const connectionStore = record.get("connections");
                // TODO: implement custom model for record
                // and add `name` field to the connection object that
                // will automatically read from the referenced record
                const chips = connectionStore.map(({ id }) => {
                    const targetRecord = grid.store.getById(id);
                    return {
                        text: targetRecord.get("name"),
                        color: targetRecord.get("color"),
                    };
                });
                return [
                    {
                        tag: "div",
                        style: {
                            display: "flex",
                            gap: "5px",
                            flexWrap: "wrap",
                            margin: "10px",
                        },
                        children: chips.map(({ text, color }) => {
                            return {
                                tag: "i",
                                className: "b-chip",
                                text,
                                style: {
                                    background: color,
                                },
                            };
                        }),
                    },
                ];
            },
        },
        {
            type: "action",
            width: 45,
            actions: [
                {
                    cls: "b-fa b-fa-trash",
                    tooltip: "Delete item",
                    onClick: async ({ grid, record }) => {
                        deleteRow(grid, [record]);
                    },
                },
            ],
        },
    ],

    // listeners: {
    //     // this is the correct event to prepare your editor
    //     beforeCellEditStart({
    //         grid,
    //         editorContext: { column, editor, record },
    //     }) {
    //         if (column.field === "connections") {
    //             // dynamically set options based on current grid data
    //             const store = new Store();
    //             grid.store.data.forEach(({ id, name }) => {
    //                 const label = id === record.id ? `${name} (self)` : name;
    //                 store.add({
    //                     id,
    //                     text: label,
    //                     value: { id },
    //                 });
    //             });
    //             editor.store = store;
    //             editor.value = record
    //                 .get("connections")
    //                 .map(({ id }) => ({ id }));
    //         }
    //     },
    // },

    rowExpanderFeature: {
        tooltip: "Show connections",
        refreshOnRecordChange: true,
        // The widget config declares what type of Widget will be created on each expand
        widget: {
            type: "connections-grid",
            // Bottom toolbar
            bbar: [
                // Add button, which adds a row to the expanded grid and starts editing it
                {
                    text: "Connect",
                    icon: "b-icon-add",
                    cls: "b-raised",
                    tooltip:
                        "Select elements in the main grid and click to connect them",
                    onClick: ({ source }) => {
                        const grid = source.up("grid");
                        const connectionsGrid = source.up("connections-grid");
                        const selected = grid.selectedRecords;
                        if (!selected?.length) {
                            Toast.show({
                                html: "Select an element to connect in the main grid first",
                                color: "orange",
                                side: "top",
                            });
                            return;
                        }
                        connectRows(connectionsGrid, selected);
                    },
                },
            ],
        },
        // If configuring a dataField, this field from the "outer" Grid's records will be used as the data
        // source of the nested Grid
        dataField: "connections",
    },
    store: {
        modelClass: ElementModel,
    },
};

export default gridConfig;

class ConnectionsGrid extends Grid {
    static $name = "ConnectionsGrid";
    static type = "connections-grid";

    static configurable = {
        autoHeight: true, // The Grid will adjust its height to fit all rows
        emptyText: "No connections",
        // selectionMode : {
        //     checkbox     : true, // Adds a checkbox column that lets the user select rows
        //     showCheckAll : true // Adds a checkbox to the checkbox column header that lets the user check/uncheck all rows
        // },
        columns: [
            {
                text: "Target",
                field: "id",
                flex: 1,
                editor: false,
                renderer: ({ record, grid }) => {
                    const toId = record.get("id");
                    const targetRecord = grid.owner.store.getById(toId);
                    return [
                        {
                            tag: "b",
                            text: "→",
                            style: { marginRight: "5px" },
                        },
                        {
                            tag: "span",
                            text: `${targetRecord.get("name")}`,
                            className: "b-chip",
                            style: {
                                background: targetRecord.get("color"),
                            },
                        },
                    ];
                },
            },
            {
                text: "Label",
                field: "label",
                flex: 1,
                editor: {
                    type: "textfield",
                },
                renderer: ({ value }) => {
                    if (value) return value;
                    return [
                        {
                            tag: "i",
                            text: "No label",
                            style: { color: "#AAA" },
                        },
                    ];
                },
            },
            {
                type: "color",
                text: "Color",
                field: "color",
                width: 70,
                colors: colorPalette,
            },
            {
                type: "action",
                width: 45,
                actions: [
                    {
                        cls: "b-fa b-fa-trash",
                        tooltip: "Delete item",
                        onClick: async ({ record }) => {
                            record.remove();
                        },
                    },
                ],
            },
        ],
    };
}
ConnectionsGrid.initClass();

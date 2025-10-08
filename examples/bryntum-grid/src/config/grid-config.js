import { util } from "@joint/core";
import { shapeKinds, colors } from "../constants";

const gridConfig = {
    columns: [
        { text: "Name", field: "name", flex: 1, minWidth: 150 },
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
            type: "color",
            text: "Color",
            field: "color",
            width: 70,
            colors: Object.keys(colors).map((name) => {
                return {
                    color: colors[name],
                    text: util.toKebabCase(name).replace(/-/g, " "),
                };
            }),
            style: { color: "red" },
        },
        {
            text: "Connections",
            field: "connections",
            flex: 3,
            autoHeight: true,
            editor: {
                type: "combo",
                multiSelect: true,
                valueField: "id",
                displayField: "text",
                items: [], // will be set in the `beforeCellEditStart` listener
            },

            renderer: ({ record, grid }) => {
                const connections = record.get("connections") || [];
                const chips = connections.map((id) => {
                    return grid.store.getById(id).get("name");
                });
                // Note: we can not use ReactDOM here because it would not
                // update the chips when any of the names change.
                const div = document.createElement("div");
                div.style.display = "flex";
                div.style.gap = "5px";
                div.style.flexWrap = "wrap";
                div.style.margin = "10px";
                chips.forEach((chip) => {
                    const chipEl = document.createElement("i");
                    chipEl.className = "b-chip";
                    chipEl.textContent = chip;
                    div.appendChild(chipEl);
                });
                return div;
            },
        },
    ]
};

export default gridConfig;

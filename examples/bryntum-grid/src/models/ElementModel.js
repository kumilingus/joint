import { GridRowModel, Store } from "@bryntum/grid";
import { LinkModel } from "./LinkModel";

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

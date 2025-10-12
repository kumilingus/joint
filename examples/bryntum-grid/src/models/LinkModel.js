import { GridRowModel } from "@bryntum/grid";

export class LinkModel extends GridRowModel {
    static fields = [
        "id", // id of the target element
        "targetId",
        "label",
        "color",
    ];
}

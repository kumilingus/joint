import { shapes, util } from "@joint/core";

export const END_TYPE = 'End';

export class End extends shapes.standard.Ellipse {
    defaults(): Partial<shapes.standard.EllipseAttributes> {
        return util.defaultsDeep({
            type: END_TYPE,
            size: {
                width: 30,
                height: 30
            },
            attrs: {
                body: {
                    rx: 15,
                    ry: 15,
                    stroke: '#333',
                    strokeWidth: 2
                },
                label: {
                    fill: "#666666",
                    fontSize: 13,
                    fontFamily: "sans-serif",
                    style: {
                        textTransform: "capitalize"
                    }
                }
            }
        }, super.defaults);
    }

    static create(id?: string) {
        id = id ?? util.uniqueId();

        return new End({
            id,
            attrs: {
                label: {
                    text: id.slice(0, 2)
                }
            }
        });
    }
}

import { shapes, util, dia } from "@joint/core";

export class Placeholder extends shapes.standard.Rectangle {
    defaults(): Partial<shapes.standard.RectangleAttributes> {
        return util.defaultsDeep({
            type: 'Placeholder',
            size: { width: 100, height: 30 },
            attrs: {
                body: {
                    stroke: '#0075F2',
                    strokeWidth: 2,
                    strokeDasharray: '5, 5',
                },
                label: {
                    fill: "#333",
                    fontSize: 10,
                    fontFamily: "sans-serif",
                    style: {
                        textTransform: "capitalize"
                    }
                }
            }
        }, super.defaults);
    }

    static create(id?: dia.Cell.ID) {
        id = id ?? util.uniqueId();
        return new Placeholder({
            id,
        });
    }

    static isPlaceholder(element: dia.Cell): element is Placeholder {
        return element.get('type') === 'Placeholder';
    }
}

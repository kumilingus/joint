import { shapes, util } from '@joint/core';

export const STEP_TYPE = 'Step';

export class Step extends shapes.standard.Rectangle {

    defaults(): Partial<shapes.standard.RectangleAttributes> {
        return util.defaultsDeep({
            type: STEP_TYPE,
            size: { width: 100, height: 30 },
            attrs: {
                body: {
                    rx: 5,
                    ry: 5,
                    stroke: '#333',
                    strokeWidth: 2
                },
                label: {
                    fill: "#333",
                    fontSize: 13,
                    fontFamily: "sans-serif",
                    style: {
                        textTransform: "capitalize"
                    }
                }
            }
        }, super.defaults)
    }

    static create(id?: string) {

        id = id ?? util.uniqueId();

        return new Step({
            id,
            attrs: {
                label: {
                    text: id.slice(0, 5)
                }
            }
        });
    }
}

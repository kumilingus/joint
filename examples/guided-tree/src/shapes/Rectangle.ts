import { shapes, util } from '@joint/core';

export class Rectangle extends shapes.standard.Rectangle {

    defaults(): Partial<shapes.standard.RectangleAttributes> {
        return util.defaultsDeep({
            type: 'app.Rectangle',
            size: { width: 30, height: 30 },
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

        return new Rectangle({
            id,
            attrs: {
                label: {
                    text: id
                }
            }
        });
    }
}

Object.assign(shapes, {
    app: {
        Rectangle
    }
});

import { shapes, util, dia } from "@joint/core";
import { PRIMARY_COLOR } from '../theme';

export class Placeholder extends shapes.standard.Rectangle {
    defaults(): Partial<shapes.standard.RectangleAttributes> {
        return util.defaultsDeep({
            type: 'Placeholder',
            size: { width: 100, height: 30 },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: {
                    stroke: PRIMARY_COLOR,
                    strokeWidth: 2,
                    strokeDasharray: '5, 5',
                },
                label: {
                    text: 'placeholder',
                    fill: PRIMARY_COLOR,
                    opacity: 0.7,
                    fontSize: 10,
                    fontFamily: "sans-serif"
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

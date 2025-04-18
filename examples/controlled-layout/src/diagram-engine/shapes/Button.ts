import { shapes, util, dia } from '@joint/core';
import { PRIMARY_COLOR } from '../theme';

export class Button extends shapes.standard.Circle {
    defaults(): Partial<shapes.standard.CircleAttributes> {
        return util.defaultsDeep({
            type: 'Button',
            size: { width: 20, height: 30 },
            attrs: {
                root: {
                    style: { cursor: 'pointer' }
                },
                body: {
                    magnet: true,
                    stroke: PRIMARY_COLOR,
                    strokeWidth: 1,
                    cursor: 'crosshair'
                },
                label: {
                    pointerEvents: 'none',
                    fill: PRIMARY_COLOR,
                    opacity: 0.7,
                    fontWeight: 'bold',
                    text: '+',
                    y: 10
                }
            }
        }, super.defaults);
    }

    static isButton(element: dia.Cell): element is Button {
        return element.get('type') === 'Button';
    }
}

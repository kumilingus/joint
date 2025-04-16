import { shapes, util, dia } from '@joint/core';

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
                    stroke: '#0075F2',
                    strokeWidth: 1,
                    cursor: 'crosshair'
                },
                label: {
                    pointerEvents: 'none',
                    fill: '#0075F2',
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

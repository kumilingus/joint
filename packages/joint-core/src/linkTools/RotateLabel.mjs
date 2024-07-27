import * as g from '../g/index.mjs';
import { Control } from '../cellTools/Control.mjs';

export const RotateLabel = Control.extend({

    xAxisVector: new g.Point(1, 0),

    children() {
        const {
            buttonColor = '#333',
            iconColor = '#fff',
            outlineColor = '#fff'
        } = this.options;
        return [{
            selector: 'handle',
            tagName: 'g',
            attributes: {
                cursor: 'grab',
            },
            children: [{
                tagName: 'circle',
                attributes: {
                    r: 10,
                    fill: buttonColor,
                    stroke: outlineColor,
                },
            }, {
                tagName: 'path',
                attributes: {
                    d: 'M -5 0 A 5 5 0 1 1 0 5',
                    fill: 'transparent',
                    stroke: iconColor,
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                },
            }, {
                tagName: 'path',
                attributes: {
                    d: 'M -3 5 L 0 2.5 0 7.5 Z',
                    fill: iconColor,
                    stroke: iconColor,
                    strokeWidth: 1,
                    transform: 'rotate(-5, -3, 5)',
                }
            }]
        }];
    },

    getPosition(view) {
        const { offset = 0 } = this.options;
        const model = view.model;
        const index = this.options.labelIndex;
        const label = model.label(index);
        if (!label) {
            throw new Error(`No label with index ${index} found.`);
        }

        const labelPosition = this.getLabelPosition(label);
        const coords = view.getLabelCoordinates(labelPosition);
        let { angle = 0, args = {}} = labelPosition;
        const keepGradient = args.keepGradient;
        if (keepGradient) {
            const tangent = view.getTangentAtRatio(
                view.getClosestPointRatio(coords)
            );
            if (tangent) {
                // link slope angle
                angle += tangent.vector().vectorAngle(this.xAxisVector) || 0;
            }
        }
        const matrix = new DOMMatrix()
            .translate(coords.x, coords.y)
            .rotate(angle)
            .translate(0, offset);
        return new g.Point(matrix.e, matrix.f);
    },

    setPosition(view, coordinates) {
        const model = view.model;
        const index = this.options.labelIndex;
        const label = model.label(index);
        if (!label) return;
        const labelPosition = this.getLabelPosition(label);
        const position = view.getLabelCoordinates(labelPosition);
        const angle = 90 - position.theta(coordinates);
        model.prop(['labels', index, 'position', 'angle'], angle);
    },

    resetPosition(view) {
        const model = view.model;
        const index = this.options.labelIndex;
        model.prop(['labels', index, 'position', 'angle'], 0);
    },

    getLabelPosition(label) {
        return typeof label.position === 'number'
            ? { distance: label.position }
            : label.position;
    },

});

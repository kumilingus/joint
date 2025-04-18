import { dia, shapes, util } from '@joint/core';
import { PRIMARY_COLOR } from '../const';

export class ButtonLink extends shapes.standard.Link {
    defaults(): Partial<dia.Link.Attributes> {
        return util.defaultsDeep({
            type: 'ButtonLink',
            z: -1,
            attrs: {
                wrapper: {
                    cursor: 'default',
                },
                line: {
                    stroke: PRIMARY_COLOR,
                    strokeWidth: 1,
                    strokeDasharray: '5, 5',
                    targetMarker: null
                }
            }
        }, super.defaults)
    }

    static isButtonLink(cell: dia.Cell): cell is ButtonLink {
        return cell.get('type') === 'ButtonLink';
    }
}

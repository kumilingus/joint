import { dia, shapes, util } from '@joint/core';
import { LINK_LABEL_ATTRIBUTES } from '../theme';

export class Link extends shapes.standard.Link {
    defaults(): Partial<dia.Link.Attributes> {

        const margin = 5;
        const bgColor = '#fff';
        const textColor = '#333';

        return util.defaultsDeep({
            type: 'Link',
            defaultLabel: {
                markup: [{
                    tagName: 'rect',
                    selector: 'labelBody'
                }, {
                    tagName: 'text',
                    selector: 'labelText'
                }],
                attrs: {
                    labelBody: {
                        ref: 'labelText',
                        fill: bgColor,
                        fillOpacity: 0.8,
                        stroke: '#333',
                        strokeWidth: 0.5,
                        width: `calc(w + ${margin * 2})`,
                        height: `calc(h + ${margin * 2})`,
                        x: `calc(x - ${margin})`,
                        y: `calc(y - ${margin})`,
                    },
                    labelText: {
                        ...LINK_LABEL_ATTRIBUTES,
                        textAnchor: 'middle',
                        textVerticalAnchor: 'middle',
                        y: 10,
                        fill: textColor ,
                        stroke: bgColor,
                        strokeWidth: 2,
                        paintOrder: 'stroke',
                    }
                }


            }
        }, super.defaults)
    }
}


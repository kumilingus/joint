(function(Element, Link) {

    'use strict';

    // Elements

    Element.define('ng.Rect', {
        attrs: {
            body: {
                refWidth: '100%',
                refHeight: '100%',
                strokeWidth: 2,
                stroke: '#000000',
                fill: '#FFFFFF'
            },
            label: {
                fontSize: 14,
                verticalAlignment: 'center',
                horizontalAlignment: 'center',
                fill: '#333333'
            }
        }
    }, {
        markup: [{
            tagName: 'rect',
            selector: 'body',
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });

    Element.define('ng.Ellipse', {
        attrs: {
            body: {
                refCx: '50%',
                refCy: '50%',
                refRx: '50%',
                refRy: '50%',
                strokeWidth: 2,
                stroke: '#333333',
                fill: '#FFFFFF'
            },
            label: {
                fontSize: 14,
                verticalAlignment: 'center',
                horizontalAlignment: 'center',
                margin: 5,
                fill: '#333333'
            }
        }
    }, {
        markup: [{
            tagName: 'ellipse',
            selector: 'body'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });

    Element.define('ng.Path', {
        attrs: {
            body: {
                refD: 'M 0 0 L 10 0 10 10 0 10 Z',
                strokeWidth: 2,
                stroke: '#333333',
                fill: '#FFFFFF'
            },
            label: {
                fontSize: 14,
                verticalAlignment: 'center',
                horizontalAlignment: 'center',
                margin: 5,
                fill: '#333333'
            }
        }
    }, {
        markup: [{
            tagName: 'path',
            selector: 'body'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });

    Element.define('ng.Polygon', {
        attrs: {
            body: {
                refPoints: '0 0 10 0 10 10 0 10',
                strokeWidth: 2,
                stroke: '#333333',
                fill: '#FFFFFF'
            },
            label: {
                fontSize: 14,
                verticalAlignment: 'center',
                horizontalAlignment: 'center',
                margin: 5,
                fill: '#333333'
            }
        }
    }, {
        markup: [{
            tagName: 'polygon',
            selector: 'body'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });

    Element.define('ng.Polyline', {
        attrs: {
            body: {
                refPoints: '0 0 10 0 10 10 0 10 0 0',
                strokeWidth: 2,
                stroke: '#333333',
                fill: '#FFFFFF'
            },
            label: {
                fontSize: 14,
                verticalAlignment: 'center',
                horizontalAlignment: 'center',
                margin: 5,
                fill: '#333333'
            }
        }
    }, {
        markup: [{
            tagName: 'polyline',
            selector: 'body'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });

    Element.define('ng.Image', {
        attrs: {
            body: {
                refWidth: '100%',
                refHeight: '100%',
                // xlinkHref: '[URL]'
            },
            label: {
                fontSize: 14,
                verticalAlignment: 'below',
                horizontalAlignment: 'center',
                margin: 5,
                fill: '#333333'
            }
        }
    }, {
        markup: [{
            tagName: 'image',
            selector: 'body'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });
    // Links

    Link.define('ng.Link', {
        attrs: {
            line: {
                connection: true,
                stroke: '#333333',
                strokeWidth: 2,
                strokeLinejoin: 'round',
                targetMarker: {
                    type: 'path',
                    d: 'M 10 -5 0 0 10 5 z'
                }
            },
            wrapper: {
                connection: true,
                strokeWidth: 10,
                strokeLinejoin: 'round'
            }
        }
    }, {
        markup: [{
            tagName: 'path',
            selector: 'wrapper',
            attributes: {
                'fill': 'none',
                'cursor': 'pointer',
                'stroke': 'transparent'
            }
        }, {
            tagName: 'path',
            selector: 'line',
            attributes: {
                'fill': 'none',
                'pointer-events': 'none'
            }
        }]
    });

    Link.define('ng.DoubleLink', {
        attrs: {
            line: {
                connection: true,
                stroke: '#DDDDDD',
                strokeWidth: 4,
                strokeLinejoin: 'round',
                targetMarker: {
                    'type': 'path',
                    'stroke': '#000000',
                    'stroke-width': 1,
                    'd': 'M 10 -3 10 -10 -2 0 10 10 10 3'
                }
            },
            outline: {
                connection: true,
                stroke: '#000000',
                strokeWidth: 6,
                strokeLinejoin: 'round'
            }
        }
    }, {
        markup: [{
            tagName: 'path',
            selector: 'outline',
            attributes: {
                'fill': 'none'
            }
        }, {
            tagName: 'path',
            selector: 'line',
            attributes: {
                'fill': 'none'
            }
        }]
    });

    Link.define('ng.ShadowLink', {
        attrs: {
            line: {
                connection: true,
                stroke: '#FF0000',
                strokeWidth: 20,
                strokeLinejoin: 'round',
                targetMarker: {
                    'type': 'path',
                    'stroke': 'none',
                    'd': 'M 0 -10 -10 0 0 10 z'
                },
                sourceMarker: {
                    'type': 'path',
                    'stroke': 'none',
                    'd': 'M -10 -10 0 0 -10 10 0 10 0 -10 z'
                }
            },
            shadow: {
                connection: { tx: 3, ty: 6 },
                stroke: '#000000',
                strokeOpacity: 0.2,
                strokeWidth: 20,
                strokeLinejoin: 'round',
                targetMarker: {
                    'type': 'path',
                    'd': 'M 0 -10 -10 0 0 10 z',
                    'stroke': 'none'
                },
                sourceMarker: {
                    'type': 'path',
                    'stroke': 'none',
                    'd': 'M -10 -10 0 0 -10 10 0 10 0 -10 z'
                }
            }
        }
    }, {
        markup: [{
            tagName: 'path',
            selector: 'line',
            attributes: {
                'fill': 'none'
            }
        }, {
            tagName: 'path',
            selector: 'shadow',
            attributes: {
                'fill': 'none'
            }
        }]
    });

})(joint.dia.Element, joint.dia.Link);
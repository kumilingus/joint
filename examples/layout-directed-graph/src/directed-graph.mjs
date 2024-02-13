import * as joint from '@joint/core';
import { DirectedGraph } from '@joint/layout-directed-graph';

function val(view, selector, val) {
    var el = view.el.querySelector(selector);
    if (!el) return null;
    if (val === undefined) {
        return el.value;
    }
    el.value = val;
}

var Shape = joint.dia.Element.define('demo.Shape', {
    z: 2,
    size: {
        width: 100,
        height: 50
    },
    attrs: {
        body: {
            width: 'calc(w)',
            height: 'calc(h)',
            fill: 'ivory',
            stroke: 'gray',
            strokeWidth: 2,
            rx: 10,
            ry: 10
        },
        label: {
            x: 'calc(w / 2)',
            y: 'calc(h / 2)',
            textVerticalAnchor: 'middle',
            textAnchor: 'middle',
            fontSize: 30
        }
    }
}, {
    markup: [{
        tagName: 'rect',
        selector: 'body'
    }, {
        tagName: 'text',
        selector: 'label'
    }],

    setText: function(text) {
        return this.attr('label/text', text || '');
    }
});

var Link = joint.dia.Link.define('demo.Link', {
    attrs: {
        line: {
            connection: true,
            stroke: 'gray',
            strokeWidth: 2,
            pointerEvents: 'none',
            targetMarker: {
                type: 'path',
                fill: 'gray',
                stroke: 'none',
                d: 'M 10 -10 0 0 10 10 z'
            }
        }
    },
    connector: {
        name: 'rounded'
    },
    z: 1,
    weight: 1,
    minLen: 1,
    labelPosition: 'c',
    labelOffset: 10,
    // labelSize: {
    //     width: 50,
    //     height: 30
    // },
    // labels: [{
    //     markup: [{
    //         tagName: 'rect',
    //         selector: 'labelBody'
    //     }, {
    //         tagName: 'text',
    //         selector: 'labelText'
    //     }],
    //     attrs: {
    //         labelText: {
    //             fill: 'gray',
    //             textAnchor: 'middle',
    //             y: 5,
    //             fontSize: 20,
    //             cursor: 'pointer'
    //         },
    //         labelBody: {
    //             fill: 'lightgray',
    //             stroke: 'gray',
    //             strokeWidth: 2,
    //             width: 'calc(w)',
    //             height: 'calc(h)',
    //             x: 'calc(-0.5 * w)',
    //             y: 'calc(-0.5 * h)',
    //             rx: 5,
    //             ry: 5
    //         }
    //     },
    //     size: {
    //         width: 50, height: 30
    //     }
    // }]

}, {

    markup: [{
        tagName: 'path',
        selector: 'line',
        attributes: {
            'fill': 'none'
        }
    }],

    connect: function(sourceId, targetId) {
        return this.set({
            source: { id: sourceId },
            target: { id: targetId }
        });
    },

    setLabelText: function(text) {
        return this.prop('labels/0/attrs/labelText/text', text || '');
    }
});

const shapes = {
    ...joint.shapes,
    demo: { Shape, Link }
}

var LayoutControls = joint.mvc.View.extend({

    events: {
        change: 'onChange',
        input: 'onChange'
    },

    options: {
        padding: 50
    },

    init: function() {

        var options = this.options;
        // if (options.adjacencyList) {
        //     options.cells = this.buildGraphFromAdjacencyList(options.adjacencyList);
        // }

        const diagram = {
            'objects': [
                {
                    'id': 'pm',
                    'data': {
                        'nodes': [
                            {
                                'node_name': 'Start',
                                'node_id': 0,
                                'node_type': 'start',
                                'count': null,
                                'relative_frequency': null
                            },
                            {
                                'node_name': 'Order Received',
                                'node_id': 6,
                                'node_type': 'node',
                                'count': 54567,
                                'relative_frequency': 10.505
                            },
                            {
                                'node_name': 'Order Validation',
                                'node_id': 8,
                                'node_type': 'node',
                                'count': 66952,
                                'relative_frequency': 12.889
                            },
                            {
                                'node_name': 'Customer Credit Check',
                                'node_id': 5,
                                'node_type': 'node',
                                'count': 79337,
                                'relative_frequency': 15.274
                            },
                            {
                                'node_name': 'Order Approval',
                                'node_id': 3,
                                'node_type': 'node',
                                'count': 44016,
                                'relative_frequency': 8.474
                            },
                            {
                                'node_name': 'Order Confirmation Sent',
                                'node_id': 9,
                                'node_type': 'node',
                                'count': 44016,
                                'relative_frequency': 8.474
                            },
                            {
                                'node_name': 'Order Rejected',
                                'node_id': 1,
                                'node_type': 'node',
                                'count': 10551,
                                'relative_frequency': 2.031
                            },
                            {
                                'node_name': 'Prepare Goods for Shipment',
                                'node_id': 4,
                                'node_type': 'node',
                                'count': 44016,
                                'relative_frequency': 8.474
                            },
                            {
                                'node_name': 'Send Invoice',
                                'node_id': 7,
                                'node_type': 'node',
                                'count': 40472,
                                'relative_frequency': 7.791
                            },
                            {
                                'node_name': 'Goods Shipped',
                                'node_id': 11,
                                'node_type': 'node',
                                'count': 44016,
                                'relative_frequency': 8.474
                            },
                            {
                                'node_name': 'Payment Received',
                                'node_id': 10,
                                'node_type': 'node',
                                'count': 40472,
                                'relative_frequency': 7.791
                            },
                            {
                                'node_name': 'Order Completed',
                                'node_id': 2,
                                'node_type': 'node',
                                'count': 51023,
                                'relative_frequency': 9.823
                            },
                            {
                                'node_name': 'End',
                                'node_id': 99999,
                                'node_type': 'end',
                                'count': null,
                                'relative_frequency': null
                            }
                        ],
                        'edges': [
                            {
                                'node_id_from': 5,
                                'node_id_to': 1,
                                'count': 10551,
                                'relative_frequency': 13.299,
                                'median_throughputtime_sec': 172800.0,
                                'mean_throughputtime_sec': 173545.0
                            },
                            {
                                'node_id_from': 5,
                                'node_id_to': 3,
                                'count': 31588,
                                'relative_frequency': 39.815,
                                'median_throughputtime_sec': 172800.0,
                                'mean_throughputtime_sec': 169737.0
                            },
                            {
                                'node_id_from': 5,
                                'node_id_to': 5,
                                'count': 24770,
                                'relative_frequency': 31.221,
                                'median_throughputtime_sec': 259200.0,
                                'mean_throughputtime_sec': 215958.0
                            },
                            {
                                'node_id_from': 5,
                                'node_id_to': 9,
                                'count': 12428,
                                'relative_frequency': 15.665,
                                'median_throughputtime_sec': 172800.0,
                                'mean_throughputtime_sec': 193677.0
                            },
                            {
                                'node_id_from': 9,
                                'node_id_to': 3,
                                'count': 12428,
                                'relative_frequency': 28.235,
                                'median_throughputtime_sec': 86400.0,
                                'mean_throughputtime_sec': 86400.0
                            },
                            {
                                'node_id_from': 9,
                                'node_id_to': 4,
                                'count': 31588,
                                'relative_frequency': 71.765,
                                'median_throughputtime_sec': 345600.0,
                                'mean_throughputtime_sec': 372446.0
                            },
                            {
                                'node_id_from': 10,
                                'node_id_to': 2,
                                'count': 40472,
                                'relative_frequency': 100.0,
                                'median_throughputtime_sec': 172800.0,
                                'mean_throughputtime_sec': 199240.0
                            },
                            {
                                'node_id_from': 8,
                                'node_id_to': 5,
                                'count': 54567,
                                'relative_frequency': 81.502,
                                'median_throughputtime_sec': 432000.0,
                                'mean_throughputtime_sec': 404058.0
                            },
                            {
                                'node_id_from': 8,
                                'node_id_to': 8,
                                'count': 12385,
                                'relative_frequency': 18.498,
                                'median_throughputtime_sec': 259200.0,
                                'mean_throughputtime_sec': 259200.0
                            },
                            {
                                'node_id_from': 1,
                                'node_id_to': 2,
                                'count': 10551,
                                'relative_frequency': 100.0,
                                'median_throughputtime_sec': 345600.0,
                                'mean_throughputtime_sec': 345600.0
                            },
                            {
                                'node_id_from': 3,
                                'node_id_to': 4,
                                'count': 12428,
                                'relative_frequency': 28.235,
                                'median_throughputtime_sec': 259200.0,
                                'mean_throughputtime_sec': 269962.0
                            },
                            {
                                'node_id_from': 3,
                                'node_id_to': 9,
                                'count': 31588,
                                'relative_frequency': 71.765,
                                'median_throughputtime_sec': 86400.0,
                                'mean_throughputtime_sec': 48200.0
                            },
                            {
                                'node_id_from': 6,
                                'node_id_to': 8,
                                'count': 54567,
                                'relative_frequency': 100.0,
                                'median_throughputtime_sec': 172800.0,
                                'mean_throughputtime_sec': 206212.0
                            },
                            {
                                'node_id_from': 11,
                                'node_id_to': 99999,
                                'count': 3544,
                                'relative_frequency': 8.052,
                                'median_throughputtime_sec': null,
                                'mean_throughputtime_sec': null
                            },
                            {
                                'node_id_from': 11,
                                'node_id_to': 7,
                                'count': 24900,
                                'relative_frequency': 56.57,
                                'median_throughputtime_sec': 0.0,
                                'mean_throughputtime_sec': 37686.0
                            },
                            {
                                'node_id_from': 11,
                                'node_id_to': 10,
                                'count': 15572,
                                'relative_frequency': 35.378,
                                'median_throughputtime_sec': 86400.0,
                                'mean_throughputtime_sec': 95522.0
                            },
                            {
                                'node_id_from': 0,
                                'node_id_to': 6,
                                'count': 54567,
                                'relative_frequency': 100.0,
                                'median_throughputtime_sec': null,
                                'mean_throughputtime_sec': null
                            },
                            {
                                'node_id_from': 2,
                                'node_id_to': 99999,
                                'count': 51023,
                                'relative_frequency': 100.0,
                                'median_throughputtime_sec': null,
                                'mean_throughputtime_sec': null
                            },
                            {
                                'node_id_from': 7,
                                'node_id_to': 10,
                                'count': 24900,
                                'relative_frequency': 61.524,
                                'median_throughputtime_sec': 172800.0,
                                'mean_throughputtime_sec': 204726.0
                            },
                            {
                                'node_id_from': 7,
                                'node_id_to': 11,
                                'count': 15572,
                                'relative_frequency': 38.476,
                                'median_throughputtime_sec': 86400.0,
                                'mean_throughputtime_sec': 129078.0
                            },
                            {
                                'node_id_from': 4,
                                'node_id_to': 7,
                                'count': 15572,
                                'relative_frequency': 35.378,
                                'median_throughputtime_sec': 172800.0,
                                'mean_throughputtime_sec': 165188.0
                            },
                            {
                                'node_id_from': 4,
                                'node_id_to': 11,
                                'count': 28444,
                                'relative_frequency': 64.622,
                                'median_throughputtime_sec': 172800.0,
                                'mean_throughputtime_sec': 187520.0
                            }
                        ]
                    }
                }
            ]
        };

        const graph = this.options.paper.model;
        const cells = [];
        diagram.objects[0].data.nodes.forEach((node) => {
            cells.push({
                id: `${node.node_id}`,
                type: 'demo.Shape',
                size: { width: 30, height: 30 },
                position: { x: Math.random() * 800, y: Math.random() * 800 },
                attrs: {
                    // label: { text: node.node_name },
                    label: { text: `${node.node_id}` },
                    body: { fill: '#3498db', stroke: '#2980b9' }
                },
                z: 2
            });
        });

        diagram.objects[0].data.edges.forEach((edge) => {
            cells.push({
                type: 'demo.Link',
                source: { id: `${edge.node_id_from}` },
                target: { id: `${edge.node_id_to}` },
                z: -1,
                // attrs: { line: { targetMarker: null }}
            });
        });

        this.options.cells = cells;

        this.listenTo(options.paper.model, 'change', function(_, opt) {
            if (opt.layout) this.layout();
        });
    },

    onChange: function() {
        this.layout();
        this.trigger('layout');
    },

    layout: function() {

        var paper = this.options.paper;
        var graph = paper.model;
        var cells = this.options.cells;

        paper.freeze();


        if (graph.getCells().length === 0) {
            // The graph could be empty at the beginning to avoid cells rendering
            // and their subsequent update when elements are translated
            graph.resetCells(cells);

            const variants = ['0', '6', '8', '5', '9', '4', '11'];
            const variantElements = variants.map((variant) => graph.getCell(variant));

            const variantLinks = graph.getSubgraph(variantElements).filter((cell) => cell.isLink() && !cell.hasLoop());



            variantLinks.forEach((link) => {
                link.attr('line/stroke', 'red');
                link.set('weight', 100);
            });

            variantElements.forEach(el => {
                el.attr('body/stroke', 'red');
            });

            const container = new joint.shapes.standard.Rectangle({
                z: - 1,
                attrs: {
                    body: {
                        opacity: 0
                    }
                }

            });

            variantElements.forEach((el) => {
                container.embed(el);
            });
            graph.addCell(container);
        }

        DirectedGraph.layout(graph, this.getLayoutOptions());


        // paper.fitToContent({
        //     padding: this.options.padding,
        //     allowNewOrigin: 'any',
        //     useModelGeometry: true
        // });
        paper.transformToFitContent({
            useModelGeometry: true,
            padding: this.options.padding
        });

        paper.unfreeze();
    },

    getLayoutOptions: function() {
        return {
            setVertices: true,
            // setLabels: true,
            ranker: val(this, '#ranker'),
            rankDir: val(this, '#rankdir'),
            align: val(this, '#align'),
            rankSep: parseInt(val(this, '#ranksep'), 10),
            edgeSep: parseInt(val(this, '#edgesep'), 10),
            nodeSep: parseInt(val(this, '#nodesep'), 10)
        };
    },

    buildGraphFromAdjacencyList: function(adjacencyList) {

        var elements = [];
        var links = [];

        Object.keys(adjacencyList).forEach(function(parentLabel) {
            // Add element
            elements.push(
                new Shape({ id: parentLabel }).setText(parentLabel)
            );
            // Add links
            adjacencyList[parentLabel].forEach(function(childLabel) {
                links.push(
                    new Link()
                        .connect(parentLabel, childLabel)
                        .setLabelText(parentLabel + '-' + childLabel)
                );
            });
        });

        // Links must be added after all the elements. This is because when the links
        // are added to the graph, link source/target
        // elements must be in the graph already.
        return elements.concat(links);
    }

});


var template = document.getElementById('link-controls-template');
if (template.content) {
    template = template.content;
}

var LinkControls = joint.mvc.View.extend({

    highlighter: {
        name: 'stroke',
        options: {
            attrs: {
                'stroke': 'lightcoral',
                'stroke-width': 4
            }
        }
    },

    events: {
        change: 'updateLink',
        input: 'updateLink'
    },

    init: function() {
        this.highlight();
        this.updateControls();
    },

    updateLink: function() {
        this.options.cellView.model.set(this.getModelAttributes(), { layout: true });
        this.constructor.refresh();
    },

    updateControls: function() {

        var link = this.options.cellView.model;

        val(this, '#labelpos', link.get('labelPosition'));
        val(this, '#labeloffset', link.get('labelOffset'));
        val(this, '#minlen', link.get('minLen'));
        val(this, '#weight', link.get('weight'));
    },

    getModelAttributes: function() {
        return {
            minLen: parseInt(val(this, '#minlen'), 10),
            weight: parseInt(val(this, '#weight'), 10),
            labelPosition: val(this, '#labelpos'),
            labelOffset: parseInt(val(this, '#labeloffset'), 10)
        };
    },

    onRemove: function() {
        this.unhighlight();
    },

    highlight: function() {
        this.options.cellView.highlight('rect', { highlighter: this.highlighter });
    },

    unhighlight: function() {
        this.options.cellView.unhighlight('rect', { highlighter: this.highlighter });
    }

}, {

    create: function(linkView) {
        this.remove();
        this.instance = new this({
            el: this.template.cloneNode(true),
            cellView: linkView
        });
        document.getElementById('layout-controls').after(this.instance.el);
    },

    remove: function() {
        if (this.instance) {
            this.instance.remove();
            this.instance = null;
        }
    },

    refresh: function() {
        if (this.instance) {
            this.instance.unhighlight();
            this.instance.highlight();
        }
    },

    instance: null,

    template: template.querySelector('.controls')

});

var controls = new LayoutControls({
    el: document.getElementById('layout-controls'),
    paper: new joint.dia.Paper({
        el: document.getElementById('paper'),
        height: 800,
        model: new joint.dia.Graph({}, { cellNamespace: shapes }),
        cellViewNamespace: shapes,
        interactive: function(cellView) {
            return cellView.model.isElement();
        }
    }).on({
        'link:pointerdown': LinkControls.create,
        'blank:pointerdown element:pointerdown': LinkControls.remove
    }, LinkControls),
    adjacencyList: {
        a: ['b','c','d'],
        b: ['d', 'e'],
        c: [],
        d: [],
        e: ['e'],
        f: [],
        g: ['b','i'],
        h: ['f'],
        i: ['f','h']
    }
}).on({
    'layout': LinkControls.refresh
}, LinkControls);

controls.layout();

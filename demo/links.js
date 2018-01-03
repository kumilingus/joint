
var graph = new joint.dia.Graph;

var paper = new joint.dia.Paper({

    el: $('#paper'),
    width: 800,
    height: 1400,
    gridSize: 1,
    perpendicularLinks: false,
    model: graph,
    tools: function(cellView) {
        if (cellView.model.isElement()) return null;
        var tools = joint.dia.tools;
        return [
            tools.Vertices,
            tools.SourceArrowhead,
            tools.TargetArrowhead,
            // tools.Remove,
            tools.Segments,
            tools.Boundary
            // tools.Vectors,
            //tools.TargetArrowhead
        ]
    },
    // linkConnectionPoint: function(linkView, elementView, magnet, ref, end) {
    //     return elementView.model.getBBox().rightMiddle();
    // },
    interactive: function() {
        return { vertexAdd: false }
    },
    // anchor: joint.anchors.center,
    // connectionPoint: joint.connectionPoints.boundary
});

$('#perpendicularLinks').on('change', function() {

    paper.options.perpendicularLinks = $(this).is(':checked') ? true : false;

});

var r1 = new joint.shapes.basic.Rect({
    position: { x: 335, y: 50 },
    size: { width: 70, height: 30 },
    attrs: {
        rect: { fill: 'orange' },
        text: { text: 'Box', magnet: true }
    }
});
graph.addCell(r1);


function title(x, y, text) {
    var el = new joint.shapes.basic.Text({
        position: { x: x, y: y },
        size: { width: text.length * 4, height: text.split('\n').length * 15 },
        attrs: {
            text: { text: text, 'font-size': 12, 'text-anchor': 'end' }
        }
    });

    graph.addCell(el);
}

// Default connection of two elements.
// -----------------------------------

title(250, 70, 'Default connection');

var r2 = r1.clone();

graph.addCell(r2);
r2.translate(300);

paper.on('link:mouseenter', function(linkView) {
    console.log('link-enter');
    if (linkView.model.get('showTools') === 1) {
        if (!linkView._tools) linkView.addTools();
    }
});

paper.on('link:mouseleave', function(linkView, evt) {
    console.log('link-leave');
    if (linkView.model.get('showTools') === 1) {
        linkView.removeTools();
    }
});
var lv;
paper.on('link:pointerdown', function(linkView) {
    if (linkView.model.get('showTools') === 2) {
        if (lv) lv.removeTools();
        linkView.addTools([
            joint.dia.tools.Vectors
        ]);
        lv = linkView;
    }
});
paper.on('blank:pointerdown', function(linkView) {
    if (lv) lv.removeTools();
});

joint.dia.attributes.drawPath = {
    path: function(value, path, node) {

        // var p1, p2;
        // var d1 = ['M'];
        // var d2 = ['Z'];
        // for (var i = 0, n = path.pathSegments.length; i < n; i++) {

        //     var t = path.pathSegments[i].tangent(0);
        //     if (t) {
        //         var x = t.start.clone().rotate(t.end, 90);
        //         var t1 = t.start.clone().move(x, 5);
        //         var t2 = t.start.clone().move(x, -5);

        //         d1.push(t1.x, t1.y);
        //         d2.push(t2.y, t2.x);
        //     }

        //     if (i === n - 1) {
        //         var t = path.pathSegments[i].tangent(1);
        //         if (t) {
        //             var x = t.end.clone().rotate(t.end, 90);
        //             var t1 = t.end.clone().move(x, 5);
        //             var t2 = t.end.clone().move(x, -5);

        //             d1.push(t1.x, t1.y);
        //             d2.push(t2.y, t2.x);
        //         }
        //     }
        // }


        // var d = d1.concat(d2.reverse()).join(' ');
        // //var d = ['M', p1.x, p1.y, p2.x, p2.y].join(' ');
        // //path.serialize()
        // node.setAttribute('d', d);

        //var d = ['M', p1.x, p1.y, p2.x, p2.y].join(' ');
        return { 'd': path.serialize() };
        //node.setAttribute('d', path.serialize());
    }
};

joint.dia.attributes.atPathLength = {
    path: function(value, path, node) {
        var p = path.pointAtLength(value, { precision: 3 });
        var tangent = path.tangentAtLength(value);
        var angle;
        if (tangent) {
            angle = tangent.vector().vectorAngle(g.Point(1,0));
        } else {
            angle = 0;
        }

        return { transform: V.matrixToTransformString(
            V.createSVGMatrix().translate(p.x, p.y).rotateFromVector(
                tangent.vector().x || 1,
                tangent.vector().y || 1
            )
        )};


        //return { transform: V.matrixToTransformString(V.createSVGMatrix().translate(p.x, p.y).rotate(0)) }

        //return { transform: `translate(${p.x},${p.y}) rotate(${angle})` };
    }
};

joint.dia.attributes.atPathT = {
    path: function(value, path, node) {
        var p, angle;
        var tangent = path.tangentAt(value);
        if (tangent) {
            angle = tangent.vector().vectorAngle(g.Point(1,0));
            p = tangent.start;
        } else {
            p = path.pointAt(value);
            angle = 0;
        }

        return { transform: `translate(${p.x},${p.y}) rotate(${angle})` };
    }
};


joint.dia.attributes.title = {
    qualify: function(title, node) {
        return node instanceof SVGElement;
    },
    set: function(title, refBBox, node) {
        var $node = $(node);
        var cacheName = 'joint-title';
        var cache = $node.data(cacheName);
        if (cache === undefined || cache !== title) {
            $node.data(cacheName, title);
            // Generally <title> element should be the first child element of its parent.
            var firstChild = node.firstChild;
            if (firstChild && firstChild.tagName.toUpperCase() === 'TITLE') {
                // Update an existing title
                firstChild.textContent = title;
            } else {
                // Create a new title
                var titleNode = document.createElementNS(node.namespaceURI, 'title');
                titleNode.textContent = title;
                node.insertBefore(titleNode, firstChild);
            }
        }
    }
};

var link1 = new joint.dia.Link({
    showTools: 1,
    vertexOnDblClick: true,
//    markup: '<path class="p1"/><path class="connection-wrap"/><rect class="sign"/><circle class="c1"/><path class="p2"/><circle class="c2"/><text class="sign-text"/><path class="p3"/>',
    markup: '<path class="p1"/><rect class="sign"/><circle class="c1"/><path class="p2"/><circle class="c2"/><text class="sign-text"/><path class="p3"/>',
    source: {
        id: r1.id,
        outVector: { x: 100, y: 0 },
        //anchor: { name: 'left', args: { dx: -10 }},
        //connectionPoint: { name: 'perpendicular', args: { padding: 4 }}
        //connectionPoint: { name: 'anchor' }
        anchor: { name: 'perpendicular' },
        connectionPoint: { name: 'boundary' }
    },
    target: {
        id: r2.id,
        inVector: { x: -100, y: 0 },
        //anchor: { name: 'center', args2: { dx: 10, dy: 10 }},
        //connectionPoint: { name: 'perpendicular', args: { padding: 4 }}
        anchor: { name: 'perpendicular', args: { padding: 0 }},
        connectionPoint: { name: 'anchor' }
    },
    z: 10,
    //connector: { name: 'vectorDriven' },
    //router: { name: 'orthogonal' },
    router: { name: 'trim' },
    //connector: { name: 'trim' },
    vertices: [{ x: 500, y: 100 }],
    attrs: {
        '.': {
            title: 'test\ntest2'
        },
        '.p1': {
            drawPath: true,
            fill: 'none',
            stroke: 'black',
            strokeWidth: 6,
            strokeLinejoin: 'round'
        },
        '.p2': {
            //ref: { type: 'path' },
            drawPath: true,
            fill: 'none',
            stroke: 'lightgray',
            strokeWidth: 4,
            pointerEvents: 'none',
            strokeLinejoin: 'round',
            targetMarker: {
                type: 'path',
                fill: 'lightgray',
                stroke: 'black',
                d: 'M 10 -3 10 -10 -2 0 10 10 10 3'
            }
        },
        '.p3': {
            atPathT: .4,
            d: 'M 0 3 30 33',
            fill: 'none',
            stroke: 'black',
            targetMarker: {
                type: 'path',
                fill: 'black',
                stroke: 'black',
                d: 'M 10 10 -2 0 10 -10'
            }
        },
        '.sign': {
            x: -10,
            y: -20,
            width: 20,
            height: 40,
            stroke: 'black',
            fill: 'lightgray',
            atPathLength: 30,
            strokeWidth: 1,
            //title: 'test tittle',
            //strokeDasharray: '36,4,36,4',
            //strokeDashoffset: 8
            event: 'myclick:rect'
        },
        '.sign-text': {
            atPathLength: 30,
            textAnchor: 'middle',
            y: 5,
            text: 'Link',
            writingMode: 'tb'
        },
        '.c1': {
            r: 10,
            stroke: 'black',
            fill: 'lightgray',
            atPathT: .5,
            strokeWidth: 1,
            //strokeDasharray: '26, 5, 26, 5',
            //strokeDashoffset: -3
            event: 'myclick:circle'
        },
        '.c2': {
            r: 5,
            stroke: 'black',
            fill: 'white',
            atPathT: .5,
            strokeWidth: 1,
            pointerEvents: 'none'
        }

    }
});

paper.on('myclick:circle', function(linkView, evt) {
    evt.stopPropagation();
    var link = linkView.model;
    var t = link.attr('.c1/atPathT');
    if (t > .1) {
        t = .1;
    } else {
        t = .9;
    }

    link.transition('attrs/.c1/atPathT', t, { delay: 100, duration: 2000, timingFunction: joint.util.timing.inout });
    link.transition('attrs/.c2/atPathT', t, { delay: 100, duration: 2000, timingFunction: joint.util.timing.inout });

});


graph.addCell(link1);

// Custom .marker-source and .marker-target.
// -----------------------------------------

title(250, 150, 'Custom markers');

var r3 = r1.clone();
graph.addCell(r3);
r3.translate(0, 80);

var r4 = r3.clone();
graph.addCell(r4);
r4.translate(300, 1);

var link2 = new joint.dia.Link({
    markup: '<path/><path/>',
    source: { id: r3.id },
    target: { id: r4.id },
    attrs: {
        'path:nth-child(2)': {
            drawPath: true,
            fill: 'none',
            strokeWidth: 8,
            stroke: {
                type: 'linearGradient',
                stops: [
                    { offset: '0%', color: 'orange' },
                    { offset: '100%', color: 'lightgray' }
                ]
            },
        },
        'path:first': {
            drawPath: true,
            strokeWidth: 10,
            stroke: 'black',
            fill: 'none'
        }
    }
});

graph.addCell(link2);


// Changing source and target selectors of the link.
// -------------------------------------------------

title(250, 230, 'Changing source and target selectors of a link');

var r5 = r3.clone();
graph.addCell(r5);
r5.translate(0, 80);

var r6 = r5.clone();
graph.addCell(r6);
r6.translate(300);

// Example on setting `magnet === false` on the overall element. In this case,
// only the text can be a target of a link for this specific element.
r6.attr({ '.': { magnet: false } });

var link3 = new joint.dia.Link({
    markup: '<path class="p2"/><path class="p1"/>',
    z: -1,
    source: {
        id: r5.id,
        anchor: { name: 'right', args: { dx: 10 }},
        connectionPoint: { name: 'anchor' },
        outVector: { x: 50, y: 0 },
    },
    target: {
        id: r6.id,
        anchor: { name: 'left', args: { dx: -10 }},
        connectionPoint: { name: 'anchor' },
        inVector: { x: -50, y: 0 },
    },
    connector: { name: 'vectorDriven' },
    vertices: [{ x: 500, y: 250 }],
    showTools: 2,
    attrs: {
        '.p1': {
            drawPath: true,
            fill: 'none',
            stroke: 'gray',
            strokeWidth: 10,
            strokeLinejoin: 'round',
            targetMarker: {
                type: 'path',
                fill: 'gray',
                stroke: 'none',
                d: 'M 0 -5 -10 0 0 5 z'
            },
            sourceMarker: {
                type: 'path',
                fill: 'gray',
                stroke: 'none',
                d: 'M -10 -5 0 0 -10 5 0 5 0 -5 z'
            }
        },
        '.p2': {
            drawPath: true,
            transform: 'translate(5,5)',
            stroke: '#000000',
            strokeOpacity: 0.2,
            strokeWidth: 10,
            fill: 'none',
            targetMarker: {
                type: 'path',
                fill: '#000000',
                'fill-opacity': .2,
                stroke: 'none',
                d: 'M 0 -5 -10 0 0 5 z'
            },
            sourceMarker: {
                type: 'path',
                fill: '#000000',
                'fill-opacity': .2,
                stroke: 'none',
                d: 'M -10 -5 0 0 -10 5 0 5 0 -5 z'
            }
        }
    }
});

graph.addCell(link3);


// Vertices.
// ---------

title(250, 310, 'Vertices');

var r7 = r5.clone();
graph.addCell(r7);
r7.translate(0, 80);

var r8 = r7.clone();
graph.addCell(r8);
r8.translate(300);

var link4 = new joint.dia.Link({

    source: { id: r7.id },
    target: { id: r8.id },
    vertices: [{ x: 370, y: 390 }, { x: 670, y: 390 }],
    attrs: {
        '.marker-source': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        },
        '.marker-target': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        }
    }
});

graph.addCell(link4);


// Custom vertex/connection markups. (ADVANCED)
// --------------------------------------------

title(250, 430, 'Customized vertex markers,\nvertex tools and marker elements');

var r9 = r7.clone();
graph.addCell(r9);
r9.translate(0, 120);

var r10 = r9.clone();
graph.addCell(r10);
r10.translate(300);

var link5 = new joint.dia.Link({

    source: { id: r9.id },
    target: { id: r10.id },
    vertices: [{ x: 370, y: 520 }, { x: 520, y: 570 }, { x: 670, y: 520 }],
    attrs: {
        '.connection': {
            'stroke-width': 4,
            'stroke-dasharray': [5, 5, 5],
            stroke: 'gray'
        },
        '.marker-source': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        },
        '.marker-target': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        }
    },
    markup: [
        '<path class="connection"/>',
        '<image class="marker-source" xlink:href="http://cdn3.iconfinder.com/data/icons/49handdrawing/24x24/left.png" width="25" height="25"/>',
        '<image class="marker-target" xlink:href="http://cdn3.iconfinder.com/data/icons/49handdrawing/24x24/left.png" width="25" height="25"/>',
        '<path class="connection-wrap"/>',
        '<g class="marker-vertices"/>'
    ].join(''),

    vertexMarkup: [
        '<g class="marker-vertex-group" transform="translate(<%= x %>, <%= y %>)">',
        '<image class="marker-vertex" idx="<%= idx %>" xlink:href="http://jointjs.com/images/logo.png" width="25" height="25" transform="translate(-12.5, -12.5)"/>',
        '<rect class="marker-vertex-remove-area" idx="<%= idx %>" fill="red" width="19.5" height="19" transform="translate(11, -26)" rx="3" ry="3" />',
        '<path class="marker-vertex-remove" idx="<%= idx %>" transform="scale(.8) translate(9.5, -37)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z">',
        '<title>Remove vertex.</title>',
        '</path>',
        '</g>'
    ].join('')
});

graph.addCell(link5);


title(250, 650, 'Labels');

var r11 = r10.clone();
graph.addCell(r11);
r11.translate(0, 230);

var r12 = r11.clone();
graph.addCell(r12);
r12.translate(-300);

var link6 = new joint.dia.Link({

    source: { id: r12.id },
    target: { id: r11.id },
    labels: [
        {
            position: 10,
            attrs: {
                text: {
                    text: '1..n'
                }
            }
        },
        {
            position: { distance: .5, offset: { x: 20, y: 20 }},
            attrs: {
                text: {
                    text: 'Foo',
                    fill: 'white',
                    fontFamily: 'sans-serif'
                },
                rect: {
                    stroke: 'red',
                    strokeWidth: 2,
                    fill: '#F39C12',
                    rx: 5,
                    ry: 5,
                    refWidth: '140%',
                    refHeight: '140%',
                    refX: '-20%',
                    refY: '-20%'
                }
            }
        },
        {
            position: 0.5,
            markup: '<circle/><path/>',
            attrs: {
                circle: {
                    r: 10,
                    fill: 'lightgray',
                    stroke: 'black',
                    strokeWidth: 2
                },
                path: {
                    d: 'M 0 -10 0 -30 20 -30',
                    stroke: 'black',
                    strokeWidth: 2,
                    fill: 'none'
                }
            }
        },
        {
            position: -10,
            attrs: {
                text: {
                    text: '*'
                }
            }
        }
    ],
    attrs: {
        '.marker-source': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        },
        '.marker-target': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        }
    }
});
graph.addCell(link6);


title(250, 750, 'Custom tools');

var r13 = r12.clone();
graph.addCell(r13);
r13.translate(0, 100);

var r14 = r13.clone();
graph.addCell(r14);
r14.translate(300);

var link7 = new joint.dia.Link({

    source: { id: r13.id },
    target: { id: r14.id },
    attrs: {
        '.marker-source': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        },
        '.marker-target': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        }
    },
    toolMarkup: [
        '<g class="link-tool">',
        '<g class="tool-remove" event="remove">',
        '<circle r="11" />',
        '<path transform="scale(.8) translate(-16, -16)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z"/>',
        '<title>Remove link.</title>',
        '</g>',
        '<g event="link:options">',
        '<circle r="11" transform="translate(25)"/>',
        '<path fill="white" transform="scale(.55) translate(29, -16)" d="M31.229,17.736c0.064-0.571,0.104-1.148,0.104-1.736s-0.04-1.166-0.104-1.737l-4.377-1.557c-0.218-0.716-0.504-1.401-0.851-2.05l1.993-4.192c-0.725-0.91-1.549-1.734-2.458-2.459l-4.193,1.994c-0.647-0.347-1.334-0.632-2.049-0.849l-1.558-4.378C17.165,0.708,16.588,0.667,16,0.667s-1.166,0.041-1.737,0.105L12.707,5.15c-0.716,0.217-1.401,0.502-2.05,0.849L6.464,4.005C5.554,4.73,4.73,5.554,4.005,6.464l1.994,4.192c-0.347,0.648-0.632,1.334-0.849,2.05l-4.378,1.557C0.708,14.834,0.667,15.412,0.667,16s0.041,1.165,0.105,1.736l4.378,1.558c0.217,0.715,0.502,1.401,0.849,2.049l-1.994,4.193c0.725,0.909,1.549,1.733,2.459,2.458l4.192-1.993c0.648,0.347,1.334,0.633,2.05,0.851l1.557,4.377c0.571,0.064,1.148,0.104,1.737,0.104c0.588,0,1.165-0.04,1.736-0.104l1.558-4.377c0.715-0.218,1.399-0.504,2.049-0.851l4.193,1.993c0.909-0.725,1.733-1.549,2.458-2.458l-1.993-4.193c0.347-0.647,0.633-1.334,0.851-2.049L31.229,17.736zM16,20.871c-2.69,0-4.872-2.182-4.872-4.871c0-2.69,2.182-4.872,4.872-4.872c2.689,0,4.871,2.182,4.871,4.872C20.871,18.689,18.689,20.871,16,20.871z"/>',
        '<title>Link options.</title>',
        '</g>',
        '</g>'
    ].join('')

});
graph.addCell(link7);

paper.on('link:options', function(linkView, evt, x, y) {

    alert('Opening options for link ' + linkView.model.id);
});


/*
 // Uncomment just for fun.
 var c = V('circle', { r: 8, fill: 'red' });
 c.animateAlongPath({ dur: '4s', repeatCount: 'indefinite' }, paper.findViewByModel(link5).$('.connection')[0]);
 V(paper.svg).append(c);
 */


// Manhattan routing.
// ------------------

title(250, 850, 'Manhattan and Metro routing');

var r15 = r13.clone();
graph.addCell(r15);
r15.translate(0, 100);

var r16 = r15.clone();
graph.addCell(r16);
r16.translate(200, 0);

var link8 = new joint.dia.Link({
    source: { id: r15.id },
    target: { id: r16.id },
    vertices: [{ x: 700, y: 900 }],
    router: { name: 'metro' }
});

var link9 = new joint.dia.Link({
    source: { id: r15.id },
    target: { id: r16.id },
    router: { name: 'manhattan' },
    connector: { name: 'rounded' }
});

graph.addCell([link8, link9]);


// Manhattan routing.
// ------------------

title(250, 1000, 'Markers');

var r17 = r15.clone();
graph.addCell(r17);
r17.translate(0, 200);

var r18 = r17.clone();
graph.addCell(r18);
r18.translate(200, 0);

var link10 = new joint.dia.Link({
    source: { id: r17.id },
    target: { id: r18.id },
    vertices: [{ x: 400, y: 1000 }, { x: 600, y: 1000 }],
    attrs: {
        '.connection': {
            'marker-mid': 'url(#circle-marker)'
        }
    }
});
var link11 = link10.clone();
link11.set('vertices', [{ x: 400, y: 1100 }, { x: 600, y: 1100 }]);
link11.attr('.connection/marker-mid', 'url(#diamond-marker)');
graph.addCell(link11);

var circleMarker = V('<marker id="circle-marker" markerUnits="userSpaceOnUse" viewBox = "0 0 12 12" refX = "6" refY = "6" markerWidth = "15" markerHeight = "15" stroke = "none" stroke-width = "0" fill = "red" orient = "auto"> <circle r = "5" cx="6" cy="6" fill="blue"/> </marker>');
V(paper.viewport).defs().append(circleMarker);
var diamondMarker = V('<marker id="diamond-marker" viewBox = "0 0 5 20" refX = "0" refY = "6" markerWidth = "30" markerHeight = "30" stroke = "none" stroke-width = "0" fill = "red" > <rect x="0" y="0" width = "10" height="10" transform="rotate(45)"  /> </marker>');
V(paper.viewport).defs().append(diamondMarker);

graph.addCell([link10]);

// OneSide routing

title(250, 1200, 'OneSide routing');

var r19 = r17.clone();
graph.addCell(r19);
r19.translate(0, 150);

var r20 = r19.clone();
graph.addCell(r20);
r20.translate(200, 0);

var link12 = new joint.dia.Link({
    source: { id: r19.id },
    target: { id: r20.id },
    router: { name: 'oneSide', args: { side: 'bottom' } }
});
graph.addCell(link12);


var graph = new joint.dia.Graph;
var paper = new joint.dia.Paper({
    el: document.getElementById('paper'),
    width: 800,
    height: 1400,
    gridSize: 1,
    perpendicularLinks: false,
    model: graph,
    tools: function (cellView) {
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
    interactive: function () {
        return { vertexAdd: false }
    },
    // anchor: joint.anchors.center,
    // connectionPoint: joint.connectionPoints.boundary,
    linkView: joint.shapes.ng.LinkView,
});

var r1 = new joint.shapes.ng.Rect({
    position: { x: 335, y: 50 },
    size: { width: 70, height: 30 },
    attrs: {
        label: { text: 'ngRect' }
    }
});

graph.addCell(r1);

var r2 = r1.clone();

graph.addCell(r2);
r2.translate(300);

paper.on('link:mouseenter', function (linkView) {
    //console.log('link-enter');
    if (linkView.model.get('showTools') === 1) {
        if (!linkView._tools) linkView.addTools();
    }
});

paper.on('link:mouseleave', function (linkView, evt) {
    //console.log('link-leave');
    if (linkView.model.get('showTools') === 1) {
        linkView.removeTools();
    }
});
// var lv;
// paper.on('link:pointerdown', function (linkView) {
//     if (linkView.model.get('showTools') === 2) {
//         if (lv) lv.removeTools();
//         linkView.addTools([
//             joint.dia.tools.Vectors
//         ]);
//         lv = linkView;
//     }
// });
// paper.on('blank:pointerdown', function (linkView) {
//     if (lv) lv.removeTools();
// });

var link1 = new joint.dia.Link({
    showTools: 1,
    vertexOnDblClick: true,
    //    markup: '<path class="p1"/><path class="connection-wrap"/><rect class="sign"/><circle class="c1"/><path class="p2"/><circle class="c2"/><text class="sign-text"/><path class="p3"/>',
    //markup: '<path class="p1"/><rect class="sign"/><circle class="c1"/><path class="p2"/><circle class="c2"/><text class="sign-text"/><path class="p3"/>',
    markup: [{
        tagName: 'path',
        selector: 'p1'
    }, {
        tagName: 'rect',
        selector: 'sign'
    }, {
        tagName: 'circle',
        className: 'circulin',
        selector: 'c1',
    }, {
        tagName: 'path',
        selector: 'p2'
    }, {
        tagName: 'circle',
        selector: 'c2'
    }, {
        tagName: 'text',
        selector: 'sign_text'
    }, {
        tagName: 'path',
        selector: 'p3'
    }],
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
        anchor: { name: 'perpendicular', args: { padding: 0 } },
        connectionPoint: { name: 'anchor' }
    },
    z: 10,
    //connector: { name: 'vectorDriven' },
    //router: { name: 'orthogonal' },
    router: { name: 'trim' },
    //connector: { name: 'trim' },
    vertices: [{ x: 500, y: 100 }],
    attrs: {
        root: {
            title: 'test\ntest2'
        },
        p1: {
            connection: true,
            fill: 'none',
            stroke: 'black',
            strokeWidth: 6,
            strokeLinejoin: 'round'
        },
        p2: {
            //ref: { type: 'path' },
            connection: true,
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
        p3: {
            atPathRatio: .4,
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
        sign: {
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
        sign_text: {
            atPathLength: 30,
            textAnchor: 'middle',
            y: 5,
            text: 'Link',
            writingMode: 'tb'
        },
        c1: {
            r: 10,
            stroke: 'black',
            fill: 'lightgray',
            atPathRatio: .5,
            strokeWidth: 1,
            //strokeDasharray: '26, 5, 26, 5',
            //strokeDashoffset: -3,
            magnet: 'passive',
            event: 'myclick:circle'
        },
        c2: {
            r: 5,
            stroke: 'black',
            fill: 'white',
            atPathRatio: .5,
            strokeWidth: 1,
            pointerEvents: 'none'
        }
    }
});

paper.on('myclick:circle', function (linkView, evt) {
    evt.stopPropagation();
    var link = linkView.model;
    var t = link.attr('c1/atPathRatio');
    if (t > .1) {
        t = .1;
    } else {
        t = .9;
    }

    link.transition('attrs/c1/atPathRatio', t, { delay: 100, duration: 2000, timingFunction: joint.util.timing.inout });
    link.transition('attrs/c2/atPathRatio', t, { delay: 100, duration: 2000, timingFunction: joint.util.timing.inout });

});


graph.addCell(link1);

// Custom .marker-source and .marker-target.
// -----------------------------------------

var r3 = r1.clone();
graph.addCell(r3);
r3.translate(0, 80);

var r4 = r3.clone();
graph.addCell(r4);
r4.translate(300, 1);

// var link2 = new joint.dia.Link({
//     //markup: '<path/><path/>',
//     markup: [{
//         tagName: 'path',
//         selector: 'stroke',
//         attributes: {
//             stroke: 'black',
//             fill: 'none'
//         }
//     }, {
//         tagName: 'path',
//         selector: 'fill'
//     }, {
//         tagName: 'g',
//         selector: 'group'
//     }],
//     source: { id: r3.id },
//     target: { id: r4.id },
//     attrs: {
//         fill: {
//             connection: true,
//             strokeWidth: 8,
//             fill: 'none',
//             stroke: {
//                 type: 'linearGradient',
//                 stops: [
//                     { offset: '0%', color: 'orange' },
//                     { offset: '100%', color: 'lightgray' }
//                 ]
//             },
//         },
//         stroke: {
//             connection: true,
//             strokeWidth: 10
//         }
//     }
// });
var link2 = new joint.shapes.ng.Link({
    showTools: 1,
    source: {
         id: r3.id,
         anchor: { name: 'parallel' }
     },
     target: {
         id: r4.id,
         anchor: { name: 'parallel' }
     },
     attrs: {
         line: {
            stroke: 'red'
         }
     }
});

graph.addCell(link2);

var link4 = link2.clone();
graph.addCell(link4);

// Changing source and target selectors of the link.
// -------------------------------------------------


var Polygon = joint.dia.Element.define('Polygon', {
    //markup: '<g class="rotatable"><polygon/></g>',
    markup: [{
        tagName: 'g',
        className: 'rotatable',
        children: [{
            tagName: 'polygon',
            selector: 'body'
        }]
    }],
    attrs: {
        body: {
            tabs: [0, 0, 0, 0],
            stroke: '#ddd',
            fill: 'orange'
        }
    }
}, null, {
        attributes: {
            tabs: { /* [topTab, rightTab, bottomTab, leftTab] */
                qualify: _.isArray,
                set: function (tabs, refBBox) {
                    var tabSize = 10;
                    var points = [];
                    var refCenter = refBBox.center();
                    var refPoints = [
                        refBBox.origin(),
                        refBBox.topRight(),
                        refBBox.corner(),
                        refBBox.bottomLeft()
                    ];
                    for (var i = 0; i < 4; i++) {
                        var a = refPoints[i];
                        var b = refPoints[i + 1] || refPoints[0];
                        points.push(a);
                        if (tabs[i]) {
                            var mid = g.Line(a, b).midpoint();
                            points.push(
                                mid.clone().move(b, tabSize),
                                mid.clone().move(refCenter, tabs[i] * tabSize),
                                mid.clone().move(a, tabSize)
                            );
                        }
                    }
                    return {
                        points: points.join(' ').replace(/@/g, ' ')
                    };
                }
            }
        }
    });

var r5 = new Polygon({
    size: { width: 100, height: 50 },
    attrs: {
        polygon: {
            tabs: [0, 1, 0, 0]
        }
    }
});
r5.position(300, 200).addTo(graph);
var r6 = r5.clone().translate(300).attr({
    polygon: { tabs: [0, 0, 0, -1] }
}).addTo(graph)

var link3 = new joint.shapes.ng.ShadowLink({
    z: -1,
    source: {
        id: r5.id,
        anchor: { name: 'right', args: { dx: 4 } },
        connectionPoint: { name: 'anchor' },
        outVector: { x: 100, y: 0 },
    },
    target: {
        id: r6.id,
        anchor: { name: 'left', args: { dx: -4 } },
        connectionPoint: { name: 'anchor' },
        inVector: { x: -100, y: 0 },
    },
    connector: { name: 'vectorDriven' },
    vertices: [{ x: 500, y: 250 }],
    showTools: 2
});

graph.addCell(link3);

paper.options.defaultLink = link3.clone().set('vertices', []);

var ngRect = new joint.shapes.ng.Rect({
    size: { width: 300, height: 300 },
    position: { x: 50, y: 50 },
    attrs: {
        body: {
            strokeWidth: 10
        }
    }
});

ngRect.addTo(graph);


// paper.options.viewport = function (view) {
//     var model = view.model;
//     if (model === ngRect) return true;
//     if (model.isElement()) return ngRect.getBBox().intersect(view.model.getBBox());
//     var path = view.getPath() || view.calculatePath();
//     return ngRect.getBBox().intersect(path.bbox());
//     //return !this.awaitingCellUpdate(model.attributes.source.id) && !this.awaitingCellUpdate(model.attributes.target.id);
// };
paper.unfreeze();
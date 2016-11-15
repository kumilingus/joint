(function() {

    var graph = new joint.dia.Graph;
    var paper = new joint.dia.Paper({
        el: document.getElementById('paper-parent-expand'),
        width: 650,
        height: 250,
        gridSize: 1,
        model: graph
    });

    var r1 = new joint.shapes.basic.Rect({
        position: { x: 20, y: 20 },
        size: { width: 150, height: 150 },
        attrs: { rect: { fill: '#E74C3C' }, text: { text: 'Parent' } }
    });
    var r2 = new joint.shapes.basic.Rect({
        position: { x: 40, y: 25 },
        size: { width: 50, height: 40 },
        attrs: { rect: { fill: '#F1C40F' }, text: { text: 'Child' } }
    });
    var r3 = new joint.shapes.basic.Rect({
        position: { x: 110, y: 60 },
        size: { width: 50, height: 40 },
        attrs: { rect: { fill: '#9B59B6' }, text: { text: 'Child' } }
    });

    r1.embed(r2);
    r1.embed(r3);
    graph.addCells([r1, r2, r3]);

    graph.on('change:size', function(cell, newSize, opt) {

        if (opt.skipParentHandler) return;

        if (cell.getEmbeddedCells().length > 0) {
            // If we're manipulating a parent element, let's store
            // it's original size to a special property so that
            // we can shrink the parent element back while manipulating
            // its children.
            cell.set('originalSize', newSize);
        }
    });

    graph.on('change:position', function(cell, newPosition, opt) {

        if (opt.skipParentHandler) return;

        if (cell.getEmbeddedCells().length > 0) {
            // If we're manipulating a parent element, let's store
            // it's original position to a special property so that
            // we can shrink the parent element back while manipulating
            // its children.
            cell.set('originalPosition', newPosition);
        }

        if (!cell.isEmbedded()) return;

        var parent = cell.getAncestors()[0];
        if (!parent.has('originalPosition')) {
            parent.set('originalPosition', parent.get('position'));
        }
        if (!parent.has('originalSize')) {
            parent.set('originalSize', parent.get('size'));
        }

        var originalPosition = parent.get('originalPosition');
        var originalSize = parent.get('originalSize');
        var originalBBox = g.Rect({
            x: originalPosition.x,
            y: originalPosition.y,
            width: originalSize.width,
            height: originalSize.height
        });

        var bbox = graph.getCellsBBox(parent.getEmbeddedCells()).union(originalBBox);

        // Note that we also pass a flag so that we know we shouldn't adjust the
        // `originalPosition` and `originalSize` in our handlers as a reaction
        // on the following `set()` call.
        parent.set({
            position: {
                x: bbox.x,
                y: bbox.y
            },
            size: {
                width: bbox.width,
                height: bbox.height
            }
        }, { skipParentHandler: true });
    });
}());

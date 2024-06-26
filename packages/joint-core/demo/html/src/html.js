(function(joint, V) {

    // Notes:
    // - It's not possible to use SVG/Raster export plugins with HTML shapes
    // - Links stacking order is limited to be either above or below HTML elements
    // - Ports are partially hidden below the HTML elements by default
    // - Do not use CSS background on the root HTML element when using ports

    var graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    var paper = new joint.dia.Paper({
        el: document.getElementById('paper'),
        width: 850,
        height: 600,
        model: graph,
        cellViewNamespace: joint.shapes,
        async: true,
        frozen: true,
        sorting: joint.dia.Paper.sorting.NONE
    });

    // Container for all HTML views inside paper
    var htmlContainer = document.createElement('div');
    htmlContainer.style.pointerEvents = 'none';
    htmlContainer.style.position = 'absolute';
    htmlContainer.style.inset = '0';
    paper.el.appendChild(htmlContainer);
    paper.htmlContainer = htmlContainer;

    paper.on('transform', function() {
        // Update the transformation of all JointJS HTML Elements
        var htmlContainer = this.htmlContainer;
        htmlContainer.style.transformOrigin = '0 0';
        htmlContainer.style.transform = V.matrixToTransformString(this.matrix());
    });

    paper.on('blank:pointerdown cell:pointerdown', function() {
        document.activeElement.blur();
    });


    var el1 = new joint.shapes.html.Element({
        position: { x: 16, y: 150 },
        fields: {
            name: 'Create Story',
            resource: 'bob',
            state: 'done'
        }
    });

    var el2 = new joint.shapes.html.Element({
        position: { x: 298, y: 150 },
        fields: {
            name: 'Promote',
            resource: 'mary'
        }
    });

    var el3 = new joint.shapes.html.Element({
        position: { x: 580, y: 150 },
        fields: {
            name: 'Measure',
            resource: 'john',
            state: 'at-risk'
        }
    });

    var l1 = new joint.shapes.standard.Link({
        source: { id: el1.id },
        target: { id: el2.id },
        attrs: {
            line: {
                stroke: '#464554'
            }
        }
    });

    var l2 = new joint.shapes.standard.Link({
        source: { id: el2.id },
        target: { id: el3.id },
        attrs: {
            line: {
                stroke: '#464554'
            }
        }
    });

    graph.resetCells([el1, el2, el3, l1, l2]);

    paper.unfreeze();

    // Toolbar
    var zoomLevel = 1;

    var center = paper.getArea().center();

    document.getElementById('zoom-in').addEventListener('click', function() {
        zoomLevel = Math.min(3, zoomLevel + 0.2);
        paper.scaleUniformAtPoint(zoomLevel, center);
    });

    document.getElementById('zoom-out').addEventListener('click', function() {
        zoomLevel = Math.max(0.2, zoomLevel - 0.2);
        paper.scaleUniformAtPoint(zoomLevel, center);
    });

    document.getElementById('reset').addEventListener('click', function() {
        graph.getElements().forEach(function(element) {
            element.prop(['fields', 'name'], '');
            element.prop(['fields', 'resource'], '');
            element.prop(['fields', 'state'], '');
        });
    });

})(joint, V);

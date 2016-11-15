(function() {

    var graph = new joint.dia.Graph;
    var paper = new joint.dia.Paper({
        el: document.getElementById('paper-parent-restriction'),
        width: 650,
        height: 250,
        gridSize: 1,
        model: graph,
        restrictTranslate: function(elementView) {
            var element = elementView.model;
            if (element.isEmbedded()) {
                return element.getAncestors()[0].getBBox();
            }
            return false;
        }
    });

    var r1 = new joint.shapes.basic.Rect({
        position: { x: 20, y: 20 },
        size: { width: 200, height: 200 },
        attrs: { rect: { fill: '#E74C3C' }, text: { text: 'Parent' } }
    });
    var r2 = new joint.shapes.basic.Rect({
        position: { x: 70, y: 30 },
        size: { width: 100, height: 80 },
        attrs: { rect: { fill: '#F1C40F' }, text: { text: 'Child' } }
    });

    r1.embed(r2);
    graph.addCells([r1, r2]);

}());

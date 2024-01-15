document.addEventListener('DOMContentLoaded', function() {

    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

    const paper = new joint.dia.Paper({
        el: document.getElementById('paper'),
        width: 400,
        height: 300,
        model: graph,
        cellViewNamespace: joint.shapes,
        interactive: false,
        background: {
            color: '#F3F7F6'
        }
    });

    const RadiusTool = joint.elementTools.Control.extend({
        getPosition: function(view) {
            const model = view.model;
            const radius = model.attr(['body', 'ry']) || 0;
            return { x: 0, y: radius };
        },
        setPosition: function(view, coordinates) {
            const model = view.model;
            const size = model.size();
            const ry = Math.min(Math.max(coordinates.y, 0), size.height / 2);
            model.attr(['body'], { rx: ry, ry: ry });
        },
        resetPosition: function(view) {
            view.model.attr(['body'], { rx: 0, ry: 0 });
        }
    });

    const rectangle = new joint.shapes.standard.Rectangle();
    rectangle.resize(100, 100);
    rectangle.position(100, 100);
    rectangle.attr('body/fill', '#30d0c6');
    rectangle.attr('body/fillOpacity', 0.5);
    rectangle.attr('label/text', 'Rectangle');
    rectangle.addTo(graph);
    rectangle.findView(paper).addTools(new joint.dia.ToolsView({
        tools: [new RadiusTool({
            handleAttributes: { 'fill': 'orange' }
        })]
    }));

});

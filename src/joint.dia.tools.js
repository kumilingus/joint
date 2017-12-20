(function (joint, util, V, g) {

    var Tool = joint.mvc.View.extend({
        tagName: 'g',
        className: 'tool',
        svgElement: true,
        init: function () {
            this.relatedView = this.options.relatedView;
            this.paper = this.relatedView.paper;
        }
    });

    // Vertex Handles
    var VertexHandle = joint.mvc.View.extend({
        tagName: 'circle',
        svgElement: true,
        className: 'marker-vertex',
        events: {
            mousedown: 'onPointerDown',
            touchstart: 'onPointerDown',
            dblclick: 'onDoubleClick'
        },
        documentEvents: {
            mousemove: 'onPointerMove',
            touchmove: 'onPointerMove',
            mouseup: 'onPointerUp',
            touchend: 'onPointerUp'
        },
        attributes: {
            'r': 7,
            'fill': '#FFFFFF',
            'stroke': '#1ABC9C',
            'stroke-width': 2,
            'cursor': 'move'
        },
        position: function (x, y) {
            this.vel.attr({ cx: x, cy: y });
        },
        onPointerDown: function (evt) {
            evt.stopPropagation();
            this.options.paper.undelegateEvents();
            this.delegateDocumentEvents();
        },
        onPointerMove: function (evt) {
            this.trigger('change', this, evt);
        },
        onDoubleClick: function () {
            this.trigger('remove', this);
        },
        onPointerUp: function () {
            this.undelegateDocumentEvents();
            this.options.paper.delegateEvents();
        },
        onRemove: function () {
            this.undelegateDocumentEvents();
        }
    });

    var VertexHandles = Tool.extend({
        options: {
           HandleClass: VertexHandle 
        },
        handels: [],
        onRender: function () {
            this.resetHandles();
            var relatedView = this.relatedView;
            var vertices = relatedView.model.get('vertices');
            if (!Array.isArray(vertices)) return this;
            for (var i = 0, n = vertices.length; i < n; i++) {
                var vertex = vertices[i];
                var handle = new (this.options.HandleClass)({ index: i, paper: this.paper });
                handle.render();
                handle.position(vertex.x, vertex.y);
                handle.vel.appendTo(this.el);
                this.handles.push(handle);
                this.startHandleListening(handle);
            }
            return this;
        },
        update: function () {
            var relatedView = this.relatedView;
            var vertices = relatedView.model.get('vertices');
            if (!Array.isArray(vertices)) return this;
            var handles = this.handles;
            if (vertices.length !== handles.length) return this.render();
            for (var i = 0, n = vertices.length; i < n; i++) {
                var vertex = vertices[i];
                this.handles[i].position(vertex.x, vertex.y);
            }
            return this;
        },
        startHandleListening: function (handle) {
            var relatedView = this.relatedView;
            if (relatedView.can('vertexMove')) {
                this.listenTo(handle, 'change', this.onHandleChange);
            }
            if (relatedView.can('vertexRemove')) {
                this.listenTo(handle, 'remove', this.onHandleRemove);
            }
        },
        resetHandles: function () {
            var handles = this.handles;
            this.handles = [];
            this.stopListening();
            if (!Array.isArray(handles)) return;
            for (var i = 0, n = handles.length; i < n; i++) {
                handles[i].remove();
            }
        },
        onHandleChange: function (handle, evt) {
            var relatedView = this.relatedView;
            var paper = relatedView.paper;
            var index = handle.options.index;
            var vertex = paper.snapToGrid(evt.clientX, evt.clientY).toJSON();
            relatedView.model.vertex(index, vertex, { ui: true });
        },
        onHandleRemove: function (handle) {
            var index = handle.options.index;
            this.relatedView.model.removeVertex(index);
        },
        onRemove: function () {
            this.resetHandles();
        }
    });

    // End Markers
    var Arrowhead = Tool.extend({
        tagName: 'path',
        xAxisVector: g.Point(1,0),
        events: {
            mousedown: 'onPointerDown',
            touchstart: 'onPointerDown'
        },
        documentEvents: {
            mousemove: 'onPointerMove',
            touchmove: 'onPointerMove',
            mouseup: 'onPointerUp',
            touchend: 'onPointerUp'
        },
        onRender: function() {
            this.update()
        },
        update: function() {
            var path = this.relatedView.getPath();
            var tangent = path.tangentAt(this.position);
            var position = tangent.start;
            var angle = tangent.vector().vectorAngle(this.xAxisVector);
            var matrix = V.createSVGMatrix().translate(position.x, position.y).rotate(angle);
            this.vel.transform(matrix, { absolute: true });
        },
        onPointerDown: function(evt) {
            evt.stopPropagation();
            var relatedView = this.relatedView;
            if (relatedView.can('arrowheadMove')) {
                relatedView.startArrowheadMove(this.arrowheadType);
                this.delegateDocumentEvents();
                relatedView.paper.undelegateEvents();
            }
        },
        onPointerMove: function(evt) {
            var coords = paper.snapToGrid(evt.clientX, evt.clientY);            
            this.relatedView.pointermove(evt, coords.x, coords.y);
        },
        onPointerUp: function(evt) {
            this.undelegateDocumentEvents();
            var relatedView = this.relatedView;
            var paper = relatedView.paper;
            var coords = paper.snapToGrid(evt.clientX, evt.clientY);                        
            relatedView.pointerup(evt, coords.x, coords.y);   
            paper.delegateEvents();
        }
    });
    
    var TargetArrowhead = Arrowhead.extend({
        position: 1,
        arrowheadType: 'target',
        attributes: {
            'd': 'M -20 -10 0 0 -20 10 Z',
            'fill': '#FFFFFF',
            'stroke': '#1ABC9C',
            'stroke-width': 2,
            'cursor': 'move',
            'class': 'source-arrowhead'
        }
    });

    var SourceArrowhead = Arrowhead.extend({
        position: 0,
        arrowheadType: 'source',
        attributes: {
            'd': 'M 20 -10 0 0 20 10 Z',
            'fill': '#FFFFFF',
            'stroke': '#1ABC9C',
            'stroke-width': 2,
            'cursor': 'move',
            'class': 'target-arrowhead'
        }
    });

    var Remove = Tool.extend({
        tagName: 'circle',
        events: {
            mousedown: 'onPointerDown',
            touchstart: 'onPointerDown'
        },
        attributes: {
            'r': 7,
            'fill': '#FFFFFF',
            'stroke': '#f34612',
            'stroke-width': 2,
            'cursor': 'move'
        },
        options: {
            atLength: 60
        },
        onRender: function() {
            this.update()
        },
        update: function() {
            var path = this.relatedView.getPath();
            var position = path.pointAtLength(this.options.atLength);
            this.vel.attr({ cx: position.x, cy: position.y });
        },
        onPointerDown: function(evt) {
            evt.stopPropagation();
            var relatedView = this.relatedView;
            if (relatedView.can('useLinkTools')) {
                relatedView.model.remove({ ui: true });
            }
        }
    });

    // Export    
    joint.dia.tools = {
        Vertices: VertexHandles,
        SourceArrowhead: SourceArrowhead,
        TargetArrowhead: TargetArrowhead,
        Remove: Remove
    };

    joint.dia.Tool = Tool;

})(joint, joint.util, V, g);
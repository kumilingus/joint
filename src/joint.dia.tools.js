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
            console.log('pd: vertex');
            evt.stopPropagation();
            this.options.paper.undelegateEvents();
            this.delegateDocumentEvents();
        },
        onPointerMove: function (evt) {
            this.trigger('changing', this, evt);
        },
        onDoubleClick: function (evt) {
            this.trigger('remove', this, evt);
        },
        onPointerUp: function (evt) {
            this.trigger('change', this, evt);
            this.undelegateDocumentEvents();
            this.options.paper.delegateEvents();
        }
    });

    var Vertices = Tool.extend({
        options: {
           HandleClass: VertexHandle,
           snapRadius: 10,
           redundancyRemoval: true
        },
        pathAttributes: {
            'fill': 'none',
            'stroke': 'transparent',
            'stroke-width': 10,
            'cursor': 'cell'
        },
        handels: [],
        events: {
            'mousedown .vertices-path': 'onPathPointerDown'
        },
        onRender: function () {
            this.resetHandles();
            this.vel.empty();
            this.renderPath();
            this.updatePath();
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
            this.render();
        },
        updatePath: function() {
            var vPath = this.vPath;
            if (vPath) vPath.attr('d', this.relatedView.getPath().serialize());
        },
        renderPath: function() {
            this.vPath = V('path', this.pathAttributes).addClass('vertices-path').appendTo(this.vel);
        },
        startHandleListening: function (handle) {
            var relatedView = this.relatedView;
            if (relatedView.can('vertexMove')) {
                this.listenTo(handle, 'changing', this.onHandleChanging);
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
        getNeighborPoints: function(index) {
            var linkView = this.relatedView;
            var link = linkView.model;
            return {
                prev: new g.Point(link.vertex(index - 1) || linkView.sourcePoint),
                next: new g.Point(link.vertex(index + 1) || linkView.targetPoint)
            }
        },
        onHandleChanging: function (handle, evt) {
            var relatedView = this.relatedView;
            var paper = relatedView.paper;
            var index = handle.options.index;
            var vertex = paper.snapToGrid(evt.clientX, evt.clientY).toJSON();
            var link = relatedView.model;
            var snapRadius = this.options.snapRadius;
            if (snapRadius > 0) {
                var neighbors = this.getNeighborPoints(index);
                if (Math.abs(vertex.x - neighbors.prev.x) < snapRadius) {
                    vertex.x = neighbors.prev.x;
                } else if (Math.abs(vertex.x - neighbors.next.x) < snapRadius) {
                    vertex.x = neighbors.next.x;
                }

                if (Math.abs(vertex.y - neighbors.prev.y) < snapRadius) {
                    vertex.y = neighbors.prev.y;
                } else if (Math.abs(vertex.y - neighbors.next.y) < snapRadius) {
                    vertex.y = neighbors.next.y;
                }
            }
            relatedView.model.vertex(index, vertex, { ui: true, tool: this.cid });
            handle.position(vertex.x, vertex.y);
        },
        onHandleChange: function(handle, evt) {
            this.updatePath();
            if (!this.options.redundancyRemoval) return;
            var verticesRemoved = this.relatedView.removeRedundantLinearVertices({ ui: true, tool: this.cid });
            if (verticesRemoved) this.render();
        },
        onHandleRemove: function (handle) {
            var index = handle.options.index;
            this.relatedView.model.removeVertex(index, { ui: true });
        },
        onPathPointerDown: function(evt) {
            console.log('pd: path')
            evt.stopPropagation();
            var vertex = paper.snapToGrid(evt.clientX, evt.clientY).toJSON();
            var index = this.relatedView.addVertex(vertex, { ui: true, tool: this.cid });
            this.render();
            var handle = this.handles[index];
            handle.onPointerDown(evt);
        },
        onRemove: function () {
            this.resetHandles();
        }
    });


    var SegmentHandle = joint.mvc.View.extend({
        tagName: 'rect',
        svgElement: true,
        className: 'marker-segment',
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
        attributes: {
            'width': 20,
            'height': 10,
            'x': -10,
            'y': -5,
            'fill': '#FFFFFF',
            'stroke': '#1ABC9C',
            'stroke-width': 2,
            'cursor': 'move'
        },
        position: function (x, y, angle) {
            this.vel
                .translate(x, y, { absolute: true })
                .rotate(angle, 0, 0, { absolute: true })
                .attr('cursor', (angle % 180 === 0) ? 'row-resize' : 'col-resize');
        },
        onPointerDown: function (evt) {
            console.log('pd: segment');
            this.trigger('change:start', this, evt);
            evt.stopPropagation();
            this.options.paper.undelegateEvents();
            this.delegateDocumentEvents();
        },
        onPointerMove: function (evt) {
            this.trigger('changing', this, evt);
        },
        onPointerUp: function (evt) {
            console.log('pu: segment');
            this.undelegateDocumentEvents();
            this.options.paper.delegateEvents();
            this.trigger('change:end', this, evt);
        }
    });

    var Segments = Tool.extend({
        options: {
            HandleClass: SegmentHandle,
        },
        handels: [],
        onRender: function () {
            this.resetHandles();
            var relatedView = this.relatedView;
            var vertices = relatedView.model.get('vertices');
            if (!Array.isArray(vertices)) return this;
            for (var i = 0, n = vertices.length; i < n - 1; i++) {
                var vertex = vertices[i];
                var nextVertex = vertices[i + 1];
                var vertical = (vertex.x === nextVertex.x);
                var horizontal = (vertex.y === nextVertex.y);
                if (!vertical && !horizontal) continue;
                var handle = new (this.options.HandleClass)({ index: i, paper: this.paper });
                handle.render();
                this.updateHandle(handle, vertex, nextVertex);
                handle.vel.appendTo(this.el);
                this.handles[i] = handle;
                this.startHandleListening(handle);
            }
            return this;
        },
        update: function () {
            this.render();
            return this;
        },
         startHandleListening: function (handle) {
            this.listenTo(handle, 'change:start', this.onHandleChangeStart);
            this.listenTo(handle, 'changing', this.onHandleChanging);
            this.listenTo(handle, 'change:end', this.onHandleChangeEnd);
        },
         resetHandles: function () {
             var handles = this.handles;
             this.handles = [];
             this.stopListening();
             if (!Array.isArray(handles)) return;
             for (var i = 0, n = handles.length; i < n; i++) {
                 if (handles[i]) handles[i].remove();
             }
         },
         onHandleChanging: function(handle, evt) {
            var relatedView = this.relatedView;
            var paper = relatedView.paper;
            var index = handle.options.index;
            var position = paper.snapToGrid(evt.clientX, evt.clientY).toJSON();
            var link = relatedView.model;
            var vertices = util.cloneDeep(link.get('vertices'));
            var vertex = vertices[index];
            var nextVertex = vertices[index + 1];
            if (vertex.x === nextVertex.x) {
                vertex.x = nextVertex.x = position.x;
            } else {
                vertex.y = nextVertex.y = position.y;
            }
            link.set('vertices', vertices, { ui: true, tool: this.cid });
            this.updateHandle(handle, vertex, nextVertex)
        },
        onHandleChangeStart: function(handle) {
            var index = handle.options.index;
            var handles = this.handles;
            if (!Array.isArray(handles)) return;
            for (var i = 0, n = handles.length; i < n; i++) {
                if (i !== index && handles[i]) handles[i].remove();
            }
        },
        onHandleChangeEnd: function(handle) {
            this.render();
        },
        updateHandle: function(handle, vertex, nextVertex) {
            var segmentLine = new g.Line(vertex, nextVertex);
            var position = segmentLine.midpoint();
            var angle = segmentLine.vector().vectorAngle(g.Point(1,0));
            handle.position(position.x, position.y, angle);
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


    var Vectors = Tool.extend({

        pathEditor: null,

        onRender: function() {

            this.onRemove();

            var pathEditor = this.pathEditor = new joint.ui.PathEditor({
                pathElement: this.relatedView.el.querySelector('path'),
                path: this.relatedView.getPath()
            });
            // var velControlPoints = pathEditor.vel.find('.control-point');
            // for (var i = 1, n = velControlPoints.length; i < n - 1; i++) {
            //     velControlPoints[i].addClass('locked');
            // }

            pathEditor.on({
                'path:edit': function(path) {

                },
                'path:control-point:adjusting': function(path, segIndex, controlPointType, point) {
                    var linkView = this.relatedView;
                    var link = linkView.model;
                    var vertexIndex, vectorType, endPoint, endType;
                    if (controlPointType === 1) {
                        vectorType = 'outVector';
                        vertexIndex = segIndex - 2;
                        endPoint = linkView.sourcePoint;
                        endType = 'source';
                    } else {
                        vectorType = 'inVector';
                        vertexIndex = segIndex - 1;
                        endPoint = linkView.targetPoint;
                        endType = 'target';
                    }
                    var vertex = link.vertex(vertexIndex);
                    var vector = point.difference(vertex || endPoint).toJSON();
                    if (!vertex) {
                        link.prop([endType, vectorType], vector, { tool: this.cid });
                    } else {
                        vertex = {};
                        vertex[vectorType] = vector;
                        link.vertex(vertexIndex, vertex, { tool: this.cid });
                    }
                },
                'path:anchor-point:create': function(path, segIndex, point) {
                    this.relatedView.model.addVertex(segIndex - 1, point.toJSON());
                }
            }, this);
        },

        update: function() {
            if (this.pathEditor) this.pathEditor.render();
        },

        onRemove: function() {
            var pathEditor = this.pathEditor;
            if (!pathEditor) return;
            pathEditor.remove();
            this.pathEditor = null;
        }
    });

    var Boundary = Tool.extend({
        tagName: 'rect',
        options: {
            padding: 10
        },
        attributes: {
            'fill': 'none',
            'stroke': '#1ABC9C',
            'stroke-width': 3,
            'stroke-dasharray': '5, 10',
            'pointer-events': 'none'
        },
        onRender: function() {
            this.update();
        },
        update: function() {
            var bbox = this.relatedView.getPath().bbox().inflate(this.options.padding);
            this.vel.attr(bbox.toJSON());
        }
    })

    // Export
    joint.dia.tools = {
        Vertices: Vertices,
        Segments: Segments,
        SourceArrowhead: SourceArrowhead,
        TargetArrowhead: TargetArrowhead,
        Remove: Remove,
        Vectors: Vectors,
        Boundary: Boundary
    };

    joint.dia.Tool = Tool;

})(joint, joint.util, V, g);
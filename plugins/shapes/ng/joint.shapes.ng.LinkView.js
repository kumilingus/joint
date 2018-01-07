(function (joint) {

    joint.shapes.ng || (joint.shapes.ng = {});

    joint.shapes.ng.LinkView = joint.dia.CellView.extend({

        className: function () {
            var classNames = joint.dia.CellView.prototype.className.apply(this).split(' ');
            classNames.push('link');
            return classNames.join(' ');
        },

        options: {
        },

        _z: null,

        initialize: function (options) {

            joint.dia.CellView.prototype.initialize.apply(this, arguments);

            // create methods in prototype, so they can be accessed from any instance and
            // don't need to be create over and over
            // if (typeof this.constructor.prototype.watchSource !== 'function') {
            //     this.constructor.prototype.watchSource = this.createWatcher('source');
            //     this.constructor.prototype.watchTarget = this.createWatcher('target');
            // }

            // `_.labelCache` is a mapping of indexes of labels in the `this.get('labels')` array to
            // `<g class="label">` nodes wrapped by Vectorizer. This allows for quick access to the
            // nodes in `updateLabelPosition()` in order to update the label positions.
            this._labelCache = {};
            this._V = {};
            // bind events
            this.startListening();
        },

        startListening: function () {

            var model = this.model;

            // this.listenTo(model, 'change:markup', this.render);
            // this.listenTo(model, 'change:smooth change:manhattan change:router change:connector', this.update);
            // this.listenTo(model, 'change:toolMarkup', this.onToolsChange);
            // this.listenTo(model, 'change:labels change:labelMarkup', this.onLabelsChange);

            this.listenTo(model, 'change:vertices change:vertexMarkup', function () {
                this.requestUpdate(16);
            });
            this.listenTo(model, 'change:source change:target', function (cell) {
                this.requestUpdate(32);
            });
        },

        // Rendering
        //----------

        render: function () {
            this.vel.empty().append(this.renderDOMSubtree());
            this.renderLabels();
            this.update();
            return this;
        },

        renderLabels: function () {

            var vLabels = this._V.labels;
            if (!vLabels) {
                return this;
            }

            vLabels.empty();

            var model = this.model;
            var labels = model.get('labels') || [];
            var labelCache = this._labelCache = {};
            var labelsCount = labels.length;
            if (labelsCount === 0) {
                return this;
            }

            var labelTemplate = joint.util.template(model.get('labelMarkup') || model.labelMarkup);
            // This is a prepared instance of a vectorized SVGDOM node for the label element resulting from
            // compilation of the labelTemplate. The purpose is that all labels will just `clone()` this
            // node to create a duplicate.
            var labelNodeInstance = V(labelTemplate());

            for (var i = 0; i < labelsCount; i++) {

                var label = labels[i];
                var labelMarkup = label.markup;
                // Cache label nodes so that the `updateLabels()` can just update the label node positions.
                var vLabelNode = labelCache[i] = (labelMarkup)
                    ? V('g').append(V(labelMarkup))
                    : labelNodeInstance.clone();

                vLabelNode
                    .addClass('label')
                    .attr('label-idx', i)
                    .appendTo(vLabels);
            }

            this.updateLabels();

            return this;
        },

        updateLabels: function () {

            if (!this._V.labels) {
                return this;
            }

            var labels = this.model.get('labels') || [];
            var canLabelMove = this.can('labelMove');

            for (var i = 0, n = labels.length; i < n; i++) {

                var vLabel = this._labelCache[i];
                var label = labels[i];

                vLabel.attr('cursor', (canLabelMove ? 'move' : 'default'));

                var labelAttrs = label.attrs;
                if (!label.markup) {
                    // Default attributes to maintain backwards compatibility
                    labelAttrs = joint.util.merge({
                        text: {
                            textAnchor: 'middle',
                            fontSize: 14,
                            fill: '#000000',
                            pointerEvents: 'none',
                            yAlignment: 'middle'
                        },
                        rect: {
                            ref: 'text',
                            fill: '#ffffff',
                            rx: 3,
                            ry: 3,
                            refWidth: 1,
                            refHeight: 1,
                            refX: 0,
                            refY: 0
                        }
                    }, labelAttrs);
                }

                this.updateDOMSubtreeAttributes(vLabel.node, labelAttrs, {
                    rootBBox: g.Rect(label.size)
                });
            }

            return this;
        },

        // Updating
        //---------

        // Default is to process the `attrs` object and set attributes on subelements based on the selectors.
        update: function (model, attributes, opt) {
            opt || (opt || {});
            this.calculatePath(opt);
            this.updateDOMSubtreeAttributes(this.el, this.model.attr(), { rootPath: this._path });
            this.updateLabelPositions();
            this.updateTools(opt);
            return this;
        },

        calculatePath: function (opt) {
            opt || (opt || {});
            if (!this.sourceBBox) this.updateEnd('source');
            if (!this.targetBBox) this.updateEnd('target');
            var route = this.route = this.findRoute(this.model.get('vertices') || [], opt);
            // finds all the connection points taking new vertices into account
            this._findConnectionPoints(route);
            var pathData = this.getPathData(route);
            this._path = new g.Path(V.normalizePathData(pathData));
            return this._path;
        },

        _findConnectionPoints: function (vertices) {

            // cache source and target points
            var sourcePoint, targetPoint, sourceMarkerPoint, targetMarkerPoint;

            var verticesArr = joint.util.toArray(vertices);
            var firstVertex = verticesArr[0];
            var lastVertex = verticesArr[verticesArr.length - 1];

            var model = this.model;
            var sourceDef = model.get('source');
            var targetDef = model.get('target');
            var sourceBBox = this.sourceBBox;
            var targetBBox = this.targetBBox;

            var paperOptions = this.paper.options;
            var sourceAnchor;
            if (true && firstVertex && sourceBBox.containsPoint(firstVertex)) {
                sourceAnchor = new g.Point(firstVertex);
                firstVertex = verticesArr[1];
                vertices.splice(0, 1);
            } else {
                var sourceAnchorRef = (firstVertex) ? new g.Rect(firstVertex) : targetBBox;
                var sourceAnchorDef = sourceDef.anchor || paperOptions.defaultSourceAnchor;
                sourceAnchor = this.getAnchor(sourceAnchorDef, sourceBBox, sourceAnchorRef);
            }

            var targetAnchor;
            if (true && lastVertex && targetBBox.containsPoint(lastVertex)) {
                targetAnchor = new g.Point(lastVertex);
                lastVertex = verticesArr[verticesArr.length - 2];
                vertices.splice(-1, 1);
            } else {
                var targetAnchorRef = new g.Rect(lastVertex || sourceAnchor);
                var targetAnchorDef = targetDef.anchor || paperOptions.defaultTargetAnchor;
                targetAnchor = this.getAnchor(targetAnchorDef, targetBBox, targetAnchorRef);
            }

            var sourceConnectionPointDef = sourceDef.connectionPoint || paperOptions.defaultSourceConnectionPoint;
            var sourcePointRef = firstVertex || targetAnchor;
            var sourcePoint = this.getConnectionPoint(sourceConnectionPointDef, sourceAnchor, sourcePointRef, sourceBBox);
            var targetConnectionPointDef = targetDef.connectionPoint || paperOptions.defaultTargetConnectionPoint;
            var targetPointRef = lastVertex || sourceAnchor;
            var targetPoint = this.getConnectionPoint(targetConnectionPointDef, targetAnchor, targetPointRef, targetBBox);

            // make connection points public
            this.sourcePoint = sourcePoint;
            this.targetPoint = targetPoint;
        },

        getAnchor: function (anchorDef, bbox, ref) {
            var anchor;
            if (anchorDef) {
                var anchorName = anchorDef.name;
                var anchorFn = joint.anchors[anchorName];
                if (typeof anchorFn !== 'function') throw new Error('Unknown anchor: ' + anchorName);
                anchor = anchorFn.call(this, bbox.clone(), ref, anchorDef.args || {});
            }
            return anchor || bbox.center();
        },

        getConnectionPoint: function (connectionPointDef, anchor, refPoint, bbox) {
            var connectionPoint;
            if (connectionPointDef) {
                var connectionPointName = connectionPointDef.name;
                var connectionPointFn = joint.connectionPoints[connectionPointName];
                if (typeof connectionPointFn !== 'function') throw new Error('Unknown connection point: ' + connectionPointName);
                connectionPoint = connectionPointFn.call(this, anchor, new g.Point(refPoint), bbox, connectionPointDef.args || {});
            }
            return connectionPoint || anchor;
        },

        updateLabelPositions: function () {

            if (!this._V.labels) return this;

            // This method assumes all the label nodes are stored in the `this._labelCache` hash table
            // by their indexes in the `this.get('labels')` array. This is done in the `renderLabels()` method.

            var labels = this.model.get('labels') || [];
            if (!labels.length) return this;

            var connectionElement = this._path;
            var connectionLength = connectionElement.length();

            // Firefox returns connectionLength=NaN in odd cases (for bezier curves).
            // In that case we won't update labels at all.
            if (Number.isNaN(connectionLength)) {
                return this;
            }

            for (var idx = 0, n = labels.length; idx < n; idx++) {

                var label = labels[idx];
                var position = label.position;
                var isPositionObject = joint.util.isObject(position);
                var labelCoordinates;

                var distance = isPositionObject ? position.distance : position;
                var offset = isPositionObject ? position.offset : { x: 0, y: 0 };

                if (Number.isFinite(distance)) {
                    distance = (distance > connectionLength) ? connectionLength : distance; // sanity check
                    distance = (distance < 0) ? connectionLength + distance : distance;
                    distance = (distance > 1) ? distance : connectionLength * distance;
                } else {
                    distance = connectionLength / 2;
                }

                labelCoordinates = connectionElement.pointAtLength(distance);

                if (joint.util.isObject(offset)) {

                    // Just offset the label by the x,y provided in the offset object.
                    labelCoordinates = g.point(labelCoordinates).offset(offset);

                } else if (Number.isFinite(offset)) {

                    // TODO: use g.Path()

                    // Offset the label by the amount provided in `offset` to an either
                    // side of the link.

                    // 1. Find the closest sample & its left and right neighbours.
                    var minSqDistance = Infinity;
                    var closestSampleIndex, sample, sqDistance;
                    for (var i = 0, m = samples.length; i < m; i++) {
                        sample = samples[i];
                        sqDistance = g.line(sample, labelCoordinates).squaredLength();
                        if (sqDistance < minSqDistance) {
                            minSqDistance = sqDistance;
                            closestSampleIndex = i;
                        }
                    }
                    var prevSample = samples[closestSampleIndex - 1];
                    var nextSample = samples[closestSampleIndex + 1];

                    // 2. Offset the label on the perpendicular line between
                    // the current label coordinate ("at `distance`") and
                    // the next sample.
                    var angle = 0;
                    if (nextSample) {
                        angle = g.point(labelCoordinates).theta(nextSample);
                    } else if (prevSample) {
                        angle = g.point(prevSample).theta(labelCoordinates);
                    }
                    labelCoordinates = g.point(labelCoordinates).offset(offset).rotate(labelCoordinates, angle - 90);
                }

                this._labelCache[idx].attr('transform', 'translate(' + labelCoordinates.x + ', ' + labelCoordinates.y + ')');
            }

            return this;
        },

        onChangeAttrs: function (cell, attrs, opt) {
            var type = (opt.dirty) ? 64 : 32;
            this.requestUpdate(type);
        },

        confirmUpdate: function (type) {
            var paper = this.paper;
            if (!this.paper) return type;
            if (type & 128) {
                paper.insertView(this, true);
                return type - 128;
                //type ^= 128;
            }
            if (type & 64) {
                this.updateEnd('source');
                this.updateEnd('target');
                this.render();
                return 0;
            }
            if (type & 32) {
                this.updateEnd('source');
                this.updateEnd('target');
                this.update();
                return 0;
            }
            if (type & 16) {
                this.update();
                return 0;
            }
            return type;
        },

        updateEnd: function (endType) {
            var end = this.model.get(endType);
            if (end.id) {
                var view = this.paper.findViewByModel(end.id);
                if (this.paper.options.useModelGeometry) {
                    this[endType + 'BBox'] = view.model.getBBox();
                    this[endType + 'View'] = view;
                    this[endType + 'Magnet'] = null;
                    return;
                }
                if (view) {
                    if (view.model.isLink()) {
                        var selector = this.constructor.makeSelector(end);
                        var magnetElement = view.el.querySelector(selector);
                        this[endType + 'BBox'] = (magnetElement) ? view.getStrokeBBox(magnetElement) : new g.Rect(view.getPath().pointAt(.5));
                        this[endType + 'View'] = view;
                        this[endType + 'Magnet'] = magnetElement;
                    } else {
                        var selector = this.constructor.makeSelector(end);
                        var magnetElement = view.el.querySelector(selector);
                        this[endType + 'BBox'] = view.getStrokeBBox(magnetElement);
                        this[endType + 'View'] = view;
                        this[endType + 'Magnet'] = magnetElement;
                    }
                }
            } else {
                // the link end is a point ~ rect 1x1
                this[endType + 'BBox'] = g.rect(end.x || 0, end.y || 0, 1, 1);
                this[endType + 'View'] = this[endType + 'Magnet'] = null;
            }
        },

        // This method ads a new vertex to the `vertices` array of `.connection`. This method
        // uses a heuristic to find the index at which the new `vertex` should be placed at assuming
        // the new vertex is somewhere on the path.
        addVertex: function (vertex, opt) {

            // As it is very hard to find a correct index of the newly created vertex,
            // a little heuristics is taking place here.
            // The heuristics checks if length of the newly created
            // path is lot more than length of the old path. If this is the case,
            // new vertex was probably put into a wrong index.
            // Try to put it into another index and repeat the heuristics again.

            var vertices = (this.model.get('vertices') || []).slice();
            // Store the original vertices for a later revert if needed.
            var originalVertices = vertices.slice();

            // A `<path>` element used to compute the length of the path during heuristics.
            var path = this._path.clone();

            // Length of the original path.
            var originalPathLength = path.length();
            // Current path length.
            var pathLength;
            // Tolerance determines the highest possible difference between the length
            // of the old and new path. The number has been chosen heuristically.
            var pathLengthTolerance = 20;
            // Total number of vertices including source and target points.
            var idx = vertices.length + 1;

            // Loop through all possible indexes and check if the difference between
            // path lengths changes significantly. If not, the found index is
            // most probably the right one.
            while (idx--) {

                vertices.splice(idx, 0, vertex);
                //V(path).attr('d', this.getPathData(this.findRoute(vertices)));

                path = new g.Path(V.normalizePathData(this.getPathData(this.findRoute(vertices))));

                pathLength = path.length();

                // Check if the path lengths changed significantly.
                if (pathLength - originalPathLength > pathLengthTolerance) {

                    // Revert vertices to the original array. The path length has changed too much
                    // so that the index was not found yet.
                    vertices = originalVertices.slice();

                } else {

                    break;
                }
            }

            if (idx === -1) {
                // If no suitable index was found for such a vertex, make the vertex the first one.
                idx = 0;
                vertices.splice(idx, 0, vertex);
            }

            this.model.set('vertices', vertices, opt);

            return idx;
        },

        removeRedundantLinearVertices: function (opt) {
            var link = this.model;
            var vertices = link.vertices();
            var conciseVertices = [];
            var n = vertices.length;
            var m = 0;
            for (var i = 0; i < n; i++) {
                var current = vertices[i].clone().round();
                var prev = new g.Point(conciseVertices[m - 1] || this.sourcePoint);
                if (prev.round().equals(current)) continue;
                var next = g.Point(vertices[i + 1] || this.targetPoint);
                var line = new g.Line(prev, next.round());
                if (line.pointOffset(current) === 0) continue;
                conciseVertices.push(vertices[i].toJSON());
                m++;
            }
            if (n === m) return 0;
            link.set('vertices', conciseVertices, opt);
            return (n - m);
        },

        findRoute: function (vertices) {

            var namespace = joint.routers;
            var defaultRouter = this.paper.options.defaultRouter;
            var router = this.model.get('router') || defaultRouter;
            if (!router) return vertices;
            var args = router.args || {};
            var routerFn = joint.util.isFunction(router) ? router : namespace[router.name];
            if (!joint.util.isFunction(routerFn)) {
                throw new Error('unknown router: "' + router.name + '"');
            }
            var route = routerFn.call(this, vertices || [], args, this);
            return route;
        },

        // Return the `d` attribute value of the `<path>` element representing the link
        // between `source` and `target`.
        getPathData: function (vertices) {

            var namespace = joint.connectors;
            var defaultConnector = this.paper.options.defaultConnector;
            var connector = this.model.get('connector') || defaultConnector;
            var connectorFn = joint.util.isFunction(connector) ? connector : namespace[connector.name];
            if (!joint.util.isFunction(connectorFn)) {
                throw new Error('unknown connector: "' + connector.name + '"');
            }
            var pathData = connectorFn.call(
                this,
                this.sourcePoint,
                this.targetPoint,
                vertices || (this.model.get('vertices') || {}),
                connector.args || {},
                this
            );
            return pathData;
        },


        // Public API
        // ----------

        getPath: function () {
            if (!this._path) return null;
            return this._path.clone();
        },

        getConnectionLength: function () {
            return this._path.length();
        },

        getPointAtLength: function (length) {
            return this._path.pointAtLength(length);
        },

        // Send a token (an SVG element, usually a circle) along the connection path.
        // Example: `link.findView(paper).sendToken(V('circle', { r: 7, fill: 'green' }).node)`
        // `opt.duration` is optional and is a time in milliseconds that the token travels from the source to the target of the link. Default is `1000`.
        // `opt.directon` is optional and it determines whether the token goes from source to target or other way round (`reverse`)
        // `callback` is optional and is a function to be called once the token reaches the target.
        sendToken: function (token, opt, callback) {

            function onAnimationEnd(vToken, callback) {
                return function () {
                    vToken.remove();
                    if (typeof callback === 'function') {
                        callback();
                    }
                };
            }
            var duration, isReversed;
            if (joint.util.isObject(opt)) {
                duration = opt.duration;
                isReversed = (opt.direction === 'reverse');
            } else {
                // Backwards compatibility
                duration = opt;
                isReversed = false;
            }

            duration = duration || 1000;

            var animationAttributes = {
                dur: duration + 'ms',
                repeatCount: 1,
                calcMode: 'linear',
                fill: 'freeze'
            };

            if (isReversed) {
                animationAttributes.keyPoints = '1;0';
                animationAttributes.keyTimes = '0;1';
            }

            var vToken = V(token);
            var vPath = this._V.connection;

            vToken
                .appendTo(this.paper.viewport)
                .animateAlongPath(animationAttributes, vPath);

            setTimeout(onAnimationEnd(vToken, callback), duration);
        },

        // Interaction. The controller part.
        // ---------------------------------

        _beforeArrowheadMove: function () {

            this._z = this.model.get('z');
            this.model.toFront();

            // Let the pointer propagate throught the link view elements so that
            // the `evt.target` is another element under the pointer, not the link itself.
            this.el.style.pointerEvents = 'none';

            if (this.paper.options.markAvailable) {
                this._markAvailableMagnets();
            }
        },

        _afterArrowheadMove: function () {

            if (this._z !== null) {
                this.model.set('z', this._z, { ui: true });
                this._z = null;
            }

            // Put `pointer-events` back to its original value. See `startArrowheadMove()` for explanation.
            // Value `auto` doesn't work in IE9. We force to use `visiblePainted` instead.
            // See `https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events`.
            this.el.style.pointerEvents = 'visiblePainted';

            if (this.paper.options.markAvailable) {
                this._unmarkAvailableMagnets();
            }
        },

        _createValidateConnectionArgs: function (arrowhead) {
            // It makes sure the arguments for validateConnection have the following form:
            // (source view, source magnet, target view, target magnet and link view)
            var args = [];

            args[4] = arrowhead;
            args[5] = this;

            var oppositeArrowhead;
            var i = 0;
            var j = 0;

            if (arrowhead === 'source') {
                i = 2;
                oppositeArrowhead = 'target';
            } else {
                j = 2;
                oppositeArrowhead = 'source';
            }

            var end = this.model.get(oppositeArrowhead);

            if (end.id) {
                args[i] = this.paper.findViewByModel(end.id);
                args[i + 1] = end.selector && args[i].el.querySelector(end.selector);
            }

            function validateConnectionArgs(cellView, magnet) {
                args[j] = cellView;
                args[j + 1] = cellView.el === magnet ? undefined : magnet;
                return args;
            }

            return validateConnectionArgs;
        },

        _markAvailableMagnets: function () {

            function isMagnetAvailable(view, magnet) {
                var paper = view.paper;
                var validate = paper.options.validateConnection;
                return validate.apply(paper, this._validateConnectionArgs(view, magnet));
            }

            var paper = this.paper;
            var elements = paper.model.getElements();
            this._marked = {};

            for (var i = 0, n = elements.length; i < n; i++) {
                var view = elements[i].findView(paper);

                if (!view) {
                    continue;
                }

                var magnets = Array.prototype.slice.call(view.el.querySelectorAll('[magnet]'));
                if (view.el.getAttribute('magnet') !== 'false') {
                    // Element wrapping group is also a magnet
                    magnets.push(view.el);
                }

                var availableMagnets = magnets.filter(isMagnetAvailable.bind(this, view));

                if (availableMagnets.length > 0) {
                    // highlight all available magnets
                    for (var j = 0, m = availableMagnets.length; j < m; j++) {
                        view.highlight(availableMagnets[j], { magnetAvailability: true });
                    }
                    // highlight the entire view
                    view.highlight(null, { elementAvailability: true });

                    this._marked[view.model.id] = availableMagnets;
                }
            }
        },

        _unmarkAvailableMagnets: function () {

            var markedKeys = Object.keys(this._marked);
            var id;
            var markedMagnets;

            for (var i = 0, n = markedKeys.length; i < n; i++) {
                id = markedKeys[i];
                markedMagnets = this._marked[id];

                var view = this.paper.findViewByModel(id);
                if (view) {
                    for (var j = 0, m = markedMagnets.length; j < m; j++) {
                        view.unhighlight(markedMagnets[j], { magnetAvailability: true });
                    }
                    view.unhighlight(null, { elementAvailability: true });
                }
            }

            this._marked = null;
        },

        startArrowheadMove: function (end, opt) {

            opt = joint.util.defaults(opt || {}, { whenNotAllowed: 'revert' });
            // Allow to delegate events from an another view to this linkView in order to trigger arrowhead
            // move without need to click on the actual arrowhead dom element.
            this._action = 'arrowhead-move';
            this._whenNotAllowed = opt.whenNotAllowed;
            this._arrowhead = end;
            this._initialMagnet = this[end + 'Magnet'] || (this[end + 'View'] ? this[end + 'View'].el : null);
            this._initialEnd = joint.util.assign({}, this.model.get(end)) || { x: 0, y: 0 };
            this._validateConnectionArgs = this._createValidateConnectionArgs(this._arrowhead);
            this._beforeArrowheadMove();
        },

        pointerdown: function (evt, x, y) {

            joint.dia.CellView.prototype.pointerdown.apply(this, arguments);
            this.notify('link:pointerdown', evt, x, y);

            this._dx = x;
            this._dy = y;

            // if are simulating pointerdown on a link during a magnet click, skip link interactions
            if (evt.target.getAttribute('magnet') != null) return;

            var className = joint.util.removeClassNamePrefix(evt.target.getAttribute('class'));
            var parentClassName = joint.util.removeClassNamePrefix(evt.target.parentNode.getAttribute('class'));
            var labelNode;
            if (parentClassName === 'label') {
                className = parentClassName;
                labelNode = evt.target.parentNode;
            } else {
                labelNode = evt.target;
            }

            switch (className) {

                case 'marker-vertex':
                    if (this.can('vertexMove')) {
                        this._action = 'vertex-move';
                        this._vertexIdx = evt.target.getAttribute('idx');
                    }
                    break;

                case 'marker-vertex-remove':
                case 'marker-vertex-remove-area':
                    if (this.can('vertexRemove')) {
                        this.model.removeVertex(evt.target.getAttribute('idx'), { ui: true });
                    }
                    break;

                case 'marker-arrowhead':
                    if (this.can('arrowheadMove')) {
                        this.startArrowheadMove(evt.target.getAttribute('end'));
                    }
                    break;

                case 'label':
                    if (this.can('labelMove')) {
                        this._action = 'label-move';
                        this._labelIdx = parseInt(V(labelNode).attr('label-idx'), 10);
                        // Precalculate samples so that we don't have to do that
                        // over and over again while dragging the label.
                        this._samples = this._V.connection.sample(1);
                        this._linkLength = this._V.connection.node.getTotalLength();
                    }
                    break;

                default:

                    if (this.can('vertexAdd')) {

                        // Store the index at which the new vertex has just been placed.
                        // We'll be update the very same vertex position in `pointermove()`.
                        this._vertexIdx = this.addVertex({ x: x, y: y }, { ui: true });
                        this._action = 'vertex-move';
                    }
            }
        },

        pointermove: function (evt, x, y) {

            switch (this._action) {

                case 'vertex-move':

                    var vertices = joint.util.assign([], this.model.get('vertices'));
                    vertices[this._vertexIdx] = { x: x, y: y };
                    this.model.set('vertices', vertices, { ui: true });
                    break;

                case 'label-move':

                    var dragPoint = { x: x, y: y };
                    var samples = this._samples;
                    var minSqDistance = Infinity;
                    var closestSample;
                    var closestSampleIndex;
                    var p;
                    var sqDistance;
                    for (var i = 0, n = samples.length; i < n; i++) {
                        p = samples[i];
                        sqDistance = g.line(p, dragPoint).squaredLength();
                        if (sqDistance < minSqDistance) {
                            minSqDistance = sqDistance;
                            closestSample = p;
                            closestSampleIndex = i;
                        }
                    }
                    var prevSample = samples[closestSampleIndex - 1];
                    var nextSample = samples[closestSampleIndex + 1];
                    var offset = 0;
                    if (prevSample && nextSample) {
                        offset = g.line(prevSample, nextSample).pointOffset(dragPoint);
                    } else if (prevSample) {
                        offset = g.line(prevSample, closestSample).pointOffset(dragPoint);
                    } else if (nextSample) {
                        offset = g.line(closestSample, nextSample).pointOffset(dragPoint);
                    }

                    this.model.label(this._labelIdx, {
                        position: {
                            distance: closestSample.distance / this._linkLength,
                            offset: offset
                        }
                    });
                    break;

                case 'arrowhead-move':

                    if (this.paper.options.snapLinks) {

                        // checking view in close area of the pointer

                        var r = this.paper.options.snapLinks.radius || 50;
                        var viewsInArea = this.paper.findViewsInArea({ x: x - r, y: y - r, width: 2 * r, height: 2 * r });

                        if (this._closestView) {
                            this._closestView.unhighlight(this._closestEnd.selector, {
                                connecting: true,
                                snapping: true
                            });
                        }
                        this._closestView = this._closestEnd = null;

                        var distance;
                        var minDistance = Number.MAX_VALUE;
                        var pointer = g.point(x, y);

                        viewsInArea.forEach(function (view) {

                            // skip connecting to the element in case '.': { magnet: false } attribute present
                            if (view.el.getAttribute('magnet') !== 'false') {

                                // find distance from the center of the model to pointer coordinates
                                distance = view.model.getBBox().center().distance(pointer);

                                // the connection is looked up in a circle area by `distance < r`
                                if (distance < r && distance < minDistance) {

                                    if (this.paper.options.validateConnection.apply(
                                        this.paper, this._validateConnectionArgs(view, null)
                                    )) {
                                        minDistance = distance;
                                        this._closestView = view;
                                        this._closestEnd = { id: view.model.id };
                                    }
                                }
                            }

                            view.$('[magnet]').each(function (index, magnet) {

                                var bbox = V(magnet).getBBox({ target: this.paper.viewport });

                                distance = pointer.distance({
                                    x: bbox.x + bbox.width / 2,
                                    y: bbox.y + bbox.height / 2
                                });

                                if (distance < r && distance < minDistance) {

                                    if (this.paper.options.validateConnection.apply(
                                        this.paper, this._validateConnectionArgs(view, magnet)
                                    )) {
                                        minDistance = distance;
                                        this._closestView = view;
                                        this._closestEnd = {
                                            id: view.model.id,
                                            selector: view.getSelector(magnet),
                                            port: magnet.getAttribute('port')
                                        };
                                    }
                                }

                            }.bind(this));

                        }, this);

                        if (this._closestView) {
                            this._closestView.highlight(this._closestEnd.selector, {
                                connecting: true,
                                snapping: true
                            });
                        }

                        this.model.set(this._arrowhead, this._closestEnd || { x: x, y: y }, { ui: true });

                    } else {

                        // checking views right under the pointer

                        // Touchmove event's target is not reflecting the element under the coordinates as mousemove does.
                        // It holds the element when a touchstart triggered.
                        var target = (evt.type === 'mousemove')
                            ? evt.target
                            : document.elementFromPoint(evt.clientX, evt.clientY);

                        if (this._eventTarget !== target) {
                            // Unhighlight the previous view under pointer if there was one.
                            if (this._magnetUnderPointer) {
                                this._viewUnderPointer.unhighlight(this._magnetUnderPointer, {
                                    connecting: true
                                });
                            }

                            this._viewUnderPointer = this.paper.findView(target);
                            if (this._viewUnderPointer) {
                                // If we found a view that is under the pointer, we need to find the closest
                                // magnet based on the real target element of the event.
                                this._magnetUnderPointer = this._viewUnderPointer.findMagnet(target);

                                if (this._magnetUnderPointer && this.paper.options.validateConnection.apply(
                                    this.paper,
                                    this._validateConnectionArgs(this._viewUnderPointer, this._magnetUnderPointer)
                                )) {
                                    // If there was no magnet found, do not highlight anything and assume there
                                    // is no view under pointer we're interested in reconnecting to.
                                    // This can only happen if the overall element has the attribute `'.': { magnet: false }`.
                                    if (this._magnetUnderPointer) {
                                        this._viewUnderPointer.highlight(this._magnetUnderPointer, {
                                            connecting: true
                                        });
                                    }
                                } else {
                                    // This type of connection is not valid. Disregard this magnet.
                                    this._magnetUnderPointer = null;
                                }
                            } else {
                                // Make sure we'll unset previous magnet.
                                this._magnetUnderPointer = null;
                            }
                        }

                        this._eventTarget = target;

                        this.model.set(this._arrowhead, { x: x, y: y }, { ui: true });
                    }
                    break;
            }

            this._dx = x;
            this._dy = y;

            joint.dia.CellView.prototype.pointermove.apply(this, arguments);
            this.notify('link:pointermove', evt, x, y);
        },

        pointerup: function (evt, x, y) {

            if (this._action === 'label-move') {

                this._samples = null;

            } else if (this._action === 'arrowhead-move') {

                var model = this.model;
                var paper = this.paper;
                var paperOptions = paper.options;
                var arrowhead = this._arrowhead;
                var initialEnd = this._initialEnd;
                var magnetUnderPointer;

                if (paperOptions.snapLinks) {

                    // Finish off link snapping.
                    // Everything except view unhighlighting was already done on pointermove.
                    if (this._closestView) {
                        this._closestView.unhighlight(this._closestEnd.selector, {
                            connecting: true,
                            snapping: true
                        });

                        magnetUnderPointer = this._closestView.findMagnet(this._closestEnd.selector);
                    }

                    this._closestView = this._closestEnd = null;

                } else {

                    var viewUnderPointer = this._viewUnderPointer;
                    magnetUnderPointer = this._magnetUnderPointer;

                    this._viewUnderPointer = null;
                    this._magnetUnderPointer = null;

                    if (magnetUnderPointer) {

                        viewUnderPointer.unhighlight(magnetUnderPointer, { connecting: true });
                        // Find a unique `selector` of the element under pointer that is a magnet. If the
                        // `this._magnetUnderPointer` is the root element of the `this._viewUnderPointer` itself,
                        // the returned `selector` will be `undefined`. That means we can directly pass it to the
                        // `source`/`target` attribute of the link model below.
                        var selector = viewUnderPointer.getSelector(magnetUnderPointer);
                        var port = magnetUnderPointer.getAttribute('port');
                        var arrowheadValue = { id: viewUnderPointer.model.id };
                        if (port != null) arrowheadValue.port = port;
                        if (selector != null) arrowheadValue.selector = selector;
                        model.set(arrowhead, arrowheadValue, { ui: true });
                    }
                }

                // If the changed link is not allowed, revert to its previous state.
                if (!paper.linkAllowed(this)) {

                    switch (this._whenNotAllowed) {

                        case 'remove':
                            model.remove({ ui: true });
                            break;

                        case 'revert':
                        default:
                            model.set(arrowhead, initialEnd, { ui: true });
                            break;
                    }

                } else {

                    // Reparent the link if embedding is enabled
                    if (paperOptions.embeddingMode && model.reparent()) {
                        // Make sure we don't reverse to the original 'z' index (see afterArrowheadMove()).
                        this._z = null;
                    }

                    var currentEnd = model.prop(arrowhead);
                    var endChanged = currentEnd && !joint.dia.Link.endsEqual(initialEnd, currentEnd);
                    if (endChanged) {

                        if (initialEnd.id) {
                            this.notify('link:disconnect', evt, paper.findViewByModel(initialEnd.id), this._initialMagnet, arrowhead);
                        }
                        if (currentEnd.id) {
                            this.notify('link:connect', evt, paper.findViewByModel(currentEnd.id), magnetUnderPointer, arrowhead);
                        }
                    }
                }

                this._afterArrowheadMove();
            }

            this._action = null;
            this._whenNotAllowed = null;
            this._initialMagnet = null;
            this._initialEnd = null;
            this._validateConnectionArgs = null;
            this._eventTarget = null;

            this.notify('link:pointerup', evt, x, y);
            joint.dia.CellView.prototype.pointerup.apply(this, arguments);

            // mouseleave event is not triggered due to changing pointer-events to `none`.
            if (!this.vel.contains(evt.target)) {
                this.mouseleave(evt);
            }
        },

        mouseenter: function (evt) {

            joint.dia.CellView.prototype.mouseenter.apply(this, arguments);
            this.notify('link:mouseenter', evt);
        },

        mouseleave: function (evt) {

            joint.dia.CellView.prototype.mouseleave.apply(this, arguments);
            this.notify('link:mouseleave', evt);
        },

        event: function (evt, eventName, x, y) {

            // Backwards compatibility
            var linkTool = V(evt.target).findParentByClass('link-tool', this.el);
            if (linkTool) {
                // No further action to be executed
                evt.stopPropagation();
                // Allow `interactive.useLinkTools=false`
                if (this.can('useLinkTools')) {
                    if (eventName === 'remove') {
                        // Built-in remove event
                        this.model.remove({ ui: true });
                    } else {
                        // link:options and other custom events inside the link tools
                        this.notify(eventName, evt, x, y);
                    }
                }

            } else {

                joint.dia.CellView.prototype.event.apply(this, arguments);
            }
        }

    }, {

            makeSelector: function (end) {

                var selector = '[model-id="' + end.id + '"]';
                // `port` has a higher precendence over `selector`. This is because the selector to the magnet
                // might change while the name of the port can stay the same.
                if (end.port) {
                    selector += ' [port="' + end.port + '"]';
                } else if (end.selector) {
                    selector += ' ' + end.selector;
                }

                return selector;
            }

        });


})(joint);

joint.connectors.smooth = function(sourcePoint, targetPoint, vertices) {

    var d;

    if (vertices.length) {

        d = g.bezier.curveThroughPoints([sourcePoint].concat(vertices).concat([targetPoint]));

    } else {
        // if we have no vertices use a default cubic bezier curve, cubic bezier requires
        // two control points. The two control points are both defined with X as mid way
        // between the source and target points. SourceControlPoint Y is equal to sourcePoint Y
        // and targetControlPointY being equal to targetPointY.
        var controlPointX = (sourcePoint.x + targetPoint.x) / 2;

        d = [
            'M', sourcePoint.x, sourcePoint.y,
            'C', controlPointX, sourcePoint.y, controlPointX, targetPoint.y,
            targetPoint.x, targetPoint.y
        ];
    }

    return d.join(' ');
};

joint.connectors.vectorDriven = function(sourcePoint, targetPoint, vertices) {

    var d;

    if (vertices.length) {

        var link = this.model;

        sourcePoint = sourcePoint.clone();
        sourcePoint.outVector = link.prop('source/outVector');
        targetPoint = targetPoint.clone();
        targetPoint.inVector = link.prop('target/inVector');

        var i;
        var points = [sourcePoint].concat(vertices).concat([targetPoint]);
        var controlPoints = g.bezier.getCurveControlPoints(points);
        for (i = 0, n = points.length; i < n; i++) {
            var point = points[i];
            // does not apply for target point
            if (point.outVector && (i < n - 1)) {
                controlPoints[0][i] = new g.Point(point).offset(point.outVector);
            }
            // does not apply for source point
            if (point.inVector && (i > 0)) {
                controlPoints[1][i - 1] = new g.Point(point).offset(point.inVector);
            }
        }

        d = ['M', points[0].x, points[0].y];

        for (i = 0; i < controlPoints[0].length; i++) {
            d.push('C', controlPoints[0][i].x, controlPoints[0][i].y, controlPoints[1][i].x, controlPoints[1][i].y, points[i + 1].x, points[i + 1].y);
        }

    } else {
        // if we have no vertices use a default cubic bezier curve, cubic bezier requires
        // two control points. The two control points are both defined with X as mid way
        // between the source and target points. SourceControlPoint Y is equal to sourcePoint Y
        // and targetControlPointY being equal to targetPointY.
        var controlPointX = (sourcePoint.x + targetPoint.x) / 2;

        d = [
            'M', sourcePoint.x, sourcePoint.y,
            'C', controlPointX, sourcePoint.y, controlPointX, targetPoint.y,
            targetPoint.x, targetPoint.y
        ];
    }

    return d.join(' ');
};

joint.routers.trim = function(vertices, opt, linkView) {
    var sourceBBox = linkView.sourceBBox;
    var targetBBox = linkView.targetBBox;
    var route = joint.util.toArray(vertices);
    while (route.length > 0 && sourceBBox.containsPoint(route[0])) {
        route.splice(0, 1);
    }
    while (route.length > 0 && targetBBox.containsPoint(route[route.length - 1])) {
        route.splice(-1, 1);
    }
    return route;
};

joint.connectors.trim = function(source, target, route, opt, linkView) {
    var sourceBBox = linkView.sourceBBox;
    var targetBBox = linkView.targetBBox;
    var trimRoute = joint.util.toArray(route);
    while (route.length > 0 && sourceBBox.containsPoint(trimRoute[0])) {
        trimRoute.splice(0, 1);
    }
    while (route.length > 0 && targetBBox.containsPoint(trimRoute[trimRoute.length - 1])) {
        trimRoute.splice(-1, 1);
    }
    return joint.connectors.normal(source, target, trimRoute);
};

(function(joint, util) {

    function isPercentage(val) {
        return util.isString(val) && val.slice(-1) === '%';
    }

    function bboxWrapper(method) {
        return function(bbox, refBBox, opt) {
            var anchor = bbox[method]();
            var dx = opt.dx;
            if (dx) {
                var dxPercentage = isPercentage(dx);
                dx = parseFloat(dx);
                if (isFinite(dx)) {
                    if (dxPercentage) {
                        dx /= 100;
                        dx *= bbox.width;
                    }
                    anchor.x += dx;
                }
            }
            var dy = opt.dy;
            if (dy) {
                var dyPercentage = isPercentage(dy);
                dy = parseFloat(dy);
                if (isFinite(dy)) {
                    if (dyPercentage) {
                        dy /= 100;
                        dy *= bbox.height;
                    }
                    anchor.y += dy;
                }
            }
            return anchor;
        }
    }

    joint.anchors = {
        center: bboxWrapper('center'),
        top: bboxWrapper('topMiddle'),
        bottom: bboxWrapper('bottomMiddle'),
        left: bboxWrapper('leftMiddle'),
        right: bboxWrapper('rightMiddle'),
        topLeft: bboxWrapper('origin'),
        topRight: bboxWrapper('topRight'),
        bottomLeft: bboxWrapper('bottomLeft'),
        bottomRight: bboxWrapper('corner'),
        perpendicular: function(bbox, refBBox, opt) {
            var anchor = bbox.center();
            var ref = refBBox.center();
            var topLeft = bbox.origin();
            var bottomRight = bbox.corner();
            var padding = opt.padding
            if (!isFinite(padding)) padding = 0;
            if ((topLeft.y + padding) <= ref.y && ref.y <= (bottomRight.y - padding)) {
                anchor.y = ref.y;
            } else if ((topLeft.x + padding) <= ref.x && ref.x <= (bottomRight.x - padding)) {
                anchor.x = ref.x;
            }
            return anchor;
        },
        midSide: function(bbox, refBBox, opt) {
            var padding = opt.padding;
            if (isFinite(padding)) bbox.inflate(padding);
            var side = bbox.sideNearestToPoint(refBBox.center());
            switch (side) {
                case 'left': return bbox.leftMiddle();
                case 'right': return bbox.rightMiddle();
                case 'top': return bbox.topMiddle();
                case 'bottom': return bbox.bottomMiddle();
            }
        },
        vertex: function(bbox, refBBox, opt) {
            if (bbox.containsPoint(refBBox.center())) {
                return refBBox.center();
            }
            return bbox.center();
        }
    }

})(joint, joint.util);

(function(joint, g) {

    joint.connectionPoints = {
        anchor: function(anchor) {
            return anchor.clone();
        },
        boundary: function(anchor, ref, bbox) {
            //return shape.intersectionWithLine(new g.Line(ref, anchor)) || anchor;
            var line = new g.Line(ref, anchor);
            var intersections = line.intersect(bbox);
            if (!intersections) return anchor;
            return intersections[0];
        },
        nearest: function(anchor, ref, bbox) {
            return bbox.pointNearestToPoint(ref);
        }
    };

})(joint, g);
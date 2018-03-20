(function(joint, util, g, V) {

    function closestIntersection(intersections, refPoint) {

        if (intersections.length === 1) return intersections[0];
        return util.sortBy(intersections, function(i) { return i.squaredDistance(refPoint) })[0];
    }

    // Connection Points

    function anchor(line) {
        return line.end;
    }

    function bboxIntersection(line, view, magnet) {

        var bbox = view.getNodeBBox(magnet);
        var intersections = line.intersect(bbox);
        if (!intersections) return line.end;
        return closestIntersection(intersections, line.start);
    }

    function rectangleIntersection(line, view, magnet) {

        var angle = view.model.angle();
        if (angle === 0) {
            return bboxIntersectio(line, view, magnet);
        }

        var bboxWORotation = view.getNodeUnrotatedBBox(magnet);
        var center = bboxWORotation.center();
        var lineWORotation = line.clone().rotate(center, angle);
        var intersections = lineWORotation.setLength(1e6).intersect(bboxWORotation);
        if (!intersections) return line.end;
        return closestIntersection(intersections, lineWORotation.start).rotate(center, -angle);
    }

    var BNDR_SUBDIVISIONS = 'segmentSubdivisons';
    var BNDR_SHAPE_BBOX = 'shapeBBox';

    function boundaryIntersection(line, view, magnet, opt) {

        var node, intersection;
        var selector = opt.selector;
        var anchor = line.end;

        if (typeof selector === 'string') {
            node = view.findBySelector(selector)[0];
        } else if (Array.isArray(selector)) {
            node = util.getByPath(magnet, selector);
        } else {
            // Find the closest non-group descendant
            node = magnet;
            while (node && node.tagName.toUpperCase() === 'G') node = node.firstChild;
        }

        if (!(node instanceof Element)) return anhor;

        var localShape = view.getNodeShape(node);
        var magnetMatrix = view.getNodeMatrix(node);
        var translateMatrix = view.getRootTranslateMatrix();
        var rotateMatrix = view.getRootRotateMatrix();
        var targetMatrix = translateMatrix.multiply(rotateMatrix).multiply(magnetMatrix);
        var localMatrix = targetMatrix.inverse();
        var localLine = V.transformLine(line, localMatrix);
        var localRef = localLine.start.clone();
        var data = view.getNodeData(node);

        if (opt.insideout === false) {
            if (!data[BNDR_SHAPE_BBOX]) data[BNDR_SHAPE_BBOX] = localShape.bbox();
            var localBBox = data[BNDR_SHAPE_BBOX];
            if (localBBox.containsPoint(localRef)) return anchor;
        }

        // Caching segment subdivisions for paths
        var pathOpt
        if (localShape instanceof g.Path) {
            var precision = opt.precision || 2;
            if (!data[BNDR_SUBDIVISIONS]) data[BNDR_SUBDIVISIONS] = localShape.getSegmentSubdivisions({ precision: precision });
            segmentSubdivisions = data[BNDR_SUBDIVISIONS];
            pathOpt = {
                precision: precision,
                segmentSubdivisions: data[BNDR_SUBDIVISIONS]
            }
        }

        if (opt.extrapolate === true) localLine.setLength(1e6);

        intersection = localLine.intersect(localShape, pathOpt);
        if (intersection) {
            // More than one intersection
            if (V.isArray(intersection)) intersection = closestIntersection(intersection, localRef);
        } else if (opt.sticky === true) {
            // No intersection, find the closest point instead
            if (localShape instanceof g.Rect) {
                intersection = localShape.pointNearestToPoint(localRef);
            } else if (localShape instanceof g.Ellipse) {
                intersection = localShape.intersectionWithLineFromCenterToPoint(localRef);
            } else {
                intersection = localShape.closestPoint(localRef, pathOpt);
            }
        }

        if (!intersection) return anchor;
        return V.transformPoint(intersection, targetMatrix);
    }

    joint.connectionPoints = {

        anchor: anchor,
        bbox: bboxIntersection,
        rectangle: rectangleIntersection,
        boundary: boundaryIntersection
    }

})(joint, joint.util, g, V);

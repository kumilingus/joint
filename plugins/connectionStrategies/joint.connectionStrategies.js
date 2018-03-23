(function(joint) {

    function abs2rel(value, max) {
        if (max === 0) return '0%';
        return Math.round(value / max * 100) + '%';
    }

    function pin(relative) {
        return function(end, view, magnet, coords) {
            var angle = view.model.angle();
            var bbox = view.getNodeUnrotatedBBox(magnet);
            var center = bbox.center();
            coords.rotate(center, angle);
            var dx = coords.x - bbox.x;
            var dy = coords.y - bbox.y;
            if (relative) {
                dx = abs2rel(dx, bbox.width);
                dy = abs2rel(dy, bbox.width);
            }
            end.anchor = {
                name: 'topLeft',
                args: {
                    dx: dx,
                    dy: dy,
                    rotate: true
                }
            };
            return end;
        }
    }

    joint.connectionStrategies = {
        pinAbsolute: pin(false),
        pinRelative: pin(true)
    }

})(joint)

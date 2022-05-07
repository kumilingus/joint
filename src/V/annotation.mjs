import { isObject, isArray } from './lang.mjs';

// Shift all the text annotations after character `index` by `offset` positions.
export function shiftAnnotations(annotations, index, offset) {
    if (isArray(annotations)) {
        annotations.forEach((annotation) => {
            const { start, end } = annotation;
            if (start < index && end >= index) {
                annotation.end += offset;
            } else if (start >= index) {
                annotation.start += offset;
                annotation.end += offset;
            }
        });
    }
    return annotations;
}

export function findAnnotationsAtIndex(annotations, index) {
    const found = [];
    if (isArray(annotations)) {
        annotations.forEach((annotation) => {
            const { start, end } = annotation;
            if (start < index && index <= end) {
                found.push(annotation);
            }
        });
    }
    return found;
}

export function findAnnotationsBetweenIndexes(annotations, start, end) {
    const found = [];
    if (isArray(annotations)) {
        annotations.forEach((annotation) => {
            const { start: s, end: e } = annotation;
            if ((start >= s && start < e) || (end > s && end <= e) || (s >= start && e < end)) {
                found.push(annotation);
            }
        });
    }
    return found;
}

export function annotateString(t, annotations, opt) {
    annotations = annotations || [];
    opt = opt || {};
    var offset = opt.offset || 0;
    var compacted = [];
    var batch;
    var ret = [];
    var item;
    var prev;
    for (var i = 0; i < t.length; i++) {
        item = ret[i] = t[i];
        for (var j = 0; j < annotations.length; j++) {
            var annotation = annotations[j];
            var start = annotation.start + offset;
            var end = annotation.end + offset;
            if (i >= start && i < end) {
                // Annotation applies.
                if (isObject(item)) {
                    // There is more than one annotation to be applied => Merge attributes.
                    item.attrs = mergeAttrs(mergeAttrs({}, item.attrs), annotation.attrs);
                } else {
                    item = ret[i] = { t: t[i], attrs: annotation.attrs };
                }
                if (opt.includeAnnotationIndices) {
                    (item.annotations || (item.annotations = [])).push(j);
                }
            }
        }
        prev = ret[i - 1];
        if (!prev) {
            batch = item;
        } else if (isObject(item) && isObject(prev)) {
            // Both previous item and the current one are annotations. If the attributes
            // didn't change, merge the text.
            if (JSON.stringify(item.attrs) === JSON.stringify(prev.attrs)) {
                batch.t += item.t;
            } else {
                compacted.push(batch);
                batch = item;
            }
        } else if (isObject(item)) {
            // Previous item was a string, current item is an annotation.
            compacted.push(batch);
            batch = item;
        } else if (isObject(prev)) {
            // Previous item was an annotation, current item is a string.
            compacted.push(batch);
            batch = item;
        } else {
            // Both previous and current item are strings.
            batch = (batch || '') + item;
        }
    }
    if (batch) {
        compacted.push(batch);
    }
    return compacted;
}

// Merge attributes from object `b` with attributes in object `a`.
// Note that this modifies the object `a`.
// Also important to note that attributes are merged but CSS classes are concatenated.
export function mergeAttrs(a, b) {
    for (var attr in b) {
        if (attr === 'class') {
            // Concatenate classes.
            a[attr] = a[attr] ? a[attr] + ' ' + b[attr] : b[attr];
        } else if (attr === 'style') {
            // `style` attribute can be an object.
            if (isObject(a[attr]) && isObject(b[attr])) {
                // `style` stored in `a` is an object.
                a[attr] = mergeAttrs(a[attr], b[attr]);
            } else if (isObject(a[attr])) {
                // `style` in `a` is an object but it's a string in `b`.
                // Convert the style represented as a string to an object in `b`.
                a[attr] = mergeAttrs(a[attr], styleToObject(b[attr]));
            } else if (isObject(b[attr])) {
                // `style` in `a` is a string, in `b` it's an object.
                a[attr] = mergeAttrs(styleToObject(a[attr]), b[attr]);
            } else {
                // Both styles are strings.
                a[attr] = mergeAttrs(styleToObject(a[attr]), styleToObject(b[attr]));
            }
        } else {
            a[attr] = b[attr];
        }
    }
    return a;
}

// Convert a style represented as string (e.g. `'fill="blue"; stroke="red"'`) to
// an object (`{ fill: 'blue', stroke: 'red' }`).
export function styleToObject(styleString) {
    var ret = {};
    var styles = styleString.split(';');
    for (var i = 0; i < styles.length; i++) {
        var style = styles[i];
        var pair = style.split('=');
        ret[pair[0].trim()] = pair[1].trim();
    }
    return ret;
}

import {
    annotateString,
    findAnnotationsBetweenIndexes,
} from './annotation.mjs';

import {
    isArray,
    isObject,
} from './lang.mjs';

// Replace all spaces with the Unicode No-break space (http://www.fileformat.info/info/unicode/char/a0/index.htm).
// IE would otherwise collapse all spaces into one. This is used in the text() method but it is
// also exposed so that the programmer can use it in case he needs to. This is useful e.g. in tests
// when you want to compare the actual DOM text content without having to add the unicode character in
// the place of all spaces.
export function sanitizeText(text) {
    return (text || '').replace(/ /g, '\u00A0');
}

// TODO: Passing `V` as a parameter should be avoided.
// Instead, a constructor function should be exposed via a separate module.
export function createTextContentNodes(vel, content, opt, V) {

    // Replace all spaces with the Unicode No-break space (http://www.fileformat.info/info/unicode/char/a0/index.htm).
    // IE would otherwise collapse all spaces into one.
    content = sanitizeText(content);
    opt || (opt = {});
    // Should we allow the text to be selected?
    var displayEmpty = opt.displayEmpty;
    // End of Line character
    var eol = opt.eol;
    // Text along path
    var textPath = opt.textPath;
    // Vertical shift
    var verticalAnchor = opt.textVerticalAnchor;
    var namedVerticalAnchor = (verticalAnchor === 'middle' || verticalAnchor === 'bottom' || verticalAnchor === 'top');
    // Horizontal shift applied to all the lines but the first.
    var x = opt.x;
    if (x === undefined) x = vel.attr('x') || 0;
    // Annotations
    var iai = opt.includeAnnotationIndices;
    var annotations = opt.annotations;
    if (annotations && !isArray(annotations)) annotations = [annotations];
    // Shift all the <tspan> but first by one line (`1em`)
    var defaultLineHeight = opt.lineHeight;
    var autoLineHeight = (defaultLineHeight === 'auto');
    var lineHeight = (autoLineHeight) ? '1.5em' : (defaultLineHeight || '1em');
    // Clearing the element
    vel.empty();
    vel.attr({
        // Preserve spaces. In other words, we do not want consecutive spaces to get collapsed to one.
        'xml:space': 'preserve',
        // An empty text gets rendered into the DOM in webkit-based browsers.
        // In order to unify this behaviour across all browsers
        // we rather hide the text element when it's empty.
        'display': (content || displayEmpty) ? null : 'none'
    });

    // Set default font-size if none
    var fontSize = parseFloat(vel.attr('font-size'));
    if (!fontSize) {
        fontSize = 16;
        if (namedVerticalAnchor || annotations) vel.attr('font-size', fontSize);
    }

    var doc = document;
    var containerNode;
    if (textPath) {
        // Now all the `<tspan>`s will be inside the `<textPath>`.
        if (typeof textPath === 'string') textPath = { d: textPath };
        containerNode = createTextPathNode(textPath, this, V);
    } else {
        containerNode = doc.createDocumentFragment();
    }
    var offset = 0;
    var lines = content.split('\n');
    var linesMetrics = [];
    var annotatedY;
    for (var i = 0, lastI = lines.length - 1; i <= lastI; i++) {
        var dy = lineHeight;
        var lineClassName = 'v-line';
        var lineNode = doc.createElementNS(V.namespace.svg, 'tspan');
        var line = lines[i];
        var lineMetrics;
        var lineAnnotations;
        if (line) {
            if (annotations) {
                // Find the *compacted* annotations for this line.
                lineAnnotations = annotateString(line, annotations, {
                    offset: -offset,
                    includeAnnotationIndices: iai
                });
                lineMetrics = annotateTextLine(lineNode, lineAnnotations, {
                    includeAnnotationIndices: iai,
                    eol: (i !== lastI && eol),
                    lineHeight: (autoLineHeight) ? null : lineHeight,
                    baseSize: fontSize
                }, V);
                // Get the line height based on the biggest font size in the annotations for this line.
                var iLineHeight = lineMetrics.lineHeight;
                if (iLineHeight && autoLineHeight && i !== 0) dy = iLineHeight;
                if (i === 0) annotatedY = lineMetrics.maxFontSize * 0.8;
            } else {
                if (eol && i !== lastI) line += eol;
                lineNode.textContent = line;
            }
        } else {
            // Make sure the textContent is never empty. If it is, add a dummy
            // character and make it invisible, making the following lines correctly
            // relatively positioned. `dy=1em` won't work with empty lines otherwise.
            lineNode.textContent = '-';
            lineClassName += ' v-empty-line';
            // 'opacity' needs to be specified with fill, stroke. Opacity without specification
            // is not applied in Firefox
            var lineNodeStyle = lineNode.style;
            lineNodeStyle.fillOpacity = 0;
            lineNodeStyle.strokeOpacity = 0;
            if (annotations) {
                // Empty line with annotations.
                lineMetrics = {};
                lineAnnotations = findAnnotationsBetweenIndexes(annotations, offset, offset);
                var lineFontSize = lineAnnotations.reduce((maxFs, annotation) => {
                    // Check for max font size
                    var fs = parseFloat(annotation.attrs['font-size']);
                    return (!isFinite(fs)) ? maxFs : Math.max(maxFs, fs);
                }, -1);
                if (lineFontSize < 0) lineFontSize = fontSize;
                if (autoLineHeight) {
                    if (i > 0) {
                        dy = lineFontSize * 1.2;
                    } else {
                        annotatedY = lineFontSize * 0.8;
                    }
                }
                // The font size is important for the native selection box height.
                lineNode.setAttribute('font-size', lineFontSize);
                lineMetrics.maxFontSize = lineFontSize;
            }
        }
        if (lineMetrics) linesMetrics.push(lineMetrics);
        if (i > 0) lineNode.setAttribute('dy', dy);
        // Firefox requires 'x' to be set on the first line when inside a text path
        if (i > 0 || textPath) lineNode.setAttribute('x', x);
        lineNode.className.baseVal = lineClassName;
        containerNode.appendChild(lineNode);
        offset += line.length + 1;      // + 1 = newline character.
    }
    // Y Alignment calculation
    if (namedVerticalAnchor) {
        if (annotations) {
            dy = calculateDY(verticalAnchor, linesMetrics, fontSize, lineHeight);
        } else if (verticalAnchor === 'top') {
            // A shortcut for top alignment. It does not depend on font-size nor line-height
            dy = '0.8em';
        } else {
            var rh; // remaining height
            if (lastI > 0) {
                rh = parseFloat(lineHeight) || 1;
                rh *= lastI;
                if (!emRegex.test(lineHeight)) rh /= fontSize;
            } else {
                // Single-line text
                rh = 0;
            }
            switch (verticalAnchor) {
                case 'middle':
                    dy = (0.3 - (rh / 2)) + 'em';
                    break;
                case 'bottom':
                    dy = (-rh - 0.3) + 'em';
                    break;
            }
        }
    } else {
        if (verticalAnchor === 0) {
            dy = '0em';
        } else if (verticalAnchor) {
            dy = verticalAnchor;
        } else {
            // No vertical anchor is defined
            dy = 0;
            // Backwards compatibility - we change the `y` attribute instead of `dy`.
            if (vel.attr('y') === null) vel.attr('y', annotatedY || '0.8em');
        }
    }
    containerNode.firstChild.setAttribute('dy', dy);
    // Appending lines to the element.
    vel.append(containerNode);
}

// Text() helpers

function createTextPathNode(attrs, vel, V) {
    attrs || (attrs = {});
    var textPathElement = V('textPath');
    var d = attrs.d;
    if (d && attrs['xlink:href'] === undefined) {
        // If `opt.attrs` is a plain string, consider it to be directly the
        // SVG path data for the text to go along (this is a shortcut).
        // Otherwise if it is an object and contains the `d` property, then this is our path.
        // Wrap the text in the SVG <textPath> element that points
        // to a path defined by `opt.attrs` inside the `<defs>` element.
        var linkedPath = V('path').attr('d', d).appendTo(vel.defs());
        textPathElement.attr('xlink:href', '#' + linkedPath.id);
    }
    if (isObject(attrs)) {
        // Set attributes on the `<textPath>`. The most important one
        // is the `xlink:href` that points to our newly created `<path/>` element in `<defs/>`.
        // Note that we also allow the following construct:
        // `t.text('my text', { textPath: { 'xlink:href': '#my-other-path' } })`.
        // In other words, one can completely skip the auto-creation of the path
        // and use any other arbitrary path that is in the document.
        textPathElement.attr(attrs);
    }
    return textPathElement.node;
}

function annotateTextLine(lineNode, lineAnnotations, opt, V) {
    opt || (opt = {});
    var includeAnnotationIndices = opt.includeAnnotationIndices;
    var eol = opt.eol;
    var lineHeight = opt.lineHeight;
    var baseSize = opt.baseSize;
    var maxFontSize = 0;
    var fontMetrics = {};
    var lastJ = lineAnnotations.length - 1;
    for (var j = 0; j <= lastJ; j++) {
        var annotation = lineAnnotations[j];
        var fontSize = null;
        if (isObject(annotation)) {
            var annotationAttrs = annotation.attrs;
            var vTSpan = V('tspan', annotationAttrs);
            var tspanNode = vTSpan.node;
            var t = annotation.t;
            if (eol && j === lastJ) t += eol;
            tspanNode.textContent = t;
            // Per annotation className
            var annotationClass = annotationAttrs['class'];
            if (annotationClass) vTSpan.addClass(annotationClass);
            // If `opt.includeAnnotationIndices` is `true`,
            // set the list of indices of all the applied annotations
            // in the `annotations` attribute. This list is a comma
            // separated list of indices.
            if (includeAnnotationIndices) vTSpan.attr('annotations', annotation.annotations);
            // Check for max font size
            fontSize = parseFloat(annotationAttrs['font-size']);
            if (!isFinite(fontSize)) fontSize = baseSize;
            if (fontSize && fontSize > maxFontSize) maxFontSize = fontSize;
        } else {
            if (eol && j === lastJ) annotation += eol;
            tspanNode = document.createTextNode(annotation || ' ');
            if (baseSize && baseSize > maxFontSize) maxFontSize = baseSize;
        }
        lineNode.appendChild(tspanNode);
    }

    if (maxFontSize) fontMetrics.maxFontSize = maxFontSize;
    if (lineHeight) {
        fontMetrics.lineHeight = lineHeight;
    } else if (maxFontSize) {
        fontMetrics.lineHeight = (maxFontSize * 1.2);
    }
    return fontMetrics;
}

var emRegex = /em$/;

function convertEmToPx(em, fontSize) {
    var numerical = parseFloat(em);
    if (emRegex.test(em)) return numerical * fontSize;
    return numerical;
}

function calculateDY(alignment, linesMetrics, baseSizePx, lineHeight) {
    if (!isArray(linesMetrics)) return 0;
    var n = linesMetrics.length;
    if (!n) return 0;
    var lineMetrics = linesMetrics[0];
    var flMaxFont = convertEmToPx(lineMetrics.maxFontSize, baseSizePx) || baseSizePx;
    var rLineHeights = 0;
    var lineHeightPx = convertEmToPx(lineHeight, baseSizePx);
    for (var i = 1; i < n; i++) {
        lineMetrics = linesMetrics[i];
        var iLineHeight = convertEmToPx(lineMetrics.lineHeight, baseSizePx) || lineHeightPx;
        rLineHeights += iLineHeight;
    }
    var llMaxFont = convertEmToPx(lineMetrics.maxFontSize, baseSizePx) || baseSizePx;
    var dy;
    switch (alignment) {
        case 'middle':
            dy = (flMaxFont / 2) - (0.15 * llMaxFont) - (rLineHeights / 2);
            break;
        case 'bottom':
            dy = -(0.25 * llMaxFont) - rLineHeights;
            break;
        default:
        case 'top':
            dy = (0.8 * flMaxFont);
            break;
    }
    return dy;
}

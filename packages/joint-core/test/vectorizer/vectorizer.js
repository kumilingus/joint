'use strict';

QUnit.module('vectorizer', function(hooks) {

    var fixture = document.createElement('div');
    fixture.id = 'qunit-fixture';

    var svgContainer;
    var svgPath;
    var svgGroup;
    var svgCircle;
    var svgEllipse;
    var svgPolygon;
    var svgText;
    var svgRectangle;
    var svgGroup1;
    var svgGroup2;
    var svgGroup3;
    var svgPath2;
    var svgPath3;
    var svgLinearGradient;

    var childrenTagNames = function(vel) {
        var tagNames = [];
        Array.prototype.slice.call(vel.node.childNodes).forEach(function(childNode) {
            tagNames.push(childNode.tagName.toLowerCase());
        });
        return tagNames;
    };

    hooks.beforeEach(function() {

        var svgContent = '<path id="svg-path" d="M10 10"/>' +
                '<!-- comment -->' +
                '<g id="svg-group">' +
                    '<ellipse id="svg-ellipse" x="10" y="10" rx="30" ry="30"/>' +
                    '<circle id="svg-circle" cx="10" cy="10" r="2" fill="red"/>' +
                '</g>' +
                '<polygon id="svg-polygon" points="200,10 250,190 160,210"/>' +
                '<text id="svg-text" x="0" y="15" fill="red">Test</text>' +
                '<rect id="svg-rectangle" x="100" y="100" width="50" height="100"/>' +
                '<g id="svg-group-1" class="group-1">' +
                    '<g id="svg-group-2" class="group-2">' +
                        '<g id="svg-group-3" class="group3">' +
                            '<path id="svg-path-2" d="M 100 100 C 100 100 0 150 100 200 Z"/>' +
                        '</g>' +
                    '</g>' +
                '</g>' +
                '<path id="svg-path-3"/>' +
                '<linearGradient id= "svg-linear-gradient"><stop/></linearGradient>';

        document.body.appendChild(fixture);
        fixture.appendChild(V('svg', { id: 'svg-container' }, V(svgContent)).node);

        svgContainer = document.getElementById('svg-container');
        svgPath = document.getElementById('svg-path');
        svgGroup = document.getElementById('svg-group');
        svgCircle = document.getElementById('svg-circle');
        svgEllipse = document.getElementById('svg-ellipse');
        svgPolygon = document.getElementById('svg-polygon');
        svgText = document.getElementById('svg-text');
        svgRectangle = document.getElementById('svg-rectangle');
        svgGroup1 = document.getElementById('svg-group-1');
        svgGroup2 = document.getElementById('svg-group-2');
        svgGroup3 = document.getElementById('svg-group-3');
        svgPath2 = document.getElementById('svg-path-2');
        svgPath3 = document.getElementById('svg-path-3');
        svgLinearGradient = document.getElementById('svg-linear-gradient');
    });

    function serializeNode(node) {

        return (new XMLSerializer()).serializeToString(node);
    }

    QUnit.test('constructor', function(assert) {

        var vRect = V('rect');

        assert.ok(V.isVElement(vRect), 'Constructor produces a vectorizer element, when a string was provided.');
        assert.ok(vRect.node instanceof SVGRectElement, 'The vectorizer element has the attribute "node" that references to an SVGElement.');
        assert.ok(V.isVElement(V(vRect)), 'Constructor produces a vectorizer element, when a vectorizer element was provided.');
        assert.ok(V(vRect).node instanceof SVGRectElement, 'The vectorizer element has again the attribute "node" that references to an SVGElement.');

        var vRect2 = V(' rect ');
        assert.ok(V.isVElement(vRect2));
        assert.ok(vRect2.node instanceof SVGRectElement);

        var vSVG = V('\n svg ');
        assert.ok(V.isVElement(vSVG));
        assert.ok(vSVG.node instanceof SVGSVGElement);
    });

    QUnit.test('id', function(assert) {
        var vRect = V('rect');
        assert.ok(vRect.id);
        assert.equal(vRect.id, vRect.node.id);
        vRect.id = 'newid';
        assert.equal(vRect.node.id, 'newid');
    });

    QUnit.test('V(\'<invalid markup>\')', function(assert) {

        var error;

        try {
            V('<invalid markup>');
        } catch (e) {
            error = e;
        }

        assert.ok(typeof error !== 'undefined', 'Should throw an error when given invalid markup.');
    });

    QUnit.test('V(\'<valid markup>\')', function(assert) {

        var error;

        try {
            V('<rect width="100%" height="100%" fill="red" />');
        } catch (e) {
            error = e;
        }

        assert.ok(typeof error === 'undefined', 'Should not throw an error when given valid markup.');
    });

    QUnit.test('V.ensureId()', function(assert) {
        var node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        assert.notOk(node.id);
        var id = V.ensureId(node);
        assert.ok(id);
        assert.equal(id, node.id);
        assert.equal(id, V.ensureId(node));
        assert.equal(id, node.id);
    });

    QUnit.test('V.isSVGGraphicsElement()', function(assert) {
        assert.ok(V.isSVGGraphicsElement(svgCircle));
        assert.ok(V.isSVGGraphicsElement(V('circle', { class: 'not-in-dom' })));
        assert.ok(V.isSVGGraphicsElement(svgGroup));
        assert.notOk(V.isSVGGraphicsElement());
        assert.notOk(V.isSVGGraphicsElement(svgLinearGradient));
    });

    QUnit.test('V.attributeNames', function(assert) {
        // kebab-case
        assert.equal(V.attributeNames['stroke-width'], 'stroke-width');
        assert.equal(V.attributeNames['strokeWidth'], 'stroke-width');
        assert.equal(V.attributeNames['stroke'], 'stroke');
        // camel-case
        assert.equal(V.attributeNames['pathLength'], 'pathLength');
        // custom
        assert.equal(V.attributeNames['custom-attribute'], 'custom-attribute');
        assert.equal(V.attributeNames['customAttribute'], 'custom-attribute');
        const g1 = V('g').attr('customAttribute', 'value');
        assert.equal(g1.attr('customAttribute'), 'value');
        assert.equal(g1.node.getAttribute('custom-attribute'), 'value');
        assert.equal(g1.node.getAttribute('customAttribute'), null);
        // custom override
        V.attributeNames['customAttribute'] = 'customAttribute';
        assert.equal(V.attributeNames['custom-attribute'], 'custom-attribute');
        assert.equal(V.attributeNames['customAttribute'], 'customAttribute');
        const g2 = V('g').attr('customAttribute', 'value');
        assert.equal(g2.attr('customAttribute'), 'value');
        assert.equal(g2.node.getAttribute('customAttribute'), 'value');
        assert.equal(g2.node.getAttribute('custom-attribute'), null);
    });

    QUnit.test('index()', function(assert) {

        // svg container
        assert.equal(V(svgContainer).index(), 0, 'SVG container contains 5 various nodes and 1 comment. Container itself has index 0.');
        // nodes in an svg container
        assert.equal(V(svgPath).index(), 0, 'The first node has index 0.');
        assert.equal(V(svgGroup).index(), 1, 'The second node has index 1.');
        assert.equal(V(svgPolygon).index(), 2, 'The third node has index 2.');
        assert.equal(V(svgText).index(), 3, 'The fourth node has index 3.');
        assert.equal(V(svgRectangle).index(), 4, 'The fifth node has index 4.');
        // nodes in a group
        assert.equal(V(svgEllipse).index(), 0, 'The first node in the group has index 0.');
        assert.equal(V(svgCircle).index(), 1, 'The second node in the group has index 1.');
    });

    QUnit.module('tagName()', function() {

        QUnit.test('sanity', function(assert) {

            assert.equal(typeof V(svgContainer).tagName(), 'string');
            assert.equal(typeof V(svgPath).tagName(), 'string');
            assert.equal(typeof V(svgGroup).tagName(), 'string');
            assert.equal(typeof V(svgCircle).tagName(), 'string');
            assert.equal(typeof V(svgEllipse).tagName(), 'string');
            assert.equal(typeof V(svgPolygon).tagName(), 'string');
            assert.equal(typeof V(svgText).tagName(), 'string');
            assert.equal(typeof V(svgRectangle).tagName(), 'string');
            assert.equal(typeof V(svgGroup1).tagName(), 'string');
            assert.equal(typeof V(svgGroup2).tagName(), 'string');
            assert.equal(typeof V(svgGroup3).tagName(), 'string');
            assert.equal(typeof V(svgPath2).tagName(), 'string');
            assert.equal(typeof V(svgPath3).tagName(), 'string');
        });

        QUnit.test('correctness', function(assert) {

            assert.equal(V(svgContainer).tagName(), 'SVG');
            assert.equal(V(svgPath).tagName(), 'PATH');
            assert.equal(V(svgGroup).tagName(), 'G');
            assert.equal(V(svgCircle).tagName(), 'CIRCLE');
            assert.equal(V(svgEllipse).tagName(), 'ELLIPSE');
            assert.equal(V(svgPolygon).tagName(), 'POLYGON');
            assert.equal(V(svgText).tagName(), 'TEXT');
            assert.equal(V(svgRectangle).tagName(), 'RECT');
            assert.equal(V(svgGroup1).tagName(), 'G');
            assert.equal(V(svgGroup2).tagName(), 'G');
            assert.equal(V(svgGroup3).tagName(), 'G');
            assert.equal(V(svgPath2).tagName(), 'PATH');
            assert.equal(V(svgPath3).tagName(), 'PATH');
        });
    });


    QUnit.module('text', function() {

        var getSvg = function() {
            var svg = V('svg');
            svg.attr('width', 600);
            svg.attr('height', 800);
            fixture.appendChild(svg.node);
            return svg;
        };

        QUnit.test('single line, styles, position', function(assert) {

            var svg = getSvg();
            var t = V('text', { x: 250, dy: 100, fill: 'black' });

            t.text('abc');

            assert.equal(t.node.childNodes.length, 1, 'There is only one child node which is a v-line node.');
            assert.equal(t.node.childNodes[0].childNodes.length, 1, 'There is only one child of that v-line node which is a text node.');
            assert.equal(serializeNode(t.node.childNodes[0].childNodes[0]), 'abc', 'Generated text is ok for a single line and no annotations.');
            assert.equal(t.attr('fill'), 'black', 'fill attribute set');
            assert.equal(t.attr('x'), '250', 'x attribute set');
            assert.equal(t.attr('dy'), '100', 'dy attribute set');

            svg.remove();
        });

        QUnit.test('multi-line and annotations', function(assert) {

            var svg = getSvg();
            var t = V('text', { x: 250, dy: 100, fill: 'black' });

            t.text('abc\ndef');

            assert.equal(t.node.childNodes.length, 2, 'There are two child nodes one for each line.');

            t.text('abcdefgh', {
                annotations: [
                    { start: 1, end: 3, attrs: { fill: 'red', stroke: 'orange' }},
                    { start: 2, end: 5, attrs: { fill: 'blue' }}
                ]
            });

            assert.equal(t.find('.v-line').length, 1, 'One .v-line element rendered');

            assert.equal(t.find('tspan').length, 4, '4 tspans rendered in total');

            t.text('abcd\nefgh', {
                annotations: [
                    { start: 1, end: 3, attrs: { fill: 'red', stroke: 'orange' }},
                    { start: 2, end: 5, attrs: { fill: 'blue' }}
                ]
            });

            assert.equal(t.find('.v-line').length, 2, 'Two .v-line elements rendered');
            assert.equal(t.find('tspan').length, 5, '5 tspans rendered in total');

            svg.remove();
        });

        QUnit.test('line height', function(assert) {

            var t = V('text', { 'font-size': 20 });
            var linesDy;
            var text = 'abcd\nefgh';
            var annotations = [
                { start: 0, end: 4, attrs: { fill: 'red' }},
                { start: 5, end: 9, attrs: { fill: 'blue' }}
            ];

            t.text(text, {
                lineHeight: '2.1em',
                annotations: annotations
            });

            linesDy = t.children().map(function(vTSpan) {
                return vTSpan.attr('dy');
            });
            assert.deepEqual(linesDy, ['0', '2.1em']); // hard-coded line-height

            t.text(text, {
                lineHeight: 'auto',
                annotations: annotations
            });

            linesDy = t.children().map(function(vTSpan) {
                return vTSpan.attr('dy');
            });
            assert.deepEqual(linesDy, ['0', '24']); // base font-size * 1.2

            t.text(text, {
                lineHeight: 'auto',
                annotations: [
                    { start: 0, end: 4, attrs: { fill: 'red' }},
                    { start: 5, end: 9, attrs: { fill: 'blue', 'font-size': 30 }}
                ]
            });

            linesDy = t.children().map(function(vTSpan) {
                return vTSpan.attr('dy');
            });
            assert.deepEqual(linesDy, ['0', '36']); // max font-size * 1.2
        });

        QUnit.test('empty line height', function(assert) {

            var fontSize = 20;
            var annotationFontSize = 30;

            var t = V('text', { 'font-size': fontSize });
            var text = '\na\n\nb\n\n';

            // Line Height 'Auto'
            function testLineHeightAuto(annotations) {

                t.text(text, {
                    lineHeight: 'auto',
                    annotations: annotations
                });

                var linesDy = t.children().map(function(vTSpan) {
                    return vTSpan.attr('dy');
                });

                assert.deepEqual(linesDy,  [
                    '0',
                    String(annotationFontSize * 1.2),
                    String(annotationFontSize * 1.2),
                    String(annotationFontSize * 1.2),
                    String(annotationFontSize * 1.2),
                    String(fontSize * 1.2),
                ]);

                var linesFontSize = t.children().map(function(vTSpan) {
                    return vTSpan.attr('font-size');
                });

                assert.deepEqual(linesFontSize,  [
                    String(annotationFontSize),
                    null,
                    String(annotationFontSize),
                    null,
                    String(annotationFontSize),
                    String(fontSize),
                ]);
            }

            testLineHeightAuto([
                { start:-1, end: 6, attrs: { 'font-size': annotationFontSize }},
            ]);

            testLineHeightAuto([
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize - 1 }},
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize }},
            ]);

            testLineHeightAuto([
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize + 1 }},
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize }},
            ]);

            testLineHeightAuto([
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize }},
                { start: -1, end: 6, attrs: { 'no-font-size': true }},
            ]);

            // Line Height '2em'
            function testLineHeight2em(annotations) {

                t.text(text, {
                    lineHeight: '2em',
                    annotations: annotations
                });

                var linesDy = t.children().map(function(vTSpan) {
                    return vTSpan.attr('dy');
                });

                assert.deepEqual(linesDy,  [
                    '0',
                    '2em',
                    '2em',
                    '2em',
                    '2em',
                    '2em',
                ]);

                var linesFontSize = t.children().map(function(vTSpan) {
                    return vTSpan.attr('font-size');
                });

                assert.deepEqual(linesFontSize,  [
                    String(annotationFontSize),
                    null,
                    String(annotationFontSize),
                    null,
                    String(annotationFontSize),
                    String(fontSize),
                ]);
            }

            testLineHeight2em([
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize }},
            ]);

            testLineHeight2em([
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize - 1 }},
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize }},
            ]);

            testLineHeight2em([
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize + 1 }},
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize }},
            ]);

            testLineHeight2em([
                { start: -1, end: 6, attrs: { 'font-size': annotationFontSize }},
                { start: -1, end: 6, attrs: { 'no-font-size': true }},
            ]);
        });

        QUnit.test('custom EOL', function(assert) {

            var svg = getSvg();
            var t = V('text', { x: 250, dy: 100, fill: 'black' });

            t.text('abc\ndef', { eol: 'X' });

            assert.equal(t.node.childNodes[0].textContent, 'abcX');
            assert.equal(t.node.childNodes[1].textContent, 'def');

            t.text('abc\ndef\n', { eol: 'X' });

            assert.equal(t.node.childNodes[0].textContent, 'abcX');
            assert.equal(t.node.childNodes[1].textContent, 'defX');
            svg.remove();
        });

        QUnit.test('includeAnnotationIndices', function(assert) {

            var svg = getSvg();
            var t = V('text', { x: 250, dy: 100, fill: 'black' });

            t.text('abcdefgh', {
                includeAnnotationIndices: true, annotations: [
                    { start: 1, end: 3, attrs: { fill: 'red', stroke: 'orange' }},
                    { start: 2, end: 5, attrs: { fill: 'blue' }}
                ]
            });
            assert.equal(V(t.find('tspan')[1]).attr('annotations'), '0', 'annotation indices added as an attribute');
            assert.equal(V(t.find('tspan')[2]).attr('annotations'), '0,1', 'annotation indices added as an attribute');
            assert.equal(V(t.find('tspan')[3]).attr('annotations'), '1', 'annotation indices added as an attribute');

            t.text('');
            assert.equal(t.attr('display'), 'none');
            t.text('text');
            assert.equal(t.attr('display'), null);

            svg.remove();
        });

        QUnit.test('visibility', function(assert) {

            var svg = getSvg();
            var t = V('text', { x: 250, dy: 100, fill: 'black' });

            t.text('');
            assert.equal(t.attr('display'), 'none');
            t.text('text');
            assert.equal(t.attr('display'), null);

            svg.remove();
        });

        QUnit.test('textVerticalAnchor', function(assert) {

            var texts = ['one', 'one\ntwo', 'one\ntwo\nthree'];
            var n = texts.length;
            var fontSize = 30;

            assert.expect(3 * n);

            var svg = getSvg();
            var t = V('text', { 'font-size': fontSize }).appendTo(svg);
            for (var i = 0; i < n; i++) {
                var text = texts[i];
                var bbox;
                // 'bottom'
                t.text(text, { textVerticalAnchor: 'bottom' });
                bbox = t.getBBox();
                assert.ok(Math.abs(bbox.corner().y) < (fontSize * 0.2), 'bottom anchor: ' + text);
                // 'top'
                t.text(text, { textVerticalAnchor: 'top' });
                bbox = t.getBBox();
                assert.ok(Math.abs(bbox.origin().y) < (fontSize * 0.2), 'top anchor: ' + text);
                // 'middle'
                t.text(text, { textVerticalAnchor: 'middle' });
                bbox = t.getBBox();
                assert.ok(Math.abs(bbox.center().y) < (fontSize * 0.2), 'middle anchor: ' + text);
            }
            svg.remove();
        });
    });

    QUnit.test('annotateString', function(assert) {

        var annotations = V.annotateString('This is a text that goes on multiple lines.', [
            { start: 2, end: 5, attrs: { fill: 'red' }},
            { start: 4, end: 8, attrs: { fill: 'blue' }}
        ]);

        assert.deepEqual(
            annotations,
            [
                'Th',
                { t: 'is', attrs: { fill: 'red' }},
                { t: ' is ', attrs: { fill: 'blue' }},
                'a text that goes on multiple lines.'
            ],
            'String cut into pieces and attributed according to the spans.'
        );

        annotations = V.annotateString('abcdefgh', [
            { start: 1, end: 3, attrs: { 'class': 'one' }},
            { start: 2, end: 5, attrs: { 'class': 'two', fill: 'blue' }}
        ]);

        assert.deepEqual(
            annotations,
            [
                'a',
                { t: 'b', attrs: { 'class': 'one' }},
                { t: 'c', attrs: { 'class': 'one two', fill: 'blue' }},
                { t: 'de', attrs: { 'class': 'two', fill: 'blue' }},
                'fgh'
            ],
            'String cut into pieces and attributed according to the annotations including concatenated classes.'
        );

        annotations = V.annotateString('abcdefgh', [
            { start: 1, end: 3, attrs: { 'class': 'one' }},
            { start: 2, end: 5, attrs: { 'class': 'two', fill: 'blue' }}
        ], { includeAnnotationIndices: true });

        assert.deepEqual(
            annotations,
            [
                'a',
                { t: 'b', attrs: { 'class': 'one' }, annotations: [0] },
                { t: 'c', attrs: { 'class': 'one two', fill: 'blue' }, annotations: [0, 1] },
                { t: 'de', attrs: { 'class': 'two', fill: 'blue' }, annotations: [1] },
                'fgh'
            ],
            'annotation indices included'
        );
    });

    QUnit.test('styleToObject', function(assert) {

        assert.deepEqual(V.styleToObject('fill=red; stroke=blue'), { fill: 'red', stroke: 'blue' }, 'style string parsed properly');
    });

    QUnit.test('mergeAttrs', function(assert) {

        assert.deepEqual(
            V.mergeAttrs({ x: 5, y: 10, style: 'fill=red; stroke=blue' }, { y: 20, style: { stroke: 'orange' }}),
            { x: 5, y: 20, style: { fill: 'red', stroke: 'orange' }},
            'style string parsed properly'
        );
    });

    QUnit.test('find()', function(assert) {

        var found = V(svgContainer).find('circle');

        assert.ok(Array.isArray(found), 'The result should be an array.');
        assert.ok(found.length > 0, 'The array should not be empty.');
        assert.ok(found.reduce(function(memo, vel) { return memo && V.isVElement(vel); }, true), 'Items in the array should be wrapped in Vectorizer.');
    });

    QUnit.test('children()', function(assert) {

        var checkChildren = svgGroup.childNodes;
        assert.ok(checkChildren.length > 0, 'The checkChildren collection should not be empty.');
        assert.ok(checkChildren.length === 2, 'The checkChildren collection should have two elements.');

        var children = V(svgGroup).children();
        assert.ok(Array.isArray(children), 'The result should be an array.');
        assert.ok(children.length > 0, 'The array should not be empty.');
        assert.ok(children.length === 2, 'The array should have two elements.');
        assert.ok(children.reduce(function(memo, vel) { return memo && V.isVElement(vel); }, true), 'Items in the array should be wrapped in Vectorizer.');

        var textNode = document.createTextNode('Text node');
        svgGroup.appendChild(textNode);
        var comment = document.createComment('Comment');
        svgGroup.appendChild(comment);
        var attribute = document.createAttribute('Attribute');
        attribute.value = 'Hello World';
        svgGroup.setAttributeNode(attribute);

        var checkChildren2 = svgGroup.childNodes;
        assert.ok(checkChildren2.length > 0, 'The checkChildren2 collection should not be empty.');
        assert.ok(checkChildren2.length === 4, 'The checkChildren2 collection should have four child nodes.');
        var numElements = 0;
        for (var i = 0; i < checkChildren2.length; i++) {
            var currentChild = checkChildren2[i];
            if (currentChild.nodeType === 1) {
                numElements += 1;
            }
        }
        assert.ok(numElements === 2, 'The checkChildren2 collection should have two child elements.');

        var children2 = V(svgGroup).children();
        assert.ok(Array.isArray(children2), 'The result should be an array.');
        assert.ok(children2.length > 0, 'The array should not be empty.');
        assert.ok(children2.length === 2, 'The array should have two child elements.');
        assert.ok(children2.reduce(function(memo, vel) { return memo && V.isVElement(vel); }, true), 'Items in the array should be wrapped in Vectorizer.');

        var emptyChildren = V(svgCircle).children();
        assert.ok(Array.isArray(emptyChildren), 'The result should be an array.');
        assert.ok(emptyChildren.length === 0, 'The array should be empty.');
    });

    QUnit.test('V.transformPoint', function(assert) {

        var p = { x: 1, y: 2 };
        var t;
        var group = V('<g/>');

        V(svgContainer).append(group);

        t = V.transformPoint(p, group.node.getCTM());
        assert.deepEqual({ x: t.x, y: t.y }, { x: 1, y: 2 }, 'transform without transformation returns the point unchanged.');

        group.scale(2, 3);
        t = V.transformPoint(p, group.node.getCTM());
        assert.deepEqual({ x: t.x, y: t.y }, { x: 2, y: 6 }, 'transform with scale transformation returns correct point.');

        group.attr('transform', 'rotate(90)');
        t = V.transformPoint(p, group.node.getCTM());
        assert.deepEqual({ x: t.x, y: t.y }, { x: -2, y: 1 }, 'transform with rotate transformation returns correct point.');
    });

    QUnit.test('findParentByClass', function(assert) {

        assert.equal(
            V(svgGroup3).findParentByClass('group-1').node,
            svgGroup1,
            'parent exists'
        );
        assert.notOk(
            V(svgGroup3).findParentByClass('not-a-parent'),
            'parent does not exist'
        );
        assert.notOk(
            V(svgGroup3).findParentByClass('group-1', svgGroup2),
            'parent exists, terminator on the way down'
        );
        assert.equal(
            V(svgGroup3).findParentByClass('group-1', svgCircle).node,
            svgGroup1,
            'parent exists, terminator not on the way down'
        );
        assert.notOk(
            V(svgGroup3).findParentByClass('not-a-parent', svgCircle),
            'parent does not exist, terminator not on the way down'
        );
    });

    QUnit.test('contains()', function(assert) {

        assert.ok(V(svgContainer).contains(svgGroup1));
        assert.ok(V(svgGroup1).contains(svgGroup3));
        assert.ok(V(svgGroup1).contains(svgGroup2));
        assert.notOk(V(svgGroup3).contains(svgGroup1));
        assert.notOk(V(svgGroup2).contains(svgGroup1));
        assert.notOk(V(svgGroup1).contains(svgGroup1));
        assert.notOk(V(svgGroup1).contains(document));
    });

    QUnit.module('transform()', function(hooks) {

        var vel;

        hooks.beforeEach(function() {

            vel = V('rect').appendTo(svgContainer);
        });

        hooks.afterEach(function() {

            vel.remove();
        });

        QUnit.test('as a getter', function(assert) {

            assert.deepEqual(vel.transform(), V.createSVGMatrix({
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                e: 0,
                f: 0
            }));
        });

        QUnit.test('single transformation', function(assert) {

            vel.transform({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 });

            assert.deepEqual(vel.transform(), V.createSVGMatrix({
                a: 2,
                b: 0,
                c: 0,
                d: 2,
                e: 0,
                f: 0
            }));
        });

        QUnit.test('multiple transformations', function(assert) {

            vel.transform({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 });
            vel.transform({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 10 });

            assert.deepEqual(vel.transform(), V.createSVGMatrix({
                a: 2,
                b: 0,
                c: 0,
                d: 2,
                e: 20,
                f: 20
            }));
        });

        QUnit.test('as a getter (element not in the DOM)', function(assert) {

            vel.transform({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 });
            vel.transform({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 10 });
            vel.remove();

            assert.deepEqual(vel.transform(), V.createSVGMatrix({
                a: 2,
                b: 0,
                c: 0,
                d: 2,
                e: 20,
                f: 20
            }));
        });

        QUnit.test('opt to clear transformation list', function(assert) {

            vel.transform({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 });
            vel.transform({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 }, { absolute: true });

            vel.remove();

            assert.deepEqual(vel.transform(), V.createSVGMatrix({
                a: 1,
                b: 1,
                c: 1,
                d: 1,
                e: 1,
                f: 1
            }), 'should clean transformation list before applying 2nd transformation');
        });
    });

    QUnit.module('empty()', function(hooks) {

        var vel;

        hooks.beforeEach(function() {

            vel = V('g');
            V(svgContainer).append(vel);
        });

        hooks.afterEach(function() {

            vel.remove();
        });

        QUnit.test('should remove all child nodes', function(assert) {

            vel.append([
                V('rect'),
                V('polygon'),
                V('circle')
            ]);

            assert.equal(vel.node.childNodes.length, 3);
            vel.empty();
            assert.equal(vel.node.childNodes.length, 0);
        });
    });

    QUnit.module('attribute', function(hooks) {

        var svgToString = function(svg) {

            return new XMLSerializer().serializeToString(svg.node);
        };

        hooks.beforeEach(function() {

            this.svg = V('svg');
        });

        QUnit.module('set', function(hooks) {

            QUnit.test('no namespace', function(assert) {

                var element = V('a').attr('href', 'www.seznam.cz');
                this.svg.append(element);

                var text = svgToString(element);
                assert.equal(text.indexOf(':href'), -1, 'should find attr without namespace');
                assert.ok(text.indexOf('href') > 0, 'attr has been set');
                assert.ok(text.indexOf('href') > 0, 'attr values has been set');
            });

            QUnit.test('with namespace', function(assert) {

                var element = V('a').attr('xlink:href', 'www.seznam.cz');
                this.svg.append(element);

                var text = svgToString(this.svg);
                assert.ok(text.indexOf('xlink:href') > 0, 'message');
            });

            QUnit.test('value "null" removes attr', function(assert) {

                var element = V('a').attr('xlink:href', 'www.seznam.cz');
                this.svg.append(element);

                element.attr('xlink:href', null);

                var text = svgToString(this.svg);

                assert.ok(text.indexOf('xlink:href') === -1, 'attribute should be removed');
            });

            QUnit.test('special attr', function(assert) {

                var element = V('a').attr('id', 'x');
                this.svg.append(element);

                var text = svgToString(element);
                assert.ok(text.indexOf('id') > 0, 'id has been set');
            });
        });

        QUnit.module('camel case support', function(hooks) {

            hooks.before(function() {
                V.supportCamelCaseAttributes = true;
            });

            hooks.after(function() {
                V.supportCamelCaseAttributes = false;
            });

            QUnit.test('constructor', function(assert) {
                const vel = V('rect', { strokeWidth: 5 });
                assert.equal(vel.node.getAttribute('stroke-width'), 5);
            });

            QUnit.test('attr()', function(assert) {
                const vel = V('rect');
                vel.attr('strokeWidth', 5);
                assert.equal(vel.attr('strokeWidth'), 5);
                assert.equal(vel.attr('stroke-width'), 5);
                assert.equal(vel.node.getAttribute('stroke-width'), 5);
                vel.attr('stroke-width', 10);
                assert.equal(vel.attr('strokeWidth'), 10);
                assert.equal(vel.attr('stroke-width'), 10);
                assert.equal(vel.node.getAttribute('stroke-width'), 10);
                vel.attr('strokeWidth', null);
                assert.equal(vel.attr('strokeWidth'), null);
                assert.equal(vel.attr('stroke-width'), null);
                assert.equal(vel.node.getAttribute('stroke-width'), null);
            });

            QUnit.test('removeAttr()', function(assert) {
                const vel = V('rect');
                vel.attr('strokeWidth', 5);
                assert.equal(vel.node.getAttribute('stroke-width'), 5);
                vel.removeAttr('strokeWidth');
                assert.equal(vel.node.getAttribute('stroke-width'), null);
            });
        });

        QUnit.test('remove simple', function(assert) {

            var a = V('a').attr('href', 'www.seznam.cz');
            this.svg.append(a);
            a.removeAttr('href');

            var text = svgToString(this.svg);
            assert.equal(text.indexOf('href'), -1, 'should be deleted');
        });

        QUnit.test('try to remove non existing', function(assert) {

            var a = V('a').attr('href', 'www.seznam.cz');
            this.svg.append(a);
            a.removeAttr('blah');

            var text = svgToString(this.svg);
            assert.ok(text.indexOf('href') > 0, 'should not throw');
        });

        QUnit.test('remove with namespace', function(assert) {

            var a = V('a').attr('xlink:href', 'www.seznam.cz');
            this.svg.append(a);
            a.removeAttr('xlink:href');

            var text = svgToString(this.svg);
            assert.equal(text.indexOf('href'), -1, 'message');
            assert.equal(text.indexOf('seznam'), -1, 'message');
        });

        QUnit.test('remove with not known namespace', function(assert) {

            var a = V('a').attr('xxx:href', 'www.seznam.cz');
            this.svg.append(a);
            a.removeAttr('xxx:href');

            var text = svgToString(this.svg);
            assert.equal(text.indexOf('href'), -1, 'message');
            assert.equal(text.indexOf('seznam'), -1, 'message');
        });

        QUnit.test('apply remove attr', function(assert) {

            var element = V('a');
            this.svg.append(element);

            element.text();
            element.text('text');

            var text = svgToString(this.svg);
            assert.ok(text.indexOf('display="null"') === -1, 'attr display should be removed');
        });
    });

    QUnit.module('append()', function(hooks) {

        var groupElement;

        hooks.beforeEach(function() {
            groupElement = V(svgGroup).clone().empty();
        });

        QUnit.test('single element', function(assert) {

            groupElement.append(V('<rect/>'));
            assert.equal(groupElement.node.childNodes.length, 1);
            assert.deepEqual(childrenTagNames(groupElement), ['rect']);

            groupElement.append(V('<circle/>'));
            assert.equal(groupElement.node.childNodes.length, 2);
            assert.deepEqual(childrenTagNames(groupElement), ['rect', 'circle']);
        });

        QUnit.test('multiple elements', function(assert) {

            groupElement.append(V('<rect/><circle/>'));
            assert.equal(groupElement.node.childNodes.length, 2);
            assert.deepEqual(childrenTagNames(groupElement), ['rect', 'circle']);

            groupElement.append(V('<line/><polygon/>'));
            assert.equal(groupElement.node.childNodes.length, 4);
            assert.deepEqual(childrenTagNames(groupElement), ['rect', 'circle', 'line', 'polygon']);
        });
    });

    QUnit.module('appendTo()', function(hooks) {

        var groupNode;

        hooks.beforeEach(function() {
            groupNode = V(svgGroup).clone().empty().node;
        });

        QUnit.test('append vnode', function(assert) {

            var rect = V('<rect/>').appendTo(V(groupNode));
            assert.ok(V.isV(rect));
            assert.equal(rect.node.parentNode, groupNode);
            assert.equal(rect.node, groupNode.lastChild);
        });

        QUnit.test('append node', function(assert) {

            var rect = V('<rect/>').appendTo(groupNode);
            assert.ok(V.isV(rect));
            assert.equal(rect.node.parentNode, groupNode);
            assert.equal(rect.node, groupNode.lastChild);
        });
    });

    QUnit.module('prepend()', function(hooks) {

        var groupElement;

        hooks.beforeEach(function() {
            groupElement = V(svgGroup).clone().empty();
        });

        QUnit.test('single element', function(assert) {

            groupElement.prepend(V('<rect/>'));
            assert.equal(groupElement.node.childNodes.length, 1);
            assert.deepEqual(childrenTagNames(groupElement), ['rect']);

            groupElement.prepend(V('<circle/>'));
            assert.equal(groupElement.node.childNodes.length, 2);
            assert.deepEqual(childrenTagNames(groupElement), ['circle', 'rect']);
        });

        QUnit.test('multiple elements', function(assert) {

            groupElement.prepend(V('<rect/><circle/>'));
            assert.equal(groupElement.node.childNodes.length, 2);
            assert.deepEqual(childrenTagNames(groupElement), ['rect', 'circle']);

            groupElement.prepend(V('<line/><polygon/>'));
            assert.equal(groupElement.node.childNodes.length, 4);
            assert.deepEqual(childrenTagNames(groupElement), ['line', 'polygon', 'rect', 'circle']);
        });
    });

    QUnit.module('before()', function(hooks) {

        var groupElement, rectElement;

        hooks.beforeEach(function() {
            groupElement = V(svgGroup).clone().empty();
            rectElement = V(svgRectangle).clone().empty();
            groupElement.append(rectElement);
        });

        QUnit.test('single element', function(assert) {

            rectElement.before(V('<circle/>'));
            assert.equal(groupElement.node.childNodes.length, 2);
            assert.deepEqual(childrenTagNames(groupElement), ['circle', 'rect']);

            rectElement.before(V('<line/>'));
            assert.equal(groupElement.node.childNodes.length, 3);
            assert.deepEqual(childrenTagNames(groupElement), ['circle', 'line', 'rect']);
        });

        QUnit.test('multiple elements', function(assert) {

            rectElement.before(V('<ellipse/><circle/>'));
            assert.equal(groupElement.node.childNodes.length, 3);
            assert.deepEqual(childrenTagNames(groupElement), ['ellipse', 'circle', 'rect']);

            rectElement.before(V('<line/><polygon/>'));
            assert.equal(groupElement.node.childNodes.length, 5);
            assert.deepEqual(childrenTagNames(groupElement), ['ellipse', 'circle', 'line', 'polygon', 'rect']);
        });
    });

    QUnit.module('convertToPathData()', function(hooks) {

        // round all numbers in a path data string
        function roundPathData(pathData) {
            return pathData.split(' ').map(function(command) {
                var number = parseInt(command, 10);
                if (isNaN(number)) return command;
                return number.toFixed(0);
            }).join(' ');
        }

        QUnit.test('invalid', function(assert) {
            assert.throws(function() {
                var group = V('<group/>');
                V(group).convertToPathData();
            }, 'Exception thrown');
        });

        QUnit.test('<path>', function(assert) {
            var path = V('<path/>', { d: 'M 100 50 L 200 150' });
            assert.equal(path.convertToPathData(), 'M 100 50 L 200 150');
        });

        QUnit.test('<line>', function(assert) {
            var line = V('<line/>', { x1: 100, y1: 50, x2: 200, y2: 150 });
            assert.equal(line.convertToPathData(), 'M 100 50 L 200 150');
        });

        QUnit.test('<rect>', function(assert) {
            var rect = V('<rect/>', { x: 100, y: 50, width: 200, height: 150 });
            assert.equal(rect.convertToPathData(), 'M 100 50 H 300 V 200 H 100 V 50 Z');
        });

        QUnit.test('<rect rx ry/>', function(assert) {
            var rect = V('<rect/>', { x: 100, y: 50, width: 200, height: 150, rx: 200, ry: 200 });
            assert.equal(rect.convertToPathData(), 'M 100 125 v 0 a 100 75 0 0 0 100 75 h 0 a 100 75 0 0 0 100 -75 v 0 a 100 75 0 0 0 -100 -75 h 0 a 100 75 0 0 0 -100 75 Z');
        });

        QUnit.test('<circle>', function(assert) {
            var circle = V('<circle/>', { cx: 100, cy: 50, r: 50 });
            assert.equal(roundPathData(circle.convertToPathData()), 'M 100 0 C 127 0 150 22 150 50 C 150 77 127 100 100 100 C 72 100 50 77 50 50 C 50 22 72 0 100 0 Z');
        });

        QUnit.test('<ellipse>', function(assert) {
            var ellipse = V('<ellipse/>', { cx: 100, cy: 50, rx: 100, ry: 50 });
            assert.equal(roundPathData(ellipse.convertToPathData()), 'M 100 0 C 155 0 200 22 200 50 C 200 77 155 100 100 100 C 44 100 0 77 0 50 C 0 22 44 0 100 0 Z');
        });

        QUnit.test('<polygon>', function(assert) {
            var polygon = V('<polygon/>', { points: '200,10 250,190 160,210' });
            assert.equal(polygon.convertToPathData(), 'M 200 10 L250 190 L160 210 Z');
        });

        QUnit.test('<polyline>', function(assert) {
            var polyline = V('<polyline/>', { points: '100,10 200,10 150,110' });
            assert.equal(polyline.convertToPathData(), 'M 100 10 L200 10 L150 110');
        });

    });

    QUnit.module('transformStringToMatrix()', function(hooks) {

        var svgTestGroup;

        hooks.beforeEach(function() {
            svgTestGroup = V('g');
            V(svgContainer).append(svgTestGroup);
        });

        hooks.afterEach(function() {
            svgTestGroup.remove();
        });

        [
            '',
            'scale(2)',
            'scale(2,3)',
            'scale(2.5,3.1)',
            'translate(10, 10)',
            'translate(10,10)',
            'translate(10.2,11.6)',
            'rotate(10)',
            'rotate(10,100,100)',
            'skewX(40)',
            'skewY(60)',
            'scale(2,2) matrix(1 0 0 1 10 10)',
            'matrix(1 0 0 1 10 10) scale(2,2)',
            'rotate(10,100,100) matrix(1 0 0 1 10 10) scale(2,2) translate(10,20)'
        ].forEach(function(transformString) {
            QUnit.test(transformString, function(assert) {
                svgTestGroup.attr('transform', transformString);
                assert.deepEqual(V.transformStringToMatrix(transformString), svgTestGroup.node.getCTM());
            });
        });
    });

    QUnit.module('matrixToTransformString()', function() {

        QUnit.test('return correct transformation string', function(assert) {
            assert.equal(V.matrixToTransformString(), 'matrix(1,0,0,1,0,0)');
            assert.equal(V.matrixToTransformString({ a: 2, d: 2 }), 'matrix(2,0,0,2,0,0)');
            assert.equal(V.matrixToTransformString({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }), 'matrix(1,2,3,4,5,6)');
            assert.equal(V.matrixToTransformString(V.createSVGMatrix({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })), 'matrix(1,2,3,4,5,6)');
            assert.equal(V.matrixToTransformString({ a: 0, b: 1, c: 1, d: 0, e: 0, f: 0 }), 'matrix(0,1,1,0,0,0)');
        });
    });

    QUnit.module('matrixTo[Transformation]()', function() {

        function roundObject(obj) {
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    obj[i] = Math.round(obj[i]);
                }
            }
            return obj;
        }

        QUnit.test('Rotate', function(assert) {
            var angle;
            angle = V.matrixToRotate(V.createSVGMatrix().rotate(45));
            assert.deepEqual(roundObject(angle), { angle: 45 });
            angle = V.matrixToRotate(V.createSVGMatrix().translate(50,50).rotate(15));
            assert.deepEqual(roundObject(angle), { angle: 15 });
            angle = V.matrixToRotate(V.createSVGMatrix().translate(50,50).rotate(60).scale(2));
            assert.deepEqual(roundObject(angle), { angle: 60 });
            angle = V.matrixToRotate(V.createSVGMatrix().rotate(60).rotate(60));
            assert.deepEqual(roundObject(angle), { angle: 120 });
        });

        QUnit.test('Translate', function(assert) {
            var translate;
            translate = V.matrixToTranslate(V.createSVGMatrix().translate(10,20));
            assert.deepEqual(roundObject(translate), { tx: 10, ty: 20 });
            translate = V.matrixToTranslate(V.createSVGMatrix().translate(10,20).rotate(10,20).scale(2));
            assert.deepEqual(roundObject(translate), { tx: 10, ty: 20 });
            translate = V.matrixToTranslate(V.createSVGMatrix().translate(10,20).translate(30,40));
            assert.deepEqual(roundObject(translate), { tx: 40, ty: 60 });
        });

        QUnit.test('Scale', function(assert) {
            var scale;
            scale = V.matrixToScale(V.createSVGMatrix().scale(2));
            assert.deepEqual(roundObject(scale), { sx: 2, sy: 2 });
            scale = V.matrixToScale(V.createSVGMatrix().translate(15,15).scaleNonUniform(2,3).rotate(10,20));
            assert.deepEqual(roundObject(scale), { sx: 2, sy: 3 });
            scale = V.matrixToScale(V.createSVGMatrix().scale(2,2).scale(3,3));
            assert.deepEqual(roundObject(scale), { sx: 6, sy: 6 });
        });

    });

    QUnit.module('bbox()', function() {

        QUnit.test('sanity', function(assert) {
            assert.ok(V(svgCircle).bbox() instanceof g.Rect);
            assert.ok(V(svgCircle).bbox(true) instanceof g.Rect);
            assert.ok(V(svgCircle).bbox(false, svgGroup) instanceof g.Rect);
            assert.ok(V('circle', { class: 'not-in-dom' }).bbox() instanceof g.Rect);
        });
    });

    QUnit.module('getBBox()', function() {

        QUnit.test('sanity', function(assert) {
            assert.ok(V(svgCircle).getBBox() instanceof g.Rect);
            assert.ok(V(svgCircle).getBBox({}) instanceof g.Rect);
            assert.ok(V(svgCircle).getBBox({ recursive: true }) instanceof g.Rect);
            assert.ok(V(svgCircle).getBBox({ target: svgCircle }) instanceof g.Rect);
            assert.ok(V(svgCircle).getBBox({ target: svgCircle, recursive: true }) instanceof g.Rect);
            assert.ok(V(svgCircle).getBBox({ target: svgContainer }) instanceof g.Rect);
            assert.ok(V(svgCircle).getBBox({ target: svgContainer, recursive: true }) instanceof g.Rect);
            assert.ok(V('circle', { class: 'not-in-dom' }).getBBox() instanceof g.Rect);
            assert.ok(V('circle', { class: 'not-in-dom' }).getBBox({}) instanceof g.Rect);
            assert.ok(V('circle', { class: 'not-in-dom' }).getBBox({ recursive: true }) instanceof g.Rect);
            assert.ok(V('circle', { class: 'not-in-dom' }).getBBox({ target: svgCircle }) instanceof g.Rect);
            assert.ok(V('circle', { class: 'not-in-dom' }).getBBox({ target: svgCircle, recursive: true }) instanceof g.Rect);
            assert.ok(V('circle', { class: 'not-in-dom' }).getBBox({ target: svgContainer }) instanceof g.Rect);
            assert.ok(V('circle', { class: 'not-in-dom' }).getBBox({ target: svgContainer, recursive: true }) instanceof g.Rect);
            // Not an SVGGraphicsElement
            assert.ok(V(svgLinearGradient).getBBox({}) instanceof g.Rect);
            assert.ok(V(svgLinearGradient).getBBox({ target: svgContainer }) instanceof g.Rect);
            assert.ok(V(svgLinearGradient).getBBox({ target: svgCircle }) instanceof g.Rect);
        });

        QUnit.test('recursive', function(assert) {
            assert.equal(V(svgGroup3).getBBox({ recursive: true }).toString(), V(svgPath2).getBBox().toString());
            assert.equal(V(svgGroup3).getBBox({ recursive: true }).toString(), V(svgPath2).getBBox({ recursive: true }).toString());
            assert.equal(V(svgGroup3).getBBox({ target: svgGroup1, recursive: true }).toString(), V(svgPath2).getBBox({ target: svgGroup1 }).toString());
            assert.equal(V(svgGroup3).getBBox({ target: svgGroup1, recursive: true }).toString(), V(svgPath2).getBBox({ target: svgGroup1, recursive: true }).toString());
        });
    });

    QUnit.module('normalizePath()', function() {

        QUnit.test('sanity', function(assert) {

            assert.ok(V(svgPath).normalizePath() instanceof V);
            assert.ok(V(svgPath2).normalizePath() instanceof V);
            assert.ok(V(svgPath3).normalizePath() instanceof V);

            assert.ok(V(svgContainer).normalizePath() instanceof V);
            assert.ok(V(svgGroup).normalizePath() instanceof V);
            assert.ok(V(svgCircle).normalizePath() instanceof V);
            assert.ok(V(svgEllipse).normalizePath() instanceof V);
            assert.ok(V(svgPolygon).normalizePath() instanceof V);
            assert.ok(V(svgText).normalizePath() instanceof V);
            assert.ok(V(svgRectangle).normalizePath() instanceof V);
            assert.ok(V(svgGroup1).normalizePath() instanceof V);
            assert.ok(V(svgGroup2).normalizePath() instanceof V);
            assert.ok(V(svgGroup3).normalizePath() instanceof V);
        });

        QUnit.test('normalizations', function(assert) {

            assert.equal(V(svgPath).normalizePath().node.hasAttribute('d'), true);
            assert.equal(V(svgPath2).normalizePath().node.hasAttribute('d'), true);
            assert.equal(V(svgPath3).normalizePath().node.hasAttribute('d'), true);

            assert.equal(V(svgPath).normalizePath().attr('d'), 'M 10 10');
            assert.equal(V(svgPath2).normalizePath().attr('d'), 'M 100 100 C 100 100 0 150 100 200 Z');
            assert.equal(V(svgPath3).normalizePath().attr('d'), 'M 0 0');
        });

        QUnit.test('silent failures', function(assert) {

            assert.equal(V(svgContainer).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgGroup).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgCircle).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgEllipse).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgPolygon).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgText).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgRectangle).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgGroup1).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgGroup2).normalizePath().node.hasAttribute('d'), false);
            assert.equal(V(svgGroup3).normalizePath().node.hasAttribute('d'), false);
        });
    });

    QUnit.module('normalizePathData()', function() {

        QUnit.test('sanity', function(assert) {

            // normalizations
            assert.equal(typeof V.normalizePathData('M 10 10 H 20'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 V 20'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 20 C 10 10 25 10 25 20 S 40 30 40 20'), 'string');
            assert.equal(typeof V.normalizePathData('M 20 20 Q 40 0 60 20'), 'string');
            assert.equal(typeof V.normalizePathData('M 20 20 Q 40 0 60 20 T 100 20'), 'string');
            assert.equal(typeof V.normalizePathData('M 30 15 A 15 15 0 0 0 15 30'), 'string');

            assert.equal(typeof V.normalizePathData('m 10 10'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 m 10 10'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 l 10 10'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 c 0 10 10 10 10 0'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 z'), 'string');

            assert.equal(typeof V.normalizePathData('M 10 10 20 20'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 L 20 20 30 30'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 C 10 20 20 20 20 10 20 0 30 0 30 10'), 'string');

            // edge cases
            assert.equal(typeof V.normalizePathData('L 10 10'), 'string');
            assert.equal(typeof V.normalizePathData('C 0 10 10 10 10 0'), 'string');
            assert.equal(typeof V.normalizePathData('Z'), 'string');

            assert.equal(typeof V.normalizePathData('M 10 10 Z L 20 20'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 Z C 10 20 20 20 20 10'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 Z Z'), 'string');

            assert.equal(typeof V.normalizePathData(''), 'string');
            assert.equal(typeof V.normalizePathData('X'), 'string');

            assert.equal(typeof V.normalizePathData('M'), 'string');
            assert.equal(typeof V.normalizePathData('M 10'), 'string');
            assert.equal(typeof V.normalizePathData('M 10 10 20'), 'string');

            assert.equal(typeof V.normalizePathData('X M 10 10'), 'string');
            assert.equal(typeof V.normalizePathData('X M 10 10 X L 20 20'), 'string');
        });

        QUnit.test('normalizations', function(assert) {

            assert.equal(V.normalizePathData('M 10 10 H 20'), 'M 10 10 L 20 10');
            assert.equal(V.normalizePathData('M 10 10 V 20'), 'M 10 10 L 10 20');
            assert.equal(V.normalizePathData('M 10 20 C 10 10 25 10 25 20 S 40 30 40 20'), 'M 10 20 C 10 10 25 10 25 20 C 25 30 40 30 40 20');
            assert.equal(V.normalizePathData('M 20 20 Q 40 0 60 20'), 'M 20 20 C 33.33333333333333 6.666666666666666 46.666666666666664 6.666666666666666 60 20');
            assert.equal(V.normalizePathData('M 20 20 Q 40 0 60 20 T 100 20'), 'M 20 20 C 33.33333333333333 6.666666666666666 46.666666666666664 6.666666666666666 60 20 C 73.33333333333333 33.33333333333333 86.66666666666666 33.33333333333333 100 20');
            assert.equal(V.normalizePathData('M 30 15 A 15 15 0 0 0 15 30'), 'M 30 15 C 21.715728752538098 15.000000000000002 14.999999999999998 21.715728752538098 15 30');

            assert.equal(V.normalizePathData('m 10 10'), 'M 10 10');
            assert.equal(V.normalizePathData('M 10 10 m 10 10'), 'M 10 10 M 20 20');
            assert.equal(V.normalizePathData('M 10 10 l 10 10'), 'M 10 10 L 20 20');
            assert.equal(V.normalizePathData('M 10 10 c 0 10 10 10 10 0'), 'M 10 10 C 10 20 20 20 20 10');
            assert.equal(V.normalizePathData('M 10 10 z'), 'M 10 10 Z');

            assert.equal(V.normalizePathData('M 10 10 20 20'), 'M 10 10 L 20 20');
            assert.equal(V.normalizePathData('M 10 10 L 20 20 30 30'), 'M 10 10 L 20 20 L 30 30');
            assert.equal(V.normalizePathData('M 10 10 C 10 20 20 20 20 10 20 0 30 0 30 10'), 'M 10 10 C 10 20 20 20 20 10 C 20 0 30 0 30 10');
        });

        QUnit.test('edge cases', function(assert) {

            assert.equal(V.normalizePathData('L 10 10'), 'M 0 0 L 10 10');
            assert.equal(V.normalizePathData('C 10 20 20 20 20 10'), 'M 0 0 C 10 20 20 20 20 10');
            assert.equal(V.normalizePathData('Z'), 'M 0 0 Z');

            assert.equal(V.normalizePathData('M 10 10 Z L 20 20'), 'M 10 10 Z L 20 20');
            assert.equal(V.normalizePathData('M 10 10 Z C 10 20 20 20 20 10'), 'M 10 10 Z C 10 20 20 20 20 10');
            assert.equal(V.normalizePathData('M 10 10 Z Z'), 'M 10 10 Z Z');

            assert.equal(V.normalizePathData(''), 'M 0 0'); // empty string
            assert.equal(V.normalizePathData('X'), 'M 0 0'); // invalid command

            assert.equal(V.normalizePathData('M'), 'M 0 0'); // no arguments for a command that needs them
            assert.equal(V.normalizePathData('M 10'), 'M 0 0'); // too few arguments
            assert.equal(V.normalizePathData('M 10 10 20'), 'M 10 10'); // too many arguments

            assert.equal(V.normalizePathData('X M 10 10'), 'M 10 10'); // mixing invalid and valid commands
            assert.equal(V.normalizePathData('X M 10 10 X L 20 20'), 'M 10 10 L 20 20'); // invalid commands interspersed with valid commands

            assert.equal(V.normalizePathData('A 0 3 0 0 1 10 15'), 'M 0 0 L 10 15'); // 0 x radius
            assert.equal(V.normalizePathData('A 3 0 0 0 1 10 15'), 'M 0 0 L 10 15'); // 0 y radius
            assert.equal(V.normalizePathData('A 0 0 0 0 1 10 15'), 'M 0 0 L 10 15'); // 0 x and y radii

            assert.equal(V.normalizePathData('M 3 7 A 7 7 0 0 1 3 7'), 'M 3 7 C 3 7 3 7 3 7'); // arc corresponding to a single point

            // Make sure this does not throw an error because of recursion in a2c() exceeding the maximum stack size
            V.normalizePathData('M 0 0 A 1 1 0 1 0 -1 -1');
            V.normalizePathData('M 14.4 29.52 a .72 .72 0 1 0 -.72 -.72 A .72 .72 0 0 0 14.4 29.52Z');
        });

        QUnit.test('path segment reconstruction', function(assert) {
            var path1 = 'M 10 10';
            var normalizedPath1 = V.normalizePathData(path1);
            var reconstructedPath1 = g.Path(normalizedPath1).serialize();
            assert.equal(normalizedPath1, reconstructedPath1);

            var path2 = 'M 100 100 C 100 100 0 150 100 200 Z';
            var normalizedPath2 = V.normalizePathData(path2);
            var reconstructedPath2 = g.Path(normalizedPath2).serialize();
            assert.equal(normalizedPath2, reconstructedPath2);

            var path3 = 'M285.8,83V52.7h8.3v31c0,3.2-1,5.8-3,7.7c-2,1.9-4.4,2.8-7.2,2.8c-2.9,0-5.6-1.2-8.1-3.5l3.8-6.1c1.1,1.3,2.3,1.9,3.7,1.9c0.7,0,1.3-0.3,1.8-0.9C285.5,85,285.8,84.2,285.8,83z';
            var normalizedPath3 = V.normalizePathData(path3);
            var reconstructedPath3 = g.Path(normalizedPath3).serialize();
            assert.equal(normalizedPath3, reconstructedPath3);
        });
    });

    QUnit.module('parseTransformString', function() {

        QUnit.test('single value transformations, not the last one', function(assert) {

            var parsed = V.parseTransformString('scale(3) rotate(6) translate(9) xxx(11)');

            assert.deepEqual(parsed.scale, { sx: 3, sy: 3 });
            assert.deepEqual(parsed.rotate, { angle: 6, cx: undefined, cy: undefined });
            assert.deepEqual(parsed.translate, { tx: 9, ty: 0 });
        });
    });

    QUnit.module('createCDATASection', function() {

        QUnit.test('creates CDATASection with a content', function(assert) {

            var cdata1 = V.createCDATASection();
            assert.ok(cdata1 instanceof CDATASection);
            assert.equal(cdata1.textContent, '');

            var cdata2 = V.createCDATASection('data');
            assert.ok(cdata2 instanceof CDATASection);
            assert.equal(cdata2.textContent, 'data');
        });
    });

    QUnit.module('createSVGStyle', function() {

        QUnit.test('creates SVGStyleElement with CSS content', function(assert) {

            var s1 = V.createSVGStyle();
            assert.ok(s1 instanceof SVGStyleElement);
            assert.equal(s1.textContent, '');

            var stylesheet = 'rect { fill: red; }';
            var s2 = V.createSVGStyle(stylesheet);
            assert.ok(s2 instanceof SVGStyleElement);
            assert.equal(s2.textContent, stylesheet);
        });
    });

    QUnit.module('className', function() {

        QUnit.test('addClass()', function(assert) {
            var res;
            var rect = V('rect');
            res = rect.addClass();
            assert.ok(res === rect);
            assert.equal(rect.node.className.baseVal, '');
            res = rect.addClass('test1');
            assert.ok(res === rect);
            assert.equal(rect.node.className.baseVal, 'test1');
            rect.addClass('test1');
            assert.equal(rect.node.className.baseVal, 'test1');
            rect.addClass('test2');
            assert.equal(rect.node.className.baseVal, 'test1 test2');
            rect.addClass('test3 test4');
            assert.equal(rect.node.className.baseVal, 'test1 test2 test3 test4');
            rect.addClass(' test5 ');
            assert.equal(rect.node.className.baseVal, 'test1 test2 test3 test4 test5');
        });

        QUnit.test('removeClass()', function(assert) {
            var res;
            var rect = V('rect');
            res = rect.removeClass();
            assert.ok(res === rect);
            assert.equal(rect.node.className.baseVal, '');
            res = rect.removeClass('test1');
            assert.ok(res === rect);
            assert.equal(rect.node.className.baseVal, '');
            rect.addClass('test1 test2 test3 test4 test5');
            rect.removeClass('test2');
            assert.equal(rect.node.className.baseVal, 'test1 test3 test4 test5');
            rect.removeClass('test3 test4');
            assert.equal(rect.node.className.baseVal, 'test1 test5');
            rect.removeClass(' test5 ');
            assert.equal(rect.node.className.baseVal, 'test1');
        });

        QUnit.test('toggleClass()', function(assert) {
            var res;
            var rect = V('rect');
            res = rect.toggleClass();
            assert.ok(res === rect);
            assert.equal(rect.node.className.baseVal, '');
            res = rect.toggleClass('test1');
            assert.ok(res === rect);
            assert.equal(rect.node.className.baseVal, 'test1');
            rect.toggleClass('test1');
            assert.equal(rect.node.className.baseVal, '');
            rect.toggleClass('test1 test2');
            assert.equal(rect.node.className.baseVal, 'test1 test2');
            rect.toggleClass('test1 test2');
            assert.equal(rect.node.className.baseVal, '');
            rect.addClass('test1');
            rect.toggleClass('test1 test2');
            assert.equal(rect.node.className.baseVal, 'test2');
            rect.toggleClass('test1 test2');
            assert.equal(rect.node.className.baseVal, 'test1');
        });

        QUnit.test('hasClass()', function(assert) {
            var rect = V('rect');
            assert.equal(rect.hasClass(), false);
            assert.equal(rect.hasClass('test1'), false);
            rect.addClass('test1');
            assert.equal(rect.hasClass('test1'), true);
            assert.equal(rect.hasClass('test2'), false);
            rect.addClass('test2');
            assert.equal(rect.hasClass('test1'), true);
            assert.equal(rect.hasClass('test2'), true);
            assert.equal(rect.hasClass(' test1 '), true);
            assert.equal(rect.hasClass(' test3 '), false);
        });

    });

    QUnit.module('getTransformToElement()', function() {

        QUnit.test('options: safe', function(assert) {

            svgGroup1.setAttribute('transform', 'translate(10, 10)');
            svgGroup2.setAttribute('transform', 'scale(2, 2)');
            svgGroup3.setAttribute('transform', 'rotate(90)');

            // descendant to ancestor
            assert.deepEqual(
                V(svgPath2).getTransformToElement(svgGroup1, { safe: true }),
                V(svgPath2).getTransformToElement(svgGroup1)
            );

            // ancestor to descendant
            assert.deepEqual(
                V(svgGroup1).getTransformToElement(svgPath2, { safe: true }),
                V(svgGroup1).getTransformToElement(svgPath2)
            );

            // svg document and element
            assert.deepEqual(
                V(svgContainer).getTransformToElement(svgPath2, { safe: true }),
                V(svgContainer).getTransformToElement(svgPath2)
            );
            assert.deepEqual(
                V(svgPath2).getTransformToElement(svgContainer, { safe: true }),
                V(svgPath2).getTransformToElement(svgContainer)
            );

            // not related, same document
            assert.deepEqual(
                V(svgPath2).getTransformToElement(svgCircle, { safe: true }),
                V(svgPath2).getTransformToElement(svgCircle)
            );
            assert.deepEqual(
                V(svgCircle).getTransformToElement(svgPath2, { safe: true }),
                V(svgCircle).getTransformToElement(svgPath2)
            );

            // not related, different documents
            var svg1 = V('svg');
            assert.deepEqual(
                V(svgPath2).getTransformToElement(svg1.node, { safe: true }),
                V(svgPath2).getTransformToElement(svg1.node)
            );
            assert.deepEqual(
                V(svg1.node).getTransformToElement(svgPath2, { safe: true }),
                V(svg1.node).getTransformToElement(svgPath2)
            );

            // same element
            assert.deepEqual(
                V(svgPath2).getTransformToElement(svgPath2, { safe: true }),
                V(svgPath2).getTransformToElement(svgPath2)
            );
        });

        QUnit.test('offscreen results', function(assert) {

            // We need to build a new DOM tree to test this
            // because the DOM from the setup was already
            // appended to the document and even if we remove it
            // from the document, the browser will still
            // return the correct ScreenCTM (used in unsafe mode)

            const svgPath2 = V('path');
            const svgGroup1 = V('g');

            V('svg', {}, [
                V(svgGroup1, { id: 'svgGroup1', transform: 'rotate(45)' }, [
                    V('g', { id: 'svgGroup2', transform: 'scale(2, 2)' }, [
                        V('g', { id: 'svgGroup3', transform: 'translate(10, 10)' }, [
                            V('path', { id: 'svgPath1', d: 'M 10 10' }),
                            V(svgPath2, { id: 'svgPath2', d: 'M 20 20' })
                        ])
                    ])
                ])
            ]);

            // unsafe mode returns an identity matrix (no transform)
            assert.equal(V.matrixToTransformString(V(svgPath2).getTransformToElement(svgGroup1)), 'matrix(1,0,0,1,0,0)');
            // safe mode returns a matrix with the correct transform
            assert.equal(V.matrixToTransformString(V(svgPath2).getTransformToElement(svgGroup1, { safe: true })), 'matrix(2,0,0,2,20,20)');
        });

        QUnit.test('native getTransformToElement vs VElement getTransformToElement - translate', function(assert) {

            var container = V(svgContainer);
            var group = V('<g/>');
            var rect = V('<rect/>');
            var transformNativeResult = {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                e: -10,
                f: -10
            };

            container.append(group);
            container.append(rect);

            rect.translate(10, 10);

            var transformPoly = group.getTransformToElement(rect.node);
            var matrix = {
                a: transformPoly.a,
                b: transformPoly.b,
                c: transformPoly.c,
                d: transformPoly.d,
                e: transformPoly.e,
                f: transformPoly.f
            };
            assert.deepEqual(matrix, transformNativeResult);

            group.remove();
            rect.remove();
        });

        QUnit.test('native getTransformToElement vs VElement getTransformToElement - rotate', function(assert) {

            var container = V(svgContainer);
            var normalizeFloat = function(value) {
                var temp = value * 100;
                return temp > 0 ? Math.floor(temp) : Math.ceil(temp);
            };
            var group = V('<g/>');
            var rect = V('<rect/>');
            var transformNativeResult = {
                a: normalizeFloat(0.7071067811865476),
                b: normalizeFloat(-0.7071067811865475),
                c: normalizeFloat(0.7071067811865475),
                d: normalizeFloat(0.7071067811865476),
                e: normalizeFloat(-0),
                f: normalizeFloat(0)
            };

            container.append(group);
            container.append(rect);

            rect.rotate(45);

            var transformPoly = group.getTransformToElement(rect.node);
            var matrix = {
                a: normalizeFloat(transformPoly.a),
                b: normalizeFloat(transformPoly.b),
                c: normalizeFloat(transformPoly.c),
                d: normalizeFloat(transformPoly.d),
                e: normalizeFloat(transformPoly.e),
                f: normalizeFloat(transformPoly.f)
            };
            assert.deepEqual(matrix, transformNativeResult);

            group.remove();
            rect.remove();
        });


    });
});

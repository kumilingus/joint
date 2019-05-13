
// joint.dia.Cell base model.
// --------------------------

joint.dia.Cell = Backbone.Model.extend({

    // This is the same as Backbone.Model with the only difference that is uses joint.util.merge
    // instead of just _.extend. The reason is that we want to mixin attributes set in upper classes.
    constructor: function(attributes, options) {

        var defaults;
        var attrs = attributes || {};
        this.cid = joint.util.uniqueId('c');
        this.attributes = {};
        if (options && options.collection) this.collection = options.collection;
        if (options && options.parse) attrs = this.parse(attrs, options) || {};
        if ((defaults = joint.util.result(this, 'defaults'))) {
            //<custom code>
            // Replaced the call to _.defaults with joint.util.merge.
            attrs = joint.util.merge({}, defaults, attrs);
            //</custom code>
        }
        this.set(attrs, options);
        this.changed = {};
        this.initialize.apply(this, arguments);
    },

    translate: function(dx, dy, opt) {

        throw new Error('Must define a translate() method.');
    },

    toJSON: function() {

        var defaultAttrs = this.constructor.prototype.defaults.attrs || {};
        var attrs = this.attributes.attrs;
        var finalAttrs = {};

        // Loop through all the attributes and
        // omit the default attributes as they are implicitly reconstructable by the cell 'type'.
        joint.util.forIn(attrs, function(attr, selector) {

            var defaultAttr = defaultAttrs[selector];

            joint.util.forIn(attr, function(value, name) {

                // attr is mainly flat though it might have one more level (consider the `style` attribute).
                // Check if the `value` is object and if yes, go one level deep.
                if (joint.util.isObject(value) && !Array.isArray(value)) {

                    joint.util.forIn(value, function(value2, name2) {

                        if (!defaultAttr || !defaultAttr[name] || !joint.util.isEqual(defaultAttr[name][name2], value2)) {

                            finalAttrs[selector] = finalAttrs[selector] || {};
                            (finalAttrs[selector][name] || (finalAttrs[selector][name] = {}))[name2] = value2;
                        }
                    });

                } else if (!defaultAttr || !joint.util.isEqual(defaultAttr[name], value)) {
                    // `value` is not an object, default attribute for such a selector does not exist
                    // or it is different than the attribute value set on the model.

                    finalAttrs[selector] = finalAttrs[selector] || {};
                    finalAttrs[selector][name] = value;
                }
            });
        });

        var attributes = joint.util.cloneDeep(joint.util.omit(this.attributes, 'attrs'));
        attributes.attrs = finalAttrs;

        return attributes;
    },

    initialize: function(options) {

        if (!options || !options.id) {

            this.set('id', this.generateId(), { silent: true });
        }

        this._transitionIds = {};

        // Collect ports defined in `attrs` and keep collecting whenever `attrs` object changes.
        this.processPorts();
        this.on('change:attrs', this.processPorts, this);
    },

    generateId: function() {
        return joint.util.uuid();
    },

    /**
     * @deprecated
     */
    processPorts: function() {

        // Whenever `attrs` changes, we extract ports from the `attrs` object and store it
        // in a more accessible way. Also, if any port got removed and there were links that had `target`/`source`
        // set to that port, we remove those links as well (to follow the same behaviour as
        // with a removed element).

        var previousPorts = this.ports;

        // Collect ports from the `attrs` object.
        var ports = {};
        joint.util.forIn(this.get('attrs'), function(attrs, selector) {

            if (attrs && attrs.port) {

                // `port` can either be directly an `id` or an object containing an `id` (and potentially other data).
                if (attrs.port.id !== undefined) {
                    ports[attrs.port.id] = attrs.port;
                } else {
                    ports[attrs.port] = { id: attrs.port };
                }
            }
        });

        // Collect ports that have been removed (compared to the previous ports) - if any.
        // Use hash table for quick lookup.
        var removedPorts = {};
        joint.util.forIn(previousPorts, function(port, id) {

            if (!ports[id]) removedPorts[id] = true;
        });

        // Remove all the incoming/outgoing links that have source/target port set to any of the removed ports.
        if (this.graph && !joint.util.isEmpty(removedPorts)) {

            var inboundLinks = this.graph.getConnectedLinks(this, { inbound: true });
            inboundLinks.forEach(function(link) {

                if (removedPorts[link.get('target').port]) link.remove();
            });

            var outboundLinks = this.graph.getConnectedLinks(this, { outbound: true });
            outboundLinks.forEach(function(link) {

                if (removedPorts[link.get('source').port]) link.remove();
            });
        }

        // Update the `ports` object.
        this.ports = ports;
    },

    remove: function(opt) {

        opt = opt || {};

        // Store the graph in a variable because `this.graph` won't' be accessbile after `this.trigger('remove', ...)` down below.
        var graph = this.graph;
        if (!graph) {
            // The collection is a common backbone collection (not the graph collection).
            if (this.collection) this.collection.remove(this, opt);
            return this;
        }

        graph.startBatch('remove');

        // First, unembed this cell from its parent cell if there is one.
        var parentCell = this.getParentCell();
        if (parentCell) parentCell.unembed(this);

        // Remove also all the cells, which were embedded into this cell
        var embeddedCells = this.getEmbeddedCells();
        for (var i = 0, n = embeddedCells.length; i < n; i++) {
            var embed = embeddedCells[i];
            if (embed) embed.remove(opt);
        }

        this.trigger('remove', this, graph.attributes.cells, opt);

        graph.stopBatch('remove');

        return this;
    },

    toFront: function(opt) {

        var graph = this.graph;
        if (graph) {

            opt = opt || {};

            var z = graph.maxZIndex();

            var cells;

            if (opt.deep) {
                cells = this.getEmbeddedCells({ deep: true, breadthFirst: true });
                cells.unshift(this);
            } else {
                cells = [this];
            }

            z = z - cells.length + 1;

            var collection = graph.get('cells');
            var shouldUpdate = (collection.indexOf(this) !== (collection.length - cells.length));
            if (!shouldUpdate) {
                shouldUpdate = cells.some(function(cell, index) {
                    return cell.get('z') !== z + index;
                });
            }

            if (shouldUpdate) {
                this.startBatch('to-front');

                z = z + cells.length;

                cells.forEach(function(cell, index) {
                    cell.set('z', z + index, opt);
                });

                this.stopBatch('to-front');
            }
        }

        return this;
    },

    toBack: function(opt) {

        var graph = this.graph;
        if (graph) {

            opt = opt || {};

            var z = graph.minZIndex();

            var cells;

            if (opt.deep) {
                cells = this.getEmbeddedCells({ deep: true, breadthFirst: true });
                cells.unshift(this);
            } else {
                cells = [this];
            }

            var collection = graph.get('cells');
            var shouldUpdate = (collection.indexOf(this) !== 0);
            if (!shouldUpdate) {
                shouldUpdate = cells.some(function(cell, index) {
                    return cell.get('z') !== z + index;
                });
            }

            if (shouldUpdate) {
                this.startBatch('to-back');

                z -= cells.length;

                cells.forEach(function(cell, index) {
                    cell.set('z', z + index, opt);
                });

                this.stopBatch('to-back');
            }
        }

        return this;
    },

    parent: function(parent, opt) {

        // getter
        if (parent === undefined) return this.get('parent');
        // setter
        return this.set('parent', parent, opt);
    },

    embed: function(cell, opt) {

        if (this === cell || this.isEmbeddedIn(cell)) {

            throw new Error('Recursive embedding not allowed.');

        } else {

            this.startBatch('embed');

            var embeds = joint.util.assign([], this.get('embeds'));

            // We keep all element ids after link ids.
            embeds[cell.isLink() ? 'unshift' : 'push'](cell.id);

            cell.parent(this.id, opt);
            this.set('embeds', joint.util.uniq(embeds), opt);

            this.stopBatch('embed');
        }

        return this;
    },

    unembed: function(cell, opt) {

        this.startBatch('unembed');

        cell.unset('parent', opt);
        this.set('embeds', joint.util.without(this.get('embeds'), cell.id), opt);

        this.stopBatch('unembed');

        return this;
    },

    getParentCell: function() {

        // unlike link.source/target, cell.parent stores id directly as a string
        var parentId = this.parent();
        var graph = this.graph;

        return (parentId && graph && graph.getCell(parentId)) || null;
    },

    // Return an array of ancestor cells.
    // The array is ordered from the parent of the cell
    // to the most distant ancestor.
    getAncestors: function() {

        var ancestors = [];

        if (!this.graph) {
            return ancestors;
        }

        var parentCell = this.getParentCell();
        while (parentCell) {
            ancestors.push(parentCell);
            parentCell = parentCell.getParentCell();
        }

        return ancestors;
    },

    getEmbeddedCells: function(opt) {

        opt = opt || {};

        // Cell models can only be retrieved when this element is part of a collection.
        // There is no way this element knows about other cells otherwise.
        // This also means that calling e.g. `translate()` on an element with embeds before
        // adding it to a graph does not translate its embeds.
        if (this.graph) {

            var cells;

            if (opt.deep) {

                if (opt.breadthFirst) {

                    // breadthFirst algorithm
                    cells = [];
                    var queue = this.getEmbeddedCells();

                    while (queue.length > 0) {

                        var parent = queue.shift();
                        cells.push(parent);
                        queue.push.apply(queue, parent.getEmbeddedCells());
                    }

                } else {

                    // depthFirst algorithm
                    cells = this.getEmbeddedCells();
                    cells.forEach(function(cell) {
                        cells.push.apply(cells, cell.getEmbeddedCells(opt));
                    });
                }

            } else {

                cells = joint.util.toArray(this.get('embeds')).map(this.graph.getCell, this.graph);
            }

            return cells;
        }
        return [];
    },

    isEmbeddedIn: function(cell, opt) {

        var cellId = joint.util.isString(cell) ? cell : cell.id;
        var parentId = this.parent();

        opt = joint.util.defaults({ deep: true }, opt);

        // See getEmbeddedCells().
        if (this.graph && opt.deep) {

            while (parentId) {
                if (parentId === cellId) {
                    return true;
                }
                parentId = this.graph.getCell(parentId).parent();
            }

            return false;

        } else {

            // When this cell is not part of a collection check
            // at least whether it's a direct child of given cell.
            return parentId === cellId;
        }
    },

    // Whether or not the cell is embedded in any other cell.
    isEmbedded: function() {

        return !!this.parent();
    },

    // Isolated cloning. Isolated cloning has two versions: shallow and deep (pass `{ deep: true }` in `opt`).
    // Shallow cloning simply clones the cell and returns a new cell with different ID.
    // Deep cloning clones the cell and all its embedded cells recursively.
    clone: function(opt) {

        opt = opt || {};

        if (!opt.deep) {
            // Shallow cloning.

            var clone = Backbone.Model.prototype.clone.apply(this, arguments);
            // We don't want the clone to have the same ID as the original.
            clone.set('id', this.generateId());
            // A shallow cloned element does not carry over the original embeds.
            clone.unset('embeds');
            // And can not be embedded in any cell
            // as the clone is not part of the graph.
            clone.unset('parent');

            return clone;

        } else {
            // Deep cloning.

            // For a deep clone, simply call `graph.cloneCells()` with the cell and all its embedded cells.
            return joint.util.toArray(joint.dia.Graph.prototype.cloneCells.call(null, [this].concat(this.getEmbeddedCells({ deep: true }))));
        }
    },

    // A convenient way to set nested properties.
    // This method merges the properties you'd like to set with the ones
    // stored in the cell and makes sure change events are properly triggered.
    // You can either set a nested property with one object
    // or use a property path.
    // The most simple use case is:
    // `cell.prop('name/first', 'John')` or
    // `cell.prop({ name: { first: 'John' } })`.
    // Nested arrays are supported too:
    // `cell.prop('series/0/data/0/degree', 50)` or
    // `cell.prop({ series: [ { data: [ { degree: 50 } ] } ] })`.
    prop: function(props, value, opt) {

        var delim = '/';
        var isString = joint.util.isString(props);

        if (isString || Array.isArray(props)) {
            // Get/set an attribute by a special path syntax that delimits
            // nested objects by the colon character.

            if (arguments.length > 1) {

                var path;
                var pathArray;

                if (isString) {
                    path = props;
                    pathArray = path.split('/');
                } else {
                    path = props.join(delim);
                    pathArray = props.slice();
                }

                var property = pathArray[0];
                var pathArrayLength = pathArray.length;

                opt = opt || {};
                opt.propertyPath = path;
                opt.propertyValue = value;
                opt.propertyPathArray = pathArray;

                if (pathArrayLength === 1) {
                    // Property is not nested. We can simply use `set()`.
                    return this.set(property, value, opt);
                }

                var update = {};
                // Initialize the nested object. Subobjects are either arrays or objects.
                // An empty array is created if the sub-key is an integer. Otherwise, an empty object is created.
                // Note that this imposes a limitation on object keys one can use with Inspector.
                // Pure integer keys will cause issues and are therefore not allowed.
                var initializer = update;
                var prevProperty = property;

                for (var i = 1; i < pathArrayLength; i++) {
                    var pathItem = pathArray[i];
                    var isArrayIndex = Number.isFinite(isString ? Number(pathItem) : pathItem);
                    initializer = initializer[prevProperty] = isArrayIndex ? [] : {};
                    prevProperty = pathItem;
                }

                // Fill update with the `value` on `path`.
                update = joint.util.setByPath(update, pathArray, value, '/');

                var baseAttributes = joint.util.merge({}, this.attributes);
                // if rewrite mode enabled, we replace value referenced by path with
                // the new one (we don't merge).
                opt.rewrite && joint.util.unsetByPath(baseAttributes, path, '/');

                // Merge update with the model attributes.
                var attributes = joint.util.merge(baseAttributes, update);
                // Finally, set the property to the updated attributes.
                return this.set(property, attributes[property], opt);

            } else {

                return joint.util.getByPath(this.attributes, props, delim);
            }
        }

        return this.set(joint.util.merge({}, this.attributes, props), value);
    },

    // A convient way to unset nested properties
    removeProp: function(path, opt) {

        opt = opt || {};

        var pathArray = Array.isArray(path) ? path : path.split('/');

        // Once a property is removed from the `attrs` attribute
        // the cellView will recognize a `dirty` flag and rerender itself
        // in order to remove the attribute from SVG element.
        var property = pathArray[0];
        if (property === 'attrs') opt.dirty = true;

        if (pathArray.length === 1) {
            // A top level property
            return this.unset(path, opt);
        }

        // A nested property
        var nestedPath = pathArray.slice(1);
        var propertyValue = joint.util.cloneDeep(this.get(property));

        joint.util.unsetByPath(propertyValue, nestedPath, '/');

        return this.set(property, propertyValue, opt);
    },

    // A convenient way to set nested attributes.
    attr: function(attrs, value, opt) {

        var args = Array.from(arguments);
        if (args.length === 0) {
            return this.get('attrs');
        }

        if (Array.isArray(attrs)) {
            args[0] = ['attrs'].concat(attrs);
        } else if (joint.util.isString(attrs)) {
            // Get/set an attribute by a special path syntax that delimits
            // nested objects by the colon character.
            args[0] = 'attrs/' + attrs;

        } else {

            args[0] = { 'attrs' : attrs };
        }

        return this.prop.apply(this, args);
    },

    // A convenient way to unset nested attributes
    removeAttr: function(path, opt) {

        if (Array.isArray(path)) {

            return this.removeProp(['attrs'].concat(path));
        }

        return this.removeProp('attrs/' + path, opt);
    },

    transition: function(path, value, opt, delim) {

        delim = delim || '/';

        var defaults = {
            duration: 100,
            delay: 10,
            timingFunction: joint.util.timing.linear,
            valueFunction: joint.util.interpolate.number
        };

        opt = joint.util.assign(defaults, opt);

        var firstFrameTime = 0;
        var interpolatingFunction;

        var setter = function(runtime) {

            var id, progress, propertyValue;

            firstFrameTime = firstFrameTime || runtime;
            runtime -= firstFrameTime;
            progress = runtime / opt.duration;

            if (progress < 1) {
                this._transitionIds[path] = id = joint.util.nextFrame(setter);
            } else {
                progress = 1;
                delete this._transitionIds[path];
            }

            propertyValue = interpolatingFunction(opt.timingFunction(progress));

            opt.transitionId = id;

            this.prop(path, propertyValue, opt);

            if (!id) this.trigger('transition:end', this, path);

        }.bind(this);

        var initiator = function(callback) {

            this.stopTransitions(path);

            interpolatingFunction = opt.valueFunction(joint.util.getByPath(this.attributes, path, delim), value);

            this._transitionIds[path] = joint.util.nextFrame(callback);

            this.trigger('transition:start', this, path);

        }.bind(this);

        return setTimeout(initiator, opt.delay, setter);
    },

    getTransitions: function() {

        return Object.keys(this._transitionIds);
    },

    stopTransitions: function(path, delim) {

        delim = delim || '/';

        var pathArray = path && path.split(delim);

        Object.keys(this._transitionIds).filter(pathArray && function(key) {

            return joint.util.isEqual(pathArray, key.split(delim).slice(0, pathArray.length));

        }).forEach(function(key) {

            joint.util.cancelFrame(this._transitionIds[key]);

            delete this._transitionIds[key];

            this.trigger('transition:end', this, key);

        }, this);

        return this;
    },

    // A shorcut making it easy to create constructs like the following:
    // `var el = (new joint.shapes.basic.Rect).addTo(graph)`.
    addTo: function(graph, opt) {

        graph.addCell(this, opt);
        return this;
    },

    // A shortcut for an equivalent call: `paper.findViewByModel(cell)`
    // making it easy to create constructs like the following:
    // `cell.findView(paper).highlight()`
    findView: function(paper) {

        return paper.findViewByModel(this);
    },

    isElement: function() {

        return false;
    },

    isLink: function() {

        return false;
    },

    startBatch: function(name, opt) {

        if (this.graph) { this.graph.startBatch(name, joint.util.assign({}, opt, { cell: this })); }
        return this;
    },

    stopBatch: function(name, opt) {

        if (this.graph) { this.graph.stopBatch(name, joint.util.assign({}, opt, { cell: this })); }
        return this;
    },

    getChangeFlag: function(attributes) {
        var flag = 0;
        if (!attributes) return flag;
        for (var key in attributes) {
            if (!attributes.hasOwnProperty(key) || !this.hasChanged(key)) continue;
            flag |= attributes[key];
        }
        return flag;
    },

    angle: function() {
        return 0;
    },

    getPointFromConnectedLink: function() {
        // To be overridden
        return new g.Point();
    }

}, {

    getAttributeDefinition: function(attrName) {

        var defNS = this.attributes;
        var globalDefNS = joint.dia.attributes;
        return (defNS && defNS[attrName]) || globalDefNS[attrName];
    },

    define: function(type, defaults, protoProps, staticProps) {

        protoProps = joint.util.assign({
            defaults: joint.util.defaultsDeep({ type: type }, defaults, this.prototype.defaults)
        }, protoProps);

        var Cell = this.extend(protoProps, staticProps);
        joint.util.setByPath(joint.shapes, type, Cell, '.');
        return Cell;
    }
});

// joint.dia.CellView base view and controller.
// --------------------------------------------

// This is the base view and controller for `joint.dia.ElementView` and `joint.dia.LinkView`.

joint.dia.CellView = joint.mvc.View.extend({

    tagName: 'g',

    svgElement: true,

    selector: 'root',

    metrics: null,

    className: function() {

        var classNames = ['cell'];
        var type = this.model.get('type');

        if (type) {

            type.toLowerCase().split('.').forEach(function(value, index, list) {
                classNames.push('type-' + list.slice(0, index + 1).join('-'));
            });
        }

        return classNames.join(' ');
    },

    attributes: function() {
        var cell = this.model;
        return {
            'model-id': cell.id,
            'data-type': cell.attributes.type
        };
    },

    constructor: function(options) {

        // Make sure a global unique id is assigned to this view. Store this id also to the properties object.
        // The global unique id makes sure that the same view can be rendered on e.g. different machines and
        // still be associated to the same object among all those clients. This is necessary for real-time
        // collaboration mechanism.
        options.id = options.id || joint.util.guid(this);

        joint.mvc.View.call(this, options);
    },

    init: function() {

        this.cleanNodesCache();

        // Store reference to this to the <g> DOM element so that the view is accessible through the DOM tree.
        this.$el.data('view', this);

        this.startListening();
    },

    startListening: function() {
        this.listenTo(this.model, 'change', this.onAttributesChange);
    },

    onAttributesChange: function() {
        // to be overriden
    },

    parseDOMJSON: function(markup, root) {

        var doc = joint.util.parseDOMJSON(markup);
        var selectors = doc.selectors;
        var groups = doc.groupSelectors;
        for (var group in groups) {
            if (selectors[group]) throw new Error('dia.CellView: ambigious group selector');
            selectors[group] = groups[group];
        }
        if (root) {
            var rootSelector = this.selector;
            if (selectors[rootSelector]) throw new Error('dia.CellView: ambiguous root selector.');
            selectors[rootSelector] = root;
        }
        return { fragment: doc.fragment, selectors: selectors };
    },

    // Return `true` if cell link is allowed to perform a certain UI `feature`.
    // Example: `can('vertexMove')`, `can('labelMove')`.
    can: function(feature) {

        var interactive = joint.util.isFunction(this.options.interactive)
            ? this.options.interactive(this)
            : this.options.interactive;

        return (joint.util.isObject(interactive) && interactive[feature] !== false) ||
                (joint.util.isBoolean(interactive) && interactive !== false);
    },

    findBySelector: function(selector, root, selectors) {

        root || (root = this.el);
        selectors || (selectors = this.selectors);

        // These are either descendants of `this.$el` of `this.$el` itself.
        // `.` is a special selector used to select the wrapping `<g>` element.
        if (!selector || selector === '.') return [root];
        if (selectors) {
            var nodes = selectors[selector];
            if (nodes) {
                if (Array.isArray(nodes)) return nodes;
                return [nodes];
            }
        }
        // Maintaining backwards compatibility
        // e.g. `circle:first` would fail with querySelector() call
        return $(root).find(selector).toArray();
    },

    notify: function(eventName) {

        if (this.paper) {

            var args = Array.prototype.slice.call(arguments, 1);

            // Trigger the event on both the element itself and also on the paper.
            this.trigger.apply(this, [eventName].concat(args));

            // Paper event handlers receive the view object as the first argument.
            this.paper.trigger.apply(this.paper, [eventName, this].concat(args));
        }
    },

    getBBox: function() {

        return this.vel.getBBox({ target: this.paper.svg });
    },

    highlight: function(el, opt) {

        el = !el ? this.el : this.$(el)[0] || this.el;

        // set partial flag if the highlighted element is not the entire view.
        opt = opt || {};
        opt.partial = (el !== this.el);

        this.notify('cell:highlight', el, opt);
        return this;
    },

    unhighlight: function(el, opt) {

        el = !el ? this.el : this.$(el)[0] || this.el;

        opt = opt || {};
        opt.partial = el != this.el;

        this.notify('cell:unhighlight', el, opt);
        return this;
    },

    // Find the closest element that has the `magnet` attribute set to `true`. If there was not such
    // an element found, return the root element of the cell view.
    findMagnet: function(el) {

        var $el = this.$(el);
        var $rootEl = this.$el;

        if ($el.length === 0) {
            $el = $rootEl;
        }

        do {

            var magnet = $el.attr('magnet');
            if ((magnet || $el.is($rootEl)) && magnet !== 'false') {
                return $el[0];
            }

            $el = $el.parent();

        } while ($el.length > 0);

        // If the overall cell has set `magnet === false`, then return `undefined` to
        // announce there is no magnet found for this cell.
        // This is especially useful to set on cells that have 'ports'. In this case,
        // only the ports have set `magnet === true` and the overall element has `magnet === false`.
        return undefined;
    },

    // Construct a unique selector for the `el` element within this view.
    // `prevSelector` is being collected through the recursive call.
    // No value for `prevSelector` is expected when using this method.
    getSelector: function(el, prevSelector) {

        var selector;

        if (el === this.el) {
            if (typeof prevSelector === 'string') selector = '> ' + prevSelector;
            return selector;
        }

        if (el) {

            var nthChild = V(el).index() + 1;
            selector = el.tagName + ':nth-child(' + nthChild + ')';

            if (prevSelector) {
                selector += ' > ' + prevSelector;
            }

            selector = this.getSelector(el.parentNode, selector);
        }

        return selector;
    },

    getLinkEnd: function(magnet, x, y, link, endType) {

        var model = this.model;
        var id = model.id;
        var port = this.findAttribute('port', magnet);
        // Find a unique `selector` of the element under pointer that is a magnet.
        var selector = magnet.getAttribute('joint-selector');

        var end = { id: id };
        if (selector != null) end.magnet = selector;
        if (port != null) {
            end.port = port;
            if (!model.hasPort(port) && !selector) {
                // port created via the `port` attribute (not API)
                end.selector = this.getSelector(magnet);
            }
        } else if (selector == null && this.el !== magnet) {
            end.selector = this.getSelector(magnet);
        }

        var paper = this.paper;
        var connectionStrategy = paper.options.connectionStrategy;
        if (typeof connectionStrategy === 'function') {
            var strategy = connectionStrategy.call(paper, end, this, magnet, new g.Point(x, y), link, endType, paper);
            if (strategy) end = strategy;
        }

        return end;
    },

    getMagnetFromLinkEnd: function(end) {

        var root = this.el;
        var port = end.port;
        var selector = end.magnet;
        var magnet;
        if (port != null && this.model.hasPort(port)) {
            magnet = this.findPortNode(port, selector) || root;
        } else {
            if (!selector) selector = end.selector;
            if (!selector && port != null) {
                // link end has only `id` and `port` property referencing
                // a port created via the `port` attribute (not API).
                selector = '[port="' + port + '"]';
            }
            magnet = this.findBySelector(selector, root, this.selectors)[0];
        }

        return magnet;
    },

    getAttributeDefinition: function(attrName) {

        return this.model.constructor.getAttributeDefinition(attrName);
    },

    setNodeAttributes: function(node, attrs) {

        if (!joint.util.isEmpty(attrs)) {
            if (node instanceof SVGElement) {
                V(node).attr(attrs);
            } else {
                $(node).attr(attrs);
            }
        }
    },

    processNodeAttributes: function(node, attrs) {

        var attrName, attrVal, def, i, n;
        var normalAttrs, setAttrs, positionAttrs, offsetAttrs;
        var relatives = [];
        // divide the attributes between normal and special
        for (attrName in attrs) {
            if (!attrs.hasOwnProperty(attrName)) continue;
            attrVal = attrs[attrName];
            def = this.getAttributeDefinition(attrName);
            if (def && (!joint.util.isFunction(def.qualify) || def.qualify.call(this, attrVal, node, attrs))) {
                if (joint.util.isString(def.set)) {
                    normalAttrs || (normalAttrs = {});
                    normalAttrs[def.set] = attrVal;
                }
                if (attrVal !== null) {
                    relatives.push(attrName, def);
                }
            } else {
                normalAttrs || (normalAttrs = {});
                normalAttrs[joint.util.toKebabCase(attrName)] = attrVal;
            }
        }

        // handle the rest of attributes via related method
        // from the special attributes namespace.
        for (i = 0, n = relatives.length; i < n; i+=2) {
            attrName = relatives[i];
            def = relatives[i+1];
            attrVal = attrs[attrName];
            if (joint.util.isFunction(def.set)) {
                setAttrs || (setAttrs = {});
                setAttrs[attrName] = attrVal;
            }
            if (joint.util.isFunction(def.position)) {
                positionAttrs || (positionAttrs = {});
                positionAttrs[attrName] = attrVal;
            }
            if (joint.util.isFunction(def.offset)) {
                offsetAttrs || (offsetAttrs = {});
                offsetAttrs[attrName] = attrVal;
            }
        }

        return {
            raw: attrs,
            normal: normalAttrs,
            set: setAttrs,
            position: positionAttrs,
            offset: offsetAttrs
        };
    },

    updateRelativeAttributes: function(node, attrs, refBBox, opt) {

        opt || (opt = {});

        var attrName, attrVal, def;
        var rawAttrs = attrs.raw || {};
        var nodeAttrs = attrs.normal || {};
        var setAttrs = attrs.set;
        var positionAttrs = attrs.position;
        var offsetAttrs = attrs.offset;

        for (attrName in setAttrs) {
            attrVal = setAttrs[attrName];
            def = this.getAttributeDefinition(attrName);
            // SET - set function should return attributes to be set on the node,
            // which will affect the node dimensions based on the reference bounding
            // box. e.g. `width`, `height`, `d`, `rx`, `ry`, `points
            var setResult = def.set.call(this, attrVal, refBBox.clone(), node, rawAttrs);
            if (joint.util.isObject(setResult)) {
                joint.util.assign(nodeAttrs, setResult);
            } else if (setResult !== undefined) {
                nodeAttrs[attrName] = setResult;
            }
        }

        if (node instanceof HTMLElement) {
            // TODO: setting the `transform` attribute on HTMLElements
            // via `node.style.transform = 'matrix(...)';` would introduce
            // a breaking change (e.g. basic.TextBlock).
            this.setNodeAttributes(node, nodeAttrs);
            return;
        }

        // The final translation of the subelement.
        var nodeTransform = nodeAttrs.transform;
        var nodeMatrix = V.transformStringToMatrix(nodeTransform);
        var nodePosition = g.Point(nodeMatrix.e, nodeMatrix.f);
        if (nodeTransform) {
            nodeAttrs = joint.util.omit(nodeAttrs, 'transform');
            nodeMatrix.e = nodeMatrix.f = 0;
        }

        // Calculate node scale determined by the scalable group
        // only if later needed.
        var sx, sy, translation;
        if (positionAttrs || offsetAttrs) {
            var nodeScale = this.getNodeScale(node, opt.scalableNode);
            sx = nodeScale.sx;
            sy = nodeScale.sy;
        }

        var positioned = false;
        for (attrName in positionAttrs) {
            attrVal = positionAttrs[attrName];
            def = this.getAttributeDefinition(attrName);
            // POSITION - position function should return a point from the
            // reference bounding box. The default position of the node is x:0, y:0 of
            // the reference bounding box or could be further specify by some
            // SVG attributes e.g. `x`, `y`
            translation = def.position.call(this, attrVal, refBBox.clone(), node, rawAttrs);
            if (translation) {
                nodePosition.offset(g.Point(translation).scale(sx, sy));
                positioned || (positioned = true);
            }
        }

        // The node bounding box could depend on the `size` set from the previous loop.
        // Here we know, that all the size attributes have been already set.
        this.setNodeAttributes(node, nodeAttrs);

        var offseted = false;
        if (offsetAttrs) {
            // Check if the node is visible
            var nodeBoundingRect = this.getNodeBoundingRect(node);
            if (nodeBoundingRect.width > 0 && nodeBoundingRect.height > 0) {
                var nodeBBox = V.transformRect(nodeBoundingRect, nodeMatrix).scale(1 / sx, 1 / sy);
                for (attrName in offsetAttrs) {
                    attrVal = offsetAttrs[attrName];
                    def = this.getAttributeDefinition(attrName);
                    // OFFSET - offset function should return a point from the element
                    // bounding box. The default offset point is x:0, y:0 (origin) or could be further
                    // specify with some SVG attributes e.g. `text-anchor`, `cx`, `cy`
                    translation = def.offset.call(this, attrVal, nodeBBox, node, rawAttrs);
                    if (translation) {
                        nodePosition.offset(g.Point(translation).scale(sx, sy));
                        offseted || (offseted = true);
                    }
                }
            }
        }

        // Do not touch node's transform attribute if there is no transformation applied.
        if (nodeTransform !== undefined || positioned || offseted) {
            // Round the coordinates to 1 decimal point.
            nodePosition.round(1);
            nodeMatrix.e = nodePosition.x;
            nodeMatrix.f = nodePosition.y;
            node.setAttribute('transform', V.matrixToTransformString(nodeMatrix));
            // TODO: store nodeMatrix metrics?
        }
    },

    getNodeScale: function(node, scalableNode) {

        // Check if the node is a descendant of the scalable group.
        var sx, sy;
        if (scalableNode && scalableNode.contains(node)) {
            var scale = scalableNode.scale();
            sx = 1 / scale.sx;
            sy = 1 / scale.sy;
        } else {
            sx = 1;
            sy = 1;
        }

        return { sx: sx, sy: sy };
    },

    cleanNodesCache: function() {
        this.metrics = {};
    },

    nodeCache: function(magnet) {

        var metrics = this.metrics;
        // Don't use cache? It most likely a custom view with overridden update.
        if (!metrics) return {};
        var id = V.ensureId(magnet);
        var value = metrics[id];
        if (!value) value = metrics[id] = {};
        return value;
    },

    getNodeData: function(magnet) {

        var metrics = this.nodeCache(magnet);
        if (!metrics.data) metrics.data = {};
        return metrics.data;
    },

    getNodeBoundingRect: function(magnet) {

        var metrics = this.nodeCache(magnet);
        if (metrics.boundingRect === undefined) metrics.boundingRect = V(magnet).getBBox();
        return new g.Rect(metrics.boundingRect);
    },

    getNodeMatrix: function(magnet) {

        var metrics = this.nodeCache(magnet);
        if (metrics.magnetMatrix === undefined) {
            var target = this.rotatableNode || this.el;
            metrics.magnetMatrix = V(magnet).getTransformToElement(target);
        }
        return V.createSVGMatrix(metrics.magnetMatrix);
    },

    getNodeShape: function(magnet) {

        var metrics = this.nodeCache(magnet);
        if (metrics.geometryShape === undefined) metrics.geometryShape = V(magnet).toGeometryShape();
        return metrics.geometryShape.clone();
    },

    getNodeBBox: function(magnet) {

        return V.transformRect(this.getNodeBoundingRect(magnet), this.getNodeMatrix(magnet));
    },

    getNodeUnrotatedBBox: function(magnet) {

        return this.getNodeBBox(magnet);
    },

    getRootTranslateMatrix: function() {

        return V.createSVGMatrix();
    },

    getRootRotateMatrix: function() {

        return V.createSVGMatrix();
    },

    isNodeConnection: function(node) {
        return this.model.isLink() && (!node || node === this.el);
    },

    findNodesAttributes: function(attrs, root, selectorCache, selectors) {

        var util = joint.util;
        var i, n, nodeAttrs, nodeId;
        var nodesAttrs = {};
        var mergeIds = [];
        for (var selector in attrs) {
            if (!attrs.hasOwnProperty(selector)) continue;
            var selected = selectorCache[selector] = this.findBySelector(selector, root, selectors);
            for (i = 0, n = selected.length; i < n; i++) {
                var node = selected[i];
                nodeId = V.ensureId(node);
                nodeAttrs = attrs[selector];
                // "unique" selectors are selectors that referencing a single node (defined by `selector`)
                // groupSelector referencing a single node is not "unique"
                var unique = (selectors && selectors[selector] === node);
                var prevNodeAttrs = nodesAttrs[nodeId];
                if (prevNodeAttrs) {
                    // Note, that nodes referenced by deprecated `CSS selectors` are not taken into account.
                    // e.g. css:`.circle` and selector:`circle` can be applied in a random order
                    if (!prevNodeAttrs.array) {
                        mergeIds.push(nodeId);
                        prevNodeAttrs.array = true;
                        prevNodeAttrs.attributes = [prevNodeAttrs.attributes];
                        prevNodeAttrs.selectedLength = [prevNodeAttrs.selectedLength];
                    }
                    var attributes = prevNodeAttrs.attributes;
                    var selectedLength = prevNodeAttrs.selectedLength;
                    if (unique) {
                        // node referenced by `selector`
                        attributes.unshift(nodeAttrs);
                        selectedLength.unshift(-1);
                    } else {
                        // node referenced by `groupSelector`
                        var sortIndex = util.sortedIndex(selectedLength, n);
                        attributes.splice(sortIndex, 0, nodeAttrs);
                        selectedLength.splice(sortIndex, 0, n);
                    }
                } else {
                    nodesAttrs[nodeId] = {
                        attributes: nodeAttrs,
                        selectedLength: unique ? -1 : n,
                        node: node,
                        array: false
                    };
                }
            }
        }

        for (i = 0, n = mergeIds.length; i < n; i++) {
            nodeId = mergeIds[i];
            nodeAttrs = nodesAttrs[nodeId];
            nodeAttrs.attributes = util.merge.apply(util, [{}].concat(nodeAttrs.attributes.reverse()));
        }

        return nodesAttrs;
    },

    getEventTarget: function(evt) {
        // Touchmove/Touchend event's target is not reflecting the element under the coordinates as mousemove does.
        // It holds the element when a touchstart triggered.
        var type = evt.type;
        if (type === 'touchmove' || type === 'touchend') {
            return document.elementFromPoint(evt.clientX, evt.clientY);
        }

        return evt.target;
    },

    // Default is to process the `model.attributes.attrs` object and set attributes on subelements based on the selectors,
    // unless `attrs` parameter was passed.
    updateDOMSubtreeAttributes: function(rootNode, attrs, opt) {

        opt || (opt = {});
        opt.rootBBox || (opt.rootBBox = g.Rect());
        opt.selectors || (opt.selectors = this.selectors); // selector collection to use

        // Cache table for query results and bounding box calculation.
        // Note that `selectorCache` needs to be invalidated for all
        // `updateAttributes` calls, as the selectors might pointing
        // to nodes designated by an attribute or elements dynamically
        // created.
        var selectorCache = {};
        var bboxCache = {};
        var relativeItems = [];
        var item, node, nodeAttrs, nodeData, processedAttrs;

        var roAttrs = opt.roAttributes;
        var nodesAttrs = this.findNodesAttributes(roAttrs || attrs, rootNode, selectorCache, opt.selectors);
        // `nodesAttrs` are different from all attributes, when
        // rendering only  attributes sent to this method.
        var nodesAllAttrs = (roAttrs)
            ? this.findNodesAttributes(attrs, rootNode, selectorCache, opt.selectors)
            : nodesAttrs;

        for (var nodeId in nodesAttrs) {
            nodeData = nodesAttrs[nodeId];
            nodeAttrs = nodeData.attributes;
            node = nodeData.node;
            processedAttrs = this.processNodeAttributes(node, nodeAttrs);

            if (!processedAttrs.set && !processedAttrs.position && !processedAttrs.offset) {
                // Set all the normal attributes right on the SVG/HTML element.
                this.setNodeAttributes(node, processedAttrs.normal);

            } else {

                var nodeAllAttrs = nodesAllAttrs[nodeId] && nodesAllAttrs[nodeId].attributes;
                var refSelector = (nodeAllAttrs && (nodeAttrs.ref === undefined))
                    ? nodeAllAttrs.ref
                    : nodeAttrs.ref;

                var refNode;
                if (refSelector) {
                    refNode = (selectorCache[refSelector] || this.findBySelector(refSelector, rootNode, opt.selectors))[0];
                    if (!refNode) {
                        throw new Error('dia.ElementView: "' + refSelector + '" reference does not exist.');
                    }
                } else {
                    refNode = null;
                }

                item = {
                    node: node,
                    refNode: refNode,
                    processedAttributes: processedAttrs,
                    allAttributes: nodeAllAttrs
                };

                // If an element in the list is positioned relative to this one, then
                // we want to insert this one before it in the list.
                var itemIndex = relativeItems.findIndex(function(item) {
                    return item.refNode === node;
                });

                if (itemIndex > -1) {
                    relativeItems.splice(itemIndex, 0, item);
                } else {
                    relativeItems.push(item);
                }
            }
        }

        var rotatableMatrix;
        for (var i = 0, n = relativeItems.length; i < n; i++) {
            item = relativeItems[i];
            node = item.node;
            refNode = item.refNode;

            // Find the reference element bounding box. If no reference was provided, we
            // use the optional bounding box.
            var vRotatable = V(opt.rotatableNode);
            var refNodeId = refNode ? V.ensureId(refNode) : '';
            var isRefNodeRotatable = !!vRotatable && !!refNode && vRotatable.contains(refNode);
            var unrotatedRefBBox = bboxCache[refNodeId];
            if (!unrotatedRefBBox) {
                // Get the bounding box of the reference element relative to the `rotatable` `<g>` (without rotation)
                // or to the root `<g>` element if no rotatable group present if reference node present.
                // Uses the bounding box provided.
                var transformationTarget = (isRefNodeRotatable) ? vRotatable : rootNode;
                unrotatedRefBBox = bboxCache[refNodeId] = (refNode)
                    ? V(refNode).getBBox({ target: transformationTarget })
                    : opt.rootBBox;
            }

            if (roAttrs) {
                // if there was a special attribute affecting the position amongst passed-in attributes
                // we have to merge it with the rest of the element's attributes as they are necessary
                // to update the position relatively (i.e `ref-x` && 'ref-dx')
                processedAttrs = this.processNodeAttributes(node, item.allAttributes);
                this.mergeProcessedAttributes(processedAttrs, item.processedAttributes);

            } else {
                processedAttrs = item.processedAttributes;
            }

            var refBBox = unrotatedRefBBox;
            if (isRefNodeRotatable && !vRotatable.contains(node)) {
                // if the referenced node is inside the rotatable group while the updated node is outside,
                // we need to take the rotatable node transformation into account
                if (!rotatableMatrix) rotatableMatrix = V.transformStringToMatrix(vRotatable.attr('transform'));
                refBBox = V.transformRect(unrotatedRefBBox, rotatableMatrix);
            }

            this.updateRelativeAttributes(node, processedAttrs, refBBox, opt);
        }
    },

    mergeProcessedAttributes: function(processedAttrs, roProcessedAttrs) {

        processedAttrs.set || (processedAttrs.set = {});
        processedAttrs.position || (processedAttrs.position = {});
        processedAttrs.offset || (processedAttrs.offset = {});

        joint.util.assign(processedAttrs.set, roProcessedAttrs.set);
        joint.util.assign(processedAttrs.position, roProcessedAttrs.position);
        joint.util.assign(processedAttrs.offset, roProcessedAttrs.offset);

        // Handle also the special transform property.
        var transform = processedAttrs.normal && processedAttrs.normal.transform;
        if (transform !== undefined && roProcessedAttrs.normal) {
            roProcessedAttrs.normal.transform = transform;
        }
        processedAttrs.normal = roProcessedAttrs.normal;
    },

    onRemove: function() {
        this.removeTools();
    },

    _toolsView: null,

    hasTools: function(name) {
        var toolsView = this._toolsView;
        if (!toolsView) return false;
        if (!name) return true;
        return (toolsView.getName() === name);
    },

    addTools: function(toolsView) {

        this.removeTools();

        if (toolsView instanceof joint.dia.ToolsView) {
            this._toolsView = toolsView;
            toolsView.configure({ relatedView: this });
            toolsView.listenTo(this.paper, 'tools:event', this.onToolEvent.bind(this));
            toolsView.mount();
        }
        return this;
    },

    updateTools: function(opt) {

        var toolsView = this._toolsView;
        if (toolsView) toolsView.update(opt);
        return this;
    },

    removeTools: function() {

        var toolsView = this._toolsView;
        if (toolsView) {
            toolsView.remove();
            this._toolsView = null;
        }
        return this;
    },

    hideTools: function() {

        var toolsView = this._toolsView;
        if (toolsView) toolsView.hide();
        return this;
    },

    showTools: function() {

        var toolsView = this._toolsView;
        if (toolsView) toolsView.show();
        return this;
    },

    onToolEvent: function(event) {
        switch (event) {
            case 'remove':
                this.removeTools();
                break;
            case 'hide':
                this.hideTools();
                break;
            case 'show':
                this.showTools();
                break;
        }
    },

    // Interaction. The controller part.
    // ---------------------------------

    // Interaction is handled by the paper and delegated to the view in interest.
    // `x` & `y` parameters passed to these functions represent the coordinates already snapped to the paper grid.
    // If necessary, real coordinates can be obtained from the `evt` event object.

    // These functions are supposed to be overriden by the views that inherit from `joint.dia.Cell`,
    // i.e. `joint.dia.Element` and `joint.dia.Link`.

    pointerdblclick: function(evt, x, y) {

        this.notify('cell:pointerdblclick', evt, x, y);
    },

    pointerclick: function(evt, x, y) {

        this.notify('cell:pointerclick', evt, x, y);
    },

    contextmenu: function(evt, x, y) {

        this.notify('cell:contextmenu', evt, x, y);
    },

    pointerdown: function(evt, x, y) {

        if (this.model.graph) {
            this.model.startBatch('pointer');
            this._graph = this.model.graph;
        }

        this.notify('cell:pointerdown', evt, x, y);
    },

    pointermove: function(evt, x, y) {

        this.notify('cell:pointermove', evt, x, y);
    },

    pointerup: function(evt, x, y) {

        this.notify('cell:pointerup', evt, x, y);

        if (this._graph) {
            // we don't want to trigger event on model as model doesn't
            // need to be member of collection anymore (remove)
            this._graph.stopBatch('pointer', { cell: this.model });
            delete this._graph;
        }
    },

    mouseover: function(evt) {

        this.notify('cell:mouseover', evt);
    },

    mouseout: function(evt) {

        this.notify('cell:mouseout', evt);
    },

    mouseenter: function(evt) {

        this.notify('cell:mouseenter', evt);
    },

    mouseleave: function(evt) {

        this.notify('cell:mouseleave', evt);
    },

    mousewheel: function(evt, x, y, delta) {

        this.notify('cell:mousewheel', evt, x, y, delta);
    },

    onevent: function(evt, eventName, x, y) {

        this.notify(eventName, evt, x, y);
    },

    onmagnet: function() {

        // noop
    },

    magnetpointerdblclick: function() {

        // noop
    },

    magnetcontextmenu: function() {

        // noop
    },

    setInteractivity: function(value) {

        this.options.interactive = value;
    }
}, {

    dispatchToolsEvent: function(paper, event) {
        if ((typeof event === 'string') && (paper instanceof joint.dia.Paper)) {
            paper.trigger('tools:event', event);
        }
    }
});

import { isEmpty } from '../../util/utilHelpers.mjs';
import $ from '../Dom.mjs';
import { dataPriv } from './dom-data.js';

const rtypenamespace = /^([^.]*)(?:\.(.+)|)/;
const rcheckableType = /^(?:checkbox|radio)$/i;
const documentElement = document.documentElement;
// Only count HTML whitespace
// Other whitespace should count in values
// https://infra.spec.whatwg.org/#ascii-whitespace
const rnothtmlwhite = /[^\x20\t\r\n\f]+/g;


function nodeName(elem, name) {
    return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
}

function returnTrue() {
    return true;
}

function returnFalse() {
    return false;
}

function on(elem, types, selector, data, fn, one) {
    var origFn, type;

    // Types can be a map of types/handlers
    if (typeof types === 'object') {
        // ( types-Object, selector, data )
        if (typeof selector !== 'string') {
            // ( types-Object, data )
            data = data || selector;
            selector = undefined;
        }
        for (type in types) {
            on(elem, type, selector, data, types[type], one);
        }
        return elem;
    }

    if (data == null && fn == null) {
        // ( types, fn )
        fn = selector;
        data = selector = undefined;
    } else if (fn == null) {
        if (typeof selector === 'string') {
            // ( types, selector, fn )
            fn = data;
            data = undefined;
        } else {
            // ( types, data, fn )
            fn = data;
            data = selector;
            selector = undefined;
        }
    }
    if (fn === false) {
        fn = returnFalse;
    } else if (!fn) {
        return elem;
    }

    if (one === 1) {
        origFn = fn;
        fn = function(event) {
            // Can use an empty set, since event contains the info
            $().off(event);
            return origFn.apply(this, arguments);
        };

        // Use same guid so caller can remove using origFn
        fn.guid = origFn.guid || (origFn.guid = $.guid++);
    }
    return elem.each(function() {
        $.event.add(this, types, fn, data, selector);
    });
}

/**
 * Determines whether an object can have data
 */
function acceptData(owner) {
    // Accepts only:
    //  - Node
    //    - Node.ELEMENT_NODE
    //    - Node.DOCUMENT_NODE
    //  - Object
    //    - Any
    return owner.nodeType === 1 || owner.nodeType === 9 || !+owner.nodeType;
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
$.event = {
    add: function(elem, types, handler, data, selector) {
        var handleObjIn,
            eventHandle,
            tmp,
            events,
            t,
            handleObj,
            special,
            handlers,
            type,
            namespaces,
            origType,
            elemData = dataPriv.get(elem);

        // Only attach events to objects that accept data
        if (!acceptData(elem)) {
            return;
        }

        // Caller can pass in an object of custom data in lieu of the handler
        if (handler.handler) {
            handleObjIn = handler;
            handler = handleObjIn.handler;
            selector = handleObjIn.selector;
        }

        // Ensure that invalid selectors throw exceptions at attach time
        // Evaluate against documentElement in case elem is a non-element node (e.g., document)
        if (selector) {
            documentElement.matches(selector);
        }

        // Make sure that the handler has a unique ID, used to find/remove it later
        if (!handler.guid) {
            handler.guid = $.guid++;
        }

        // Init the element's event structure and main handler, if this is the first
        if (!(events = elemData.events)) {
            events = elemData.events = Object.create(null);
        }
        if (!(eventHandle = elemData.handle)) {
            eventHandle = elemData.handle = function(e) {
                // Discard the second event of a $.event.trigger() and
                // when an event is called after a page has unloaded
                return typeof $ !== 'undefined' &&
                    $.event.triggered !== e.type
                    ? $.event.dispatch.apply(elem, arguments)
                    : undefined;
            };
        }

        // Handle multiple events separated by a space
        types = (types || '').match(rnothtmlwhite) || [''];
        t = types.length;
        while (t--) {
            tmp = rtypenamespace.exec(types[t]) || [];
            type = origType = tmp[1];
            namespaces = (tmp[2] || '').split('.').sort();

            // There *must* be a type, no attaching namespace-only handlers
            if (!type) {
                continue;
            }

            // If event changes its type, use the special event handlers for the changed type
            special = $.event.special[type] || {};

            // If selector defined, determine special event api type, otherwise given type
            type = (selector ? special.delegateType : special.bindType) || type;

            // Update special based on newly reset type
            special = $.event.special[type] || {};

            // handleObj is passed to all event handlers
            handleObj = Object.assign(
                {
                    type: type,
                    origType: origType,
                    data: data,
                    handler: handler,
                    guid: handler.guid,
                    selector: selector,
                    needsContext:
                        selector &&
                        $.expr.match.needsContext.test(selector),
                    namespace: namespaces.join('.'),
                },
                handleObjIn
            );

            // Init the event handler queue if we're the first
            if (!(handlers = events[type])) {
                handlers = events[type] = [];
                handlers.delegateCount = 0;

                // Only use addEventListener if the special events handler returns false
                if (
                    !special.setup ||
                    special.setup.call(elem, data, namespaces, eventHandle) ===
                        false
                ) {
                    if (elem.addEventListener) {
                        elem.addEventListener(type, eventHandle);
                    }
                }
            }

            if (special.add) {
                special.add.call(elem, handleObj);

                if (!handleObj.handler.guid) {
                    handleObj.handler.guid = handler.guid;
                }
            }

            // Add to the element's handler list, delegates in front
            if (selector) {
                handlers.splice(handlers.delegateCount++, 0, handleObj);
            } else {
                handlers.push(handleObj);
            }
        }
    },

    // Detach an event or set of events from an element
    remove: function(elem, types, handler, selector, mappedTypes) {
        var j,
            origCount,
            tmp,
            events,
            t,
            handleObj,
            special,
            handlers,
            type,
            namespaces,
            origType,
            elemData = dataPriv.read(elem);

        if (!elemData || !(events = elemData.events)) {
            return;
        }

        // Once for each type.namespace in types; type may be omitted
        types = (types || '').match(rnothtmlwhite) || [''];
        t = types.length;
        while (t--) {
            tmp = rtypenamespace.exec(types[t]) || [];
            type = origType = tmp[1];
            namespaces = (tmp[2] || '').split('.').sort();

            // Unbind all events (on this namespace, if provided) for the element
            if (!type) {
                for (type in events) {
                    $.event.remove(
                        elem,
                        type + types[t],
                        handler,
                        selector,
                        true
                    );
                }
                continue;
            }

            special = $.event.special[type] || {};
            type = (selector ? special.delegateType : special.bindType) || type;
            handlers = events[type] || [];
            tmp =
                tmp[2] &&
                new RegExp(
                    '(^|\\.)' + namespaces.join('\\.(?:.*\\.|)') + '(\\.|$)'
                );

            // Remove matching events
            origCount = j = handlers.length;
            while (j--) {
                handleObj = handlers[j];

                if (
                    (mappedTypes || origType === handleObj.origType) &&
                    (!handler || handler.guid === handleObj.guid) &&
                    (!tmp || tmp.test(handleObj.namespace)) &&
                    (!selector ||
                        selector === handleObj.selector ||
                        (selector === '**' && handleObj.selector))
                ) {
                    handlers.splice(j, 1);

                    if (handleObj.selector) {
                        handlers.delegateCount--;
                    }
                    if (special.remove) {
                        special.remove.call(elem, handleObj);
                    }
                }
            }

            // Remove generic event handler if we removed something and no more handlers exist
            // (avoids potential for endless recursion during removal of special event handlers)
            if (origCount && !handlers.length) {
                if (
                    !special.teardown ||
                    special.teardown.call(elem, namespaces, elemData.handle) ===
                        false
                ) {
                    $.removeEvent(elem, type, elemData.handle);
                }

                delete events[type];
            }
        }

        // Remove data if it's no longer used
        if (isEmpty(events)) {
            dataPriv.remove(elem, 'handle events');
        }
    },

    dispatch: function(nativeEvent) {
        var i,
            j,
            ret,
            matched,
            handleObj,
            handlerQueue,
            args = new Array(arguments.length),
            // Make a writable $.Event from the native event object
            event = $.event.fix(nativeEvent),
            handlers =
                (dataPriv.get(this, 'events') || Object.create(null))[
                    event.type
                ] || [],
            special = $.event.special[event.type] || {};

        // Use the fix-ed $.Event rather than the (read-only) native event
        args[0] = event;

        for (i = 1; i < arguments.length; i++) {
            args[i] = arguments[i];
        }

        event.delegateTarget = this;

        // Call the preDispatch hook for the mapped type, and let it bail if desired
        if (
            special.preDispatch &&
            special.preDispatch.call(this, event) === false
        ) {
            return;
        }

        // Determine handlers
        handlerQueue = $.event.handlers.call(this, event, handlers);

        // Run delegates first; they may want to stop propagation beneath us
        i = 0;
        while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
            event.currentTarget = matched.elem;

            j = 0;
            while (
                (handleObj = matched.handlers[j++]) &&
                !event.isImmediatePropagationStopped()
            ) {
                // If the event is namespaced, then each handler is only invoked if it is
                // specially universal or its namespaces are a superset of the event's.
                if (
                    !event.rnamespace ||
                    handleObj.namespace === false ||
                    event.rnamespace.test(handleObj.namespace)
                ) {
                    event.handleObj = handleObj;
                    event.data = handleObj.data;

                    ret = (
                        ($.event.special[handleObj.origType] || {})
                            .handle || handleObj.handler
                    ).apply(matched.elem, args);

                    if (ret !== undefined) {
                        if ((event.result = ret) === false) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }
                }
            }
        }

        // Call the postDispatch hook for the mapped type
        if (special.postDispatch) {
            special.postDispatch.call(this, event);
        }

        return event.result;
    },

    handlers: function(event, handlers) {
        var i,
            handleObj,
            sel,
            matchedHandlers,
            matchedSelectors,
            handlerQueue = [],
            delegateCount = handlers.delegateCount,
            cur = event.target;

        // Find delegate handlers
        if (
            delegateCount &&
            // Support: Firefox <=42 - 66+
            // Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
            // https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
            // Support: IE 11+
            // ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
            !(event.type === 'click' && event.button >= 1)
        ) {
            for (; cur !== this; cur = cur.parentNode || this) {
                // Don't check non-elements (trac-13208)
                // Don't process clicks on disabled elements (trac-6911, trac-8165, trac-11382, trac-11764)
                if (
                    cur.nodeType === 1 &&
                    !(event.type === 'click' && cur.disabled === true)
                ) {
                    matchedHandlers = [];
                    matchedSelectors = {};
                    for (i = 0; i < delegateCount; i++) {
                        handleObj = handlers[i];

                        // Don't conflict with Object.prototype properties (trac-13203)
                        sel = handleObj.selector + ' ';

                        if (matchedSelectors[sel] === undefined) {
                            matchedSelectors[sel] = handleObj.needsContext
                                ? $(sel, this).index(cur) > -1
                                : $.find(sel, this, null, [cur]).length;
                        }
                        if (matchedSelectors[sel]) {
                            matchedHandlers.push(handleObj);
                        }
                    }
                    if (matchedHandlers.length) {
                        handlerQueue.push({
                            elem: cur,
                            handlers: matchedHandlers,
                        });
                    }
                }
            }
        }

        // Add the remaining (directly-bound) handlers
        cur = this;
        if (delegateCount < handlers.length) {
            handlerQueue.push({
                elem: cur,
                handlers: handlers.slice(delegateCount),
            });
        }

        return handlerQueue;
    },

    addProp: function(name, hook) {
        Object.defineProperty($.Event.prototype, name, {
            enumerable: true,
            configurable: true,

            get:
                typeof hook === 'function'
                    ? function() {
                        if (this.originalEvent) {
                            return hook(this.originalEvent);
                        }
                    }
                    : function() {
                        if (this.originalEvent) {
                            return this.originalEvent[name];
                        }
                    },

            set: function(value) {
                Object.defineProperty(this, name, {
                    enumerable: true,
                    configurable: true,
                    writable: true,
                    value: value,
                });
            },
        });
    },

    fix: function(originalEvent) {
        return originalEvent[$.expando]
            ? originalEvent
            : new $.Event(originalEvent);
    },
};

$.event.special = Object.create(null);

$.event.special.load = {
    // Prevent triggered image.load events from bubbling to window.load
    noBubble: true,
};

$.event.special.click = {
    // Utilize native event to ensure correct state for checkable inputs
    setup: function(data) {
        // For mutual compressibility with _default, replace `this` access with a local var.
        // `|| data` is dead code meant only to preserve the variable through minification.
        var el = this || data;

        // Claim the first handler
        if (rcheckableType.test(el.type) && el.click && nodeName(el, 'input')) {
            // dataPriv.set( el, "click", ... )
            leverageNative(el, 'click', true);
        }

        // Return false to allow normal processing in the caller
        return false;
    },
};

$.event.special.trigger = function(data) {
    // For mutual compressibility with _default, replace `this` access with a local var.
    // `|| data` is dead code meant only to preserve the variable through minification.
    var el = this || data;

    // Force setup before triggering a click
    if (rcheckableType.test(el.type) && el.click && nodeName(el, 'input')) {
        leverageNative(el, 'click');
    }

    // Return non-false to allow normal event-path propagation
    return true;
};

// For cross-browser consistency, suppress native .click() on links
// Also prevent it if we're currently inside a leveraged native-event stack
$.event.special._default = function(event) {
    var target = event.target;
    return (
        (rcheckableType.test(target.type) &&
            target.click &&
            nodeName(target, 'input') &&
            dataPriv.get(target, 'click')) ||
        nodeName(target, 'a')
    );
};

$.event.special.beforeunload = {
    postDispatch: function(event) {
        // Support: Chrome <=73+
        // Chrome doesn't alert on `event.preventDefault()`
        // as the standard mandates.
        if (event.result !== undefined && event.originalEvent) {
            event.originalEvent.returnValue = event.result;
        }
    },
};

// Ensure the presence of an event listener that handles manually-triggered
// synthetic events by interrupting progress until reinvoked in response to
// *native* events that it fires directly, ensuring that state changes have
// already occurred before other listeners are invoked.
function leverageNative(el, type, isSetup) {
    // Missing `isSetup` indicates a trigger call, which must force setup through $.event.add
    if (!isSetup) {
        if (dataPriv.get(el, type) === undefined) {
            $.event.add(el, type, returnTrue);
        }
        return;
    }

    // Register the controller as a special universal handler for all event namespaces
    dataPriv.set(el, type, false);
    $.event.add(el, type, {
        namespace: false,
        handler: function(event) {
            var result,
                saved = dataPriv.get(this, type);

            if (event.isTrigger & 1 && this[type]) {
                // Interrupt processing of the outer synthetic .trigger()ed event
                if (!saved) {
                    // Store arguments for use when handling the inner native event
                    // There will always be at least one argument (an event object), so this array
                    // will not be confused with a leftover capture object.
                    saved = Array.from(arguments);
                    dataPriv.set(this, type, saved);

                    // Trigger the native event and capture its result
                    this[type]();
                    result = dataPriv.get(this, type);
                    dataPriv.set(this, type, false);

                    if (saved !== result) {
                        // Cancel the outer synthetic event
                        event.stopImmediatePropagation();
                        event.preventDefault();

                        return result;
                    }

                    // If this is an inner synthetic event for an event with a bubbling surrogate
                    // (focus or blur), assume that the surrogate already propagated from triggering
                    // the native event and prevent that from happening again here.
                    // This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
                    // bubbling surrogate propagates *after* the non-bubbling base), but that seems
                    // less bad than duplication.
                } else if (($.event.special[type] || {}).delegateType) {
                    event.stopPropagation();
                }

                // If this is a native event triggered above, everything is now in order
                // Fire an inner synthetic event with the original arguments
            } else if (saved) {
                // ...and capture the result
                dataPriv.set(
                    this,
                    type,
                    $.event.trigger(saved[0], saved.slice(1), this)
                );

                // Abort handling of the native event by all $ handlers while allowing
                // native handlers on the same element to run. On target, this is achieved
                // by stopping immediate propagation just on the $ event. However,
                // the native event is re-wrapped by a $ one on each level of the
                // propagation so the only way to stop it for $ is to stop it for
                // everyone via native `stopPropagation()`. This is not a problem for
                // focus/blur which don't bubble, but it does also stop click on checkboxes
                // and radios. We accept this limitation.
                event.stopPropagation();
                event.isImmediatePropagationStopped = returnTrue;
            }
        },
    });
}

$.removeEvent = function(elem, type, handle) {
    // This "if" is needed for plain objects
    if (elem.removeEventListener) {
        elem.removeEventListener(type, handle);
    }
};

$.Event = function(src, props) {
    // Allow instantiation without the 'new' keyword
    if (!(this instanceof $.Event)) {
        return new $.Event(src, props);
    }

    // Event object
    if (src && src.type) {
        this.originalEvent = src;
        this.type = src.type;

        // Events bubbling up the document may have been marked as prevented
        // by a handler lower down the tree; reflect the correct value.
        this.isDefaultPrevented = src.defaultPrevented
            ? returnTrue
            : returnFalse;

        // Create target properties
        this.target = src.target;
        this.currentTarget = src.currentTarget;
        this.relatedTarget = src.relatedTarget;

        // Event type
    } else {
        this.type = src;
    }

    // Put explicitly provided properties onto the event object
    if (props) {
        Object.assign(this, props);
    }

    // Create a timestamp if incoming event doesn't have one
    this.timeStamp = (src && src.timeStamp) || Date.now();

    // Mark it as fixed
    this[$.expando] = true;
};

// $.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
$.Event.prototype = {
    constructor: $.Event,
    isDefaultPrevented: returnFalse,
    isPropagationStopped: returnFalse,
    isImmediatePropagationStopped: returnFalse,
    isSimulated: false,

    preventDefault: function() {
        var e = this.originalEvent;

        this.isDefaultPrevented = returnTrue;

        if (e && !this.isSimulated) {
            e.preventDefault();
        }
    },
    stopPropagation: function() {
        var e = this.originalEvent;

        this.isPropagationStopped = returnTrue;

        if (e && !this.isSimulated) {
            e.stopPropagation();
        }
    },
    stopImmediatePropagation: function() {
        var e = this.originalEvent;

        this.isImmediatePropagationStopped = returnTrue;

        if (e && !this.isSimulated) {
            e.stopImmediatePropagation();
        }

        this.stopPropagation();
    },
};

// Includes all common event props including KeyEvent and MouseEvent specific props
[
    'altKey',
    'bubbles',
    'cancelable',
    'changedTouches',
    'ctrlKey',
    'detail',
    'eventPhase',
    'metaKey',
    'pageX',
    'pageY',
    'shiftKey',
    'view',
    'char',
    'code',
    'charCode',
    'key',
    'keyCode',
    'button',
    'buttons',
    'clientX',
    'clientY',
    'offsetX',
    'offsetY',
    'pointerId',
    'pointerType',
    'screenX',
    'screenY',
    'targetTouches',
    'toElement',
    'touches',
    'which',
].forEach((name) => $.event.addProp(name));

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in $.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
[
    ['mouseenter', 'mouseover'],
    ['mouseleave', 'mouseout'],
    ['pointerenter', 'pointerover'],
    ['pointerleave', 'pointerout'],
].forEach(([orig, fix]) => {
    $.event.special[orig] = {
        delegateType: fix,
        bindType: fix,
        handle: function(event) {
            var ret,
                target = this,
                related = event.relatedTarget,
                handleObj = event.handleObj;

            // For mouseenter/leave call the handler if related is outside the target.
            // NB: No relatedTarget if the mouse left/entered the browser window
            if (
                !related ||
                (related !== target && !$.contains(target, related))
            ) {
                event.type = handleObj.origType;
                ret = handleObj.handler.apply(this, arguments);
                event.type = fix;
            }
            return ret;
        },
    };
});

$.fn.on = function(types, selector, data, fn) {
    return on(this, types, selector, data, fn);
};

$.fn.one = function(types, selector, data, fn) {
    return on(this, types, selector, data, fn, 1);
};

$.fn.off = function(types, selector, fn) {
    var handleObj, type;
    if (types && types.preventDefault && types.handleObj) {
        // ( event )  dispatched $.Event
        handleObj = types.handleObj;
        $(types.delegateTarget).off(
            handleObj.namespace
                ? handleObj.origType + '.' + handleObj.namespace
                : handleObj.origType,
            handleObj.selector,
            handleObj.handler
        );
        return this;
    }
    if (typeof types === 'object') {
        // ( types-object [, selector] )
        for (type in types) {
            this.off(type, selector, types[type]);
        }
        return this;
    }
    if (selector === false || typeof selector === 'function') {
        // ( types [, fn] )
        fn = selector;
        selector = undefined;
    }
    if (fn === false) {
        fn = returnFalse;
    }
    return this.each(function() {
        $.event.remove(this, types, fn, selector);
    });
};
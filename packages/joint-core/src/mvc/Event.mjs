export const Event = function(src, props) {
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
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
Event.prototype = {
    constructor: Event,
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
const props = {
    altKey: true,
    bubbles: true,
    cancelable: true,
    changedTouches: true,
    ctrlKey: true,
    detail: true,
    eventPhase: true,
    metaKey: true,
    pageX: true,
    pageY: true,
    shiftKey: true,
    view: true,
    char: true,
    code: true,
    charCode: true,
    key: true,
    keyCode: true,
    button: true,
    buttons: true,
    clientX: true,
    clientY: true,
    offsetX: true,
    offsetY: true,
    pointerId: true,
    pointerType: true,
    screenX: true,
    screenY: true,
    targetTouches: true,
    toElement: true,
    touches: true,
    which: true,
};

Object.keys(props).forEach((name) => addProp(name, props[name]));

function addProp(name, hook) {
    Object.defineProperty(Event.prototype, name, {
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
}

function returnTrue() {
    return true;
}

function returnFalse() {
    return false;
}

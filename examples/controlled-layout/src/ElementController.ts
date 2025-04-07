import { dia, linkTools, util, mvc, g } from '@joint/core';
import { End, Step, Decision, isButton, IElement } from './shapes';
import { runLayout, createExistingElementListItem, isBridge, createNewElementListItem, validChildrenCount } from './utils';
import { addEffect, effects, removeEffect } from './effects';
import { LinkRemoveTool, ElementRemoveTool } from './RemoveTool';
// import { showGhostOnNextInteraction } from './ghost-preview';
interface ElementControllerArgs {
    graph: dia.Graph;
    paper: dia.Paper;
}

export class ElementController extends mvc.Listener<[ElementControllerArgs]> {

    get context() {
        return this.callbackArguments[0];
    }

    constructor(args: ElementControllerArgs) {
        super(args);
    }

    startListening() {
        const { paper, graph } = this.context;

        this.listenTo(graph, {
            'add': onAdd
        })

        this.listenTo(paper, {
            'link:connect': onLinkConnect,
            'link:pointerclick': onLinkPointerClick,
            'link:mouseenter': onLinkMouseEnter,
            'link:mouseleave': onLinkMouseLeave,
            'blank:pointerclick': onBlankPointerClick,
            'element:pointerclick': onElementPointerClick,
            'cell:highlight': onCellHighlight,
            'cell:unhighlight': onCellUnhighlight,
            // 'element:pointerdown': (_context, elementView: dia.ElementView, evt: dia.Event) => {
            //     showGhostOnNextInteraction(paper);
            //     elementView.preventDefaultInteraction(evt);
            // }
        })
    }
}

function onAdd({ paper }: ElementControllerArgs, cell: dia.Cell, _collection: mvc.Collection, _opt: any) {
    if (isButton(cell)) return;

    closeConnectionsList(paper);
}

function onLinkConnect({ paper }: ElementControllerArgs, _linkView: dia.LinkView) {
    runLayout(paper);
}

// Add a function to handle link clicks
function onLinkPointerClick({ paper, graph }: ElementControllerArgs, linkView: dia.LinkView) {

    closeConnectionsList(paper);

    const target = linkView.model.getTargetElement();

    // Don't show remove tool if the target is a button
    if (isButton(target)) return;

    const removeTool = new LinkRemoveTool({
        distance: '50%',
        disabled: isBridge(graph, linkView.model)
    });

    linkView.addTools(new dia.ToolsView({
        tools: [removeTool]
    }));
}

function onLinkMouseEnter({ paper }: ElementControllerArgs, linkView: dia.LinkView) {

    const source = linkView.model.getSourceElement();
    const target = linkView.model.getTargetElement();

    // Don't show intermediate child tool if the target is a button
    if (isButton(target)) return;

    const intermediateChildTool = new linkTools.Button({
        attributes: {
            cursor: 'pointer'
        },
        markup: util.svg/* xml */`
            <circle r="10" fill="#fff" stroke="gray"  />
            <path d="M -4 0 4 0 M 0 -4 0 4" stroke="gray" stroke-width="2" />
        `,
        distance: '50%',
        action: (_evt, view) => {

            const { x, y } = paper.localToPagePoint(view.getPointAtRatio(0.5));
            // Open the connections list at the buttons's position
            connectionsList.style.left = `${x}px`;
            connectionsList.style.top = `${y}px`;
            const scale = paper.scale().sx;
            const clampedScale = Math.max(0.75, Math.min(scale, 1.25));
            connectionsList.style.transform = `scale(${clampedScale}) translate(-50%, -50%)`;
            openConnectionsList(paper, source, view.getPointAtRatio(0.5), target);
        },
    });

    linkView.addTools(new dia.ToolsView({
        tools: [intermediateChildTool]
    }));
}

function onLinkMouseLeave(_context: ElementControllerArgs, linkView: dia.LinkView) {
    linkView.removeTools();
}

function onBlankPointerClick({ paper }: ElementControllerArgs) {
    closeConnectionsList(paper);
    paper.removeTools();
}

function onElementPointerClick({ paper, graph }: ElementControllerArgs, elementView: dia.ElementView) {

    closeConnectionsList(paper);
    paper.removeTools();
    const { model } = elementView;
    const [parent] = graph.getNeighbors(model, { inbound: true });

    if (!isButton(model)) {
        // Add remove button if the element can be removed

        let canBeRemoved = true;

        if (!parent) {
            canBeRemoved = false;
        } else {
            const maxChildren = (parent as IElement)?.getMaxNumberOfChildren();
            const currentChildren = validChildrenCount(parent, graph) - 1;
            const possibleChildren = validChildrenCount(model, graph);

            canBeRemoved = currentChildren + possibleChildren <= maxChildren;
        }

        const removeButton = new ElementRemoveTool({
            x: '100%',
            y: '50%',
            offset: { x: 10 },
            disabled: !canBeRemoved
        });

        const elementsTools = new dia.ToolsView({
            tools: [removeButton]
        });

        elementView.addTools(elementsTools);
        return;
    }

    // Open the connections list at the buttons's position
    const { x } = paper.localToPagePoint(model.getBBox().center());
    const { y } = paper.localToPagePoint(model.getBBox().topLeft());
    connectionsList.style.left = `${x}px`;
    connectionsList.style.top = `${y}px`;
    const scale = paper.scale().sx;
    const clampedScale = Math.max(0.75, Math.min(scale, 1.25));
    connectionsList.style.transform = `scale(${clampedScale}) translate(-50%, 0)`;

    addEffect(parent.findView(paper), effects.CONNECTION_SOURCE);
    openConnectionsList(paper, parent, model.position());
}

function onCellHighlight(_context: ElementControllerArgs, cellView: dia.CellView, _node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    if (type !== dia.CellView.Highlighting.CONNECTING) return;

    addEffect(cellView, effects.CONNECTION_SOURCE);
}

function onCellUnhighlight({ paper }: ElementControllerArgs, _cellView: dia.CellView, _node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    if (type !== dia.CellView.Highlighting.CONNECTING) return;

    removeEffect(paper, effects.CONNECTION_SOURCE);
}

const connectionsList = document.querySelector<HTMLDivElement>('#connections-list')!;

function openConnectionsList(paper: dia.Paper, parent: dia.Element, buttonPosition: g.Point, insertBefore?: dia.Element) {

    closeConnectionsList(paper);
    connectionsList.style.display = 'block';

    const graph = paper.model;

    // New Connections
    const addElementSubtitle = document.createElement('h3');
    addElementSubtitle.textContent = 'Add element:';
    connectionsList.appendChild(addElementSubtitle);

    const addElementList = document.createElement('div');
    addElementList.classList.add('element-list');

    const { x, y } = buttonPosition;

    const newStepItem = createNewElementListItem(Step.create().position(x, y), parent, paper, insertBefore);
    const newDecisionItem = createNewElementListItem(Decision.create().position(x, y), parent, paper, insertBefore);

    addElementList.appendChild(newStepItem);
    addElementList.appendChild(newDecisionItem);

    if (!insertBefore) {
        const newEndItem = createNewElementListItem(End.create().position(x, y), parent, paper, insertBefore);
        addElementList.appendChild(newEndItem);
    }

    connectionsList.appendChild(addElementList);

    // Existing Connections

    const intermediateChildren = graph.getNeighbors(parent, { outbound: true });

    const elements = graph
        .getElements()
        .filter((element) => !isButton(element) && element.id !== parent.id)
        .filter((element) => !intermediateChildren.some(child => child.id === element.id));

    // No elements to connect to or element is being inserted between two elements
    if (elements.length === 0 || insertBefore) return;

    const connectionsSubtitle = document.createElement('h3');
    connectionsSubtitle.textContent = 'Make connection to:';
    connectionsList.appendChild(connectionsSubtitle);

    const availableConnections = document.createElement('div');
    availableConnections.classList.add('element-list');

    elements.forEach((element) => {
        availableConnections.appendChild(createExistingElementListItem(parent, element, paper));
    });

    connectionsList.appendChild(availableConnections);
}

function closeConnectionsList(paper: dia.Paper) {
    connectionsList.style.display = 'none';
    // Clear all child elements from the connections list
    connectionsList.innerHTML = '';
    removeEffect(paper, effects.CONNECTION_SOURCE);
}

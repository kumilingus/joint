import { dia, mvc } from '@joint/core';
import { Button, ButtonLink, Placeholder } from '../diagram-engine/shapes';
import { addEdge, sortNodes } from '../diagram-engine/data-api';
import { addEffect, effects, removeEffect } from './effects';
import { showOrderPreviewOnNextInteraction } from './order-preview';
import { closeConnectionsList, openPlaceholderMenu, openButtonMenu, addLinkTools, addElementTools, addLinkHoverTools } from './actions';
import { GrowthLimit, MakeElement, buildDiagram, BuildDiagramOptions } from '../diagram-engine';

export interface DiagramControllerContext {
    graph: dia.Graph;
    paper: dia.Paper;
    json: any;
    makeElement: MakeElement;
    growthLimit: GrowthLimit;
    updateDiagram: (opt?: BuildDiagramOptions) => void;
}

export class DiagramController extends mvc.Listener<[DiagramControllerContext]> {

    get context() {
        return this.callbackArguments[0];
    }

    constructor(ctx: Omit<DiagramControllerContext, 'updateDiagram' | 'graph'>) {
        const graph = ctx.paper.model;
        const updateDiagram = ((opt: BuildDiagramOptions = {}) => {
            const { json, paper } = ctx;
            buildDiagram(json, paper.model, {
                makeElement: ctx.makeElement,
                growthLimit: ctx.growthLimit,
                ...opt
            });
        });
        const extendedCtx = {
            ...ctx,
            graph,
            updateDiagram
        };
        super(extendedCtx);
    }

    build(opt?: BuildDiagramOptions) {
        this.context.updateDiagram(opt);
    }

    startListening() {
        const { paper, graph } = this.context;

        this.listenTo(graph, {
            'add': onAdd,
            'request-layout': ({ updateDiagram }, opt) => updateDiagram(opt)
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
            'element:pointerdown': onElementPointerdown,
        })
    }
}

function onElementPointerdown(ctx: DiagramControllerContext, elementView: dia.ElementView, evt: dia.Event) {
    if (Button.isButton(elementView.model)) return;
    showOrderPreviewOnNextInteraction(ctx);
    elementView.preventDefaultInteraction(evt);
}

function onAdd(ctx: DiagramControllerContext, cell: dia.Cell, _collection: mvc.Collection, _opt: any) {

    if (Button.isButton(cell)) return;
    closeConnectionsList(ctx);
}

function onLinkConnect(ctx: DiagramControllerContext, linkView: dia.LinkView) {
    const { json, graph, updateDiagram } = ctx;
    const link = linkView.model;

    addEdge(json, link.source().id, link.target().id);
    updateDiagram({ disableOptimalOrderHeuristic: false });
    sortNodes(json, graph);
}

function onLinkPointerClick(ctx: DiagramControllerContext, linkView: dia.LinkView) {
    const { paper } = ctx;
    const link = linkView.model;

    closeConnectionsList(ctx);
    paper.removeTools();

    if (ButtonLink.isButtonLink(link)) return;
    addLinkTools(ctx, linkView);
}

function onLinkMouseEnter(ctx: DiagramControllerContext, linkView: dia.LinkView) {
    const link = linkView.model;

    if (ButtonLink.isButtonLink(link)) return;
    if (linkView.hasTools('persistent-tool')) return;
    addLinkHoverTools(ctx, linkView);
}

function onLinkMouseLeave(_ctx: DiagramControllerContext, linkView: dia.LinkView) {

    if (linkView.hasTools('hover-tool')) {
        linkView.removeTools();
    }
}

function onBlankPointerClick(ctx: DiagramControllerContext) {
    const { paper } = ctx;

    closeConnectionsList(ctx);
    paper.removeTools();
}

function onElementPointerClick(ctx: DiagramControllerContext, elementView: dia.ElementView) {
    const { paper } = ctx;
    const element = elementView.model;

    closeConnectionsList(ctx);
    paper.removeTools();

    if (Placeholder.isPlaceholder(element)) {
        openPlaceholderMenu(ctx, element);
        return;
    }

    if (Button.isButton(element)) {
        openButtonMenu(ctx, element);
        return;
    }

    // Add remove button if the element can be removed
    addElementTools(ctx, elementView);
}

function onCellHighlight(_context: DiagramControllerContext, cellView: dia.CellView, _node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    if (type !== dia.CellView.Highlighting.CONNECTING) return;
    addEffect(cellView, effects.CONNECTION_SOURCE);
}

function onCellUnhighlight({ paper }: DiagramControllerContext, _cellView: dia.CellView, _node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    if (type !== dia.CellView.Highlighting.CONNECTING) return;

    removeEffect(paper, effects.CONNECTION_SOURCE);
}

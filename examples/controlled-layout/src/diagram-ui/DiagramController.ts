import { dia, mvc } from '@joint/core';
import { Button, ButtonLink, Placeholder } from '../diagram-engine/shapes';
import { addEdge, sortNodes } from '../diagram-engine/data-api';
import { addEffect, effects, removeEffect } from './effects';
import { showOrderPreviewOnNextInteraction } from './order-preview';
import { addLinkTools, addElementTools, addLinkHoverTools } from './tools';
import { GrowthLimit, MakeElement, buildDiagram, BuildDiagramOptions } from '../diagram-engine';

export interface DiagramContext {
    graph: dia.Graph;
    paper: dia.Paper;
    json: any;
    makeElement: MakeElement;
    growthLimit: GrowthLimit;
    updateDiagram: (opt?: BuildDiagramOptions) => void;
}

export class DiagramController extends mvc.Listener<[DiagramContext]> {

    get context() {
        return this.callbackArguments[0];
    }

    constructor(ctx: Omit<DiagramContext, 'updateDiagram' | 'graph'>) {
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
        const { paper } = this.context;

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

function onElementPointerdown(ctx: DiagramContext, elementView: dia.ElementView, evt: dia.Event) {
    if (Button.isButton(elementView.model)) return;
    showOrderPreviewOnNextInteraction(ctx);
    elementView.preventDefaultInteraction(evt);
}

function onLinkConnect(ctx: DiagramContext, linkView: dia.LinkView) {
    const { json, graph, updateDiagram } = ctx;
    const link = linkView.model;

    addEdge(json, link.source().id, link.target().id);
    updateDiagram({ disableOptimalOrderHeuristic: false });
    sortNodes(json, graph);
}

function onLinkPointerClick(ctx: DiagramContext, linkView: dia.LinkView) {
    const { paper } = ctx;
    const link = linkView.model;

    paper.removeTools();

    if (ButtonLink.isButtonLink(link)) return;
    addLinkTools(ctx, linkView);
}

function onLinkMouseEnter(ctx: DiagramContext, linkView: dia.LinkView) {
    const link = linkView.model;

    if (ButtonLink.isButtonLink(link)) return;
    if (linkView.hasTools('persistent-tool')) return;
    addLinkHoverTools(ctx, linkView);
}

function onLinkMouseLeave(_ctx: DiagramContext, linkView: dia.LinkView) {

    if (linkView.hasTools('hover-tool')) {
        linkView.removeTools();
    }
}

function onBlankPointerClick(ctx: DiagramContext) {
    const { paper } = ctx;
    paper.removeTools();
}

function onElementPointerClick(ctx: DiagramContext, elementView: dia.ElementView) {
    const { paper } = ctx;
    const element = elementView.model;

    paper.removeTools();

    if (Placeholder.isPlaceholder(element)) {
        paper.trigger('placeholder:pointerclick', elementView);
        return;
    }

    if (Button.isButton(element)) {
        paper.trigger('button:pointerclick', elementView);
        return;
    }

    // Add remove button if the element can be removed
    addElementTools(ctx, elementView);
}

function onCellHighlight(_context: DiagramContext, cellView: dia.CellView, _node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    if (type !== dia.CellView.Highlighting.CONNECTING) return;
    addEffect(cellView, effects.CONNECTION_SOURCE);
}

function onCellUnhighlight({ paper }: DiagramContext, _cellView: dia.CellView, _node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    if (type !== dia.CellView.Highlighting.CONNECTING) return;

    removeEffect(paper, effects.CONNECTION_SOURCE);
}

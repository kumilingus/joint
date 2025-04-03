import { dia, elementTools, linkTools } from "@joint/core";
import { IElement, isButton } from "./shapes";
import { addButtonToElement, runLayout } from "./utils";

export class ElementRemoveTool extends elementTools.Remove {

    constructor(opt: elementTools.Button.Options = {}) {
        opt.action = (_evt: dia.Event, view: dia.ElementView, tool: elementTools.Button) => {
            const { model } = view;

            const paper = view.paper;
            const graph = paper.model;

            // Clean up button
            const button = graph.getNeighbors(model, { outbound: true }).find(isButton);
            button?.remove();

            const predecessors = graph.getNeighbors(model, { inbound: true });

            const inboundLinks = graph.getConnectedLinks(model, { inbound: true });
            inboundLinks.forEach((link) => link.remove());

            graph.transferCellConnectedLinks(model, predecessors[0]);

            predecessors.forEach((predecessor) => {
                const maxChildren = (predecessor as IElement).getMaxNumberOfChildren();
                const currentChildren = graph.getNeighbors(predecessor, { outbound: true });

                if (currentChildren.length < maxChildren && !currentChildren.some(isButton)) {
                    addButtonToElement(predecessor, graph);
                }
            });

            view.model.remove({ ui: true, tool: tool.cid });

            runLayout(paper);
        }
        super(opt);
    }
}

export class LinkRemoveTool extends linkTools.Remove {
    constructor(opt: linkTools.Button.Options = {}) {
        opt.action = (_evt: dia.Event, view: dia.LinkView, tool: linkTools.Remove) => {
            const paper = view.paper;
            const graph = paper.model;
            const parent = view.model.getSourceElement();

            view.model.remove({ ui: true, cid: tool.cid });

            const children = graph.getNeighbors(parent, { outbound: true });
            const currentChildren = children.reduce((acc, child) => {
                if (isButton(child)) return acc;
                return acc + 1;
            }, 0);

            const maxChildren = (parent as IElement)?.getMaxNumberOfChildren();

            if (currentChildren < maxChildren) {
                addButtonToElement(parent, graph);
            }

            runLayout(paper);
        }
        super(opt);
    }
}

import { dia, shapes } from "@joint/core";

import { fitContent } from "./app/utils";
import { Decision, End, Step, DECISION_TYPE, END_TYPE, STEP_TYPE } from "./app/shapes";
import { closeMenu, openButtonMenu, openLinkButtonMenu, openPlaceholderMenu } from './app/menu';

import type { GrowthLimit, MakeElement, DiagramData, NodeData  } from './diagram-engine';
import * as engineShapes from './diagram-engine/shapes';
import * as paperOptions from "./diagram-engine/paper-options";

import { DiagramController } from "./diagram-ui/DiagramController";

import '../css/styles.css';

const cellNamespace = {
    ...shapes,
    ...engineShapes,
    End,
    Step,
    Decision,

}
const graph = new dia.Graph({}, { cellNamespace });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: cellNamespace,
    el: document.querySelector('#paper'),
    width: '100%',
    height: '100%',
    async: true,
    ...paperOptions,
});

type DiagramNode = typeof STEP_TYPE | typeof DECISION_TYPE | typeof END_TYPE;

const json: DiagramData<DiagramNode> = {
    nodes: {
        'start': { type: 'Step', to: [{ id: 'd' }] },
        'd': {
            type: 'Decision',
            to: [
                { id: 'e', label: 'Branch 1' },
                { id: 'f', label: 'Branch 2' },
                { id: 'g', label: 'Branch 3' },
            ]
        },
        'g': { type: 'End' },
    },
};

const makeElement: MakeElement = (node: NodeData, id: string) => {
    switch (node.type) {
        case END_TYPE:
            return End.create(id);
        case DECISION_TYPE:
            return Decision.create(id).attr('label/text', node.label || 'Decision');
        case STEP_TYPE:
            return Step.create(id);
        default:
            throw new Error(`Unknown element type: ${node.type}`);
    }
}

const growthLimit: GrowthLimit = (element: dia.Element) => {
    const type = element.get('type');
    switch (type) {
        case END_TYPE:
            return 0;
        case DECISION_TYPE:
            return Infinity;
        case STEP_TYPE:
            return 1;
        default:
            throw new Error(`Unknown element type: ${type}`);
    }
}

const diagramController = new DiagramController({
    paper,
    json,
    makeElement,
    growthLimit,
});

diagramController.startListening();
diagramController.listenTo(paper, {
    'link:button:pointerclick': openLinkButtonMenu,
    'button:pointerclick': openButtonMenu,
    'placeholder:pointerclick': openPlaceholderMenu,
    'blank:pointerdown cell:pointerdown': closeMenu
});

diagramController.build();
fitContent(paper);

window.addEventListener('resize', () => fitContent(paper));

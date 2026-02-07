import { dia, shapes } from '@joint/core';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { MalePerson, FemalePerson, UnknownPerson } from './shapes';
import { getPersonNodes, getParentChildLinks, getMateLinks, PersonNode } from './data';
import './styles.css';

const cellNamespace = {
    ...shapes,
    genogram: { MalePerson, FemalePerson, UnknownPerson }
};

const graph = new dia.Graph({}, { cellNamespace });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: cellNamespace,
    width: 1,
    height: 1,
    gridSize: 1,
    interactive: false,
    async: true,
    frozen: true,
    background: { color: '#f9f9f9' },
    defaultConnector: {
        name: 'straight',
        // args: { cornerType: 'cubic', cornerRadius: 10 }
    },
    defaultConnectionPoint: { name: 'rectangle', args: { useModelGeometry: true } },
    defaultAnchor: {
        name: 'center',
        args: { useModelGeometry: true }
    },
    // defaultRouter: {
    //     name: 'rightAngle',
    //     args: {
    //         useVertices: true
    //     }
    // }
});

document.getElementById('paper-container')!.appendChild(paper.el);

// Parse data
const persons = getPersonNodes();
const parentChildLinks = getParentChildLinks(persons);
const mateLinks = getMateLinks();

// Build a lookup from person key to element id
const keyToId = new Map<number, string>();

// Create elements
const elements: dia.Element[] = persons.map((person) => {
    const el = createPersonElement(person);
    keyToId.set(person.key, el.id as string);
    return el;
});

// Create couple containers — embed both partners so layout treats them as one unit
const coupleContainers: dia.Element[] = [];
const embeddedPersonIds = new Set<string>();
// Map each person element ID to their partner's element ID
const mateOf = new Map<string, string>();

for (const ml of mateLinks) {
    if (!keyToId.has(ml.from) || !keyToId.has(ml.to)) continue;

    const fromId = keyToId.get(ml.from)!;
    const toId = keyToId.get(ml.to)!;

    // Skip if either partner is already in a couple container
    if (embeddedPersonIds.has(fromId) || embeddedPersonIds.has(toId)) continue;

    const container = new shapes.standard.Rectangle({
        attrs: {
            body: {
                fill: 'transparent',
                stroke: 'none',
            },
            label: { text: '' }
        }
    });

    const fromEl = elements.find((e) => e.id === fromId)!;
    const toEl = elements.find((e) => e.id === toId)!;
    container.embed(fromEl);
    container.embed(toEl);

    embeddedPersonIds.add(fromId);
    embeddedPersonIds.add(toId);
    mateOf.set(fromId, toId);
    mateOf.set(toId, fromId);
    coupleContainers.push(container);
}

// Create parent→child links (used for layout)
const links: dia.Link[] = parentChildLinks.map((rel) => {
    return new shapes.standard.Link({
        source: {
            id: keyToId.get(rel.parentKey)!,
        },
        target: {
            id: keyToId.get(rel.childKey)!,
        },
        z: -1,
        attrs: {
            line: {
                stroke: '#666',
                strokeWidth: 1.5,
                targetMarker: {
                    type: 'path',
                    d: 'M 10 -5 0 0 10 5 z',
                    fill: '#666'
                }
            }
        }
    });
});

// Add all cells to graph, then layout (containers first so embedding is recognized)
graph.resetCells([...coupleContainers, ...elements, ...links]);

DirectedGraph.layout(graph, {
    rankDir: 'TB',
    nodeSep: 20,
    rankSep: 70,
    ranker: 'tight-tree',
    // align: 'DR',
    // setVertices: true
});

// For links starting in a couple, add a vertex at the midpoint of the two partners
for (const link of links) {
    const sourceId = (link.source() as { id: string }).id;
    const partnerId = mateOf.get(sourceId);
    if (!partnerId) continue;

    const sourceEl = graph.getCell(sourceId) as dia.Element;
    const partnerEl = graph.getCell(partnerId) as dia.Element;
    const sourceCenter = sourceEl.getBBox().center();
    const partnerCenter = partnerEl.getBBox().center();

    const targetId = (link.target() as { id: string }).id;
    const targetEl = graph.getCell(targetId) as dia.Element;
    const targetCenter = targetEl.getBBox().center();

    const midX = (sourceCenter.x + partnerCenter.x) / 2;
    const midY = (sourceCenter.y + partnerCenter.y) / 2;
    const halfwayY = (midY + targetCenter.y) / 2;

    link.vertices([
        { x: midX, y: midY },
        { x: midX, y: halfwayY },
        { x: targetCenter.x, y: halfwayY }
    ]);
}

// Add mate (partner) links AFTER layout to avoid breaking the DAG
const mateJointLinks: dia.Link[] = mateLinks
    .filter((ml) => keyToId.has(ml.from) && keyToId.has(ml.to))
    .map((ml) => {
        return new shapes.standard.Link({
            source: {
                id: keyToId.get(ml.from)!,
                anchor: { name: 'center', args: { useModelGeometry: true } }
            },
            target: {
                id: keyToId.get(ml.to)!,
                anchor: { name: 'center', args: { useModelGeometry: true } }
            },
            z: 2,
            attrs: {
                line: {
                    stroke: '#c44a80',
                    strokeWidth: 3,
                    targetMarker: null,
                    sourceMarker: null
                }
            },
            router: { name: 'normal' }
        });
    });

if (mateJointLinks.length > 0) {
    graph.addCells(mateJointLinks);
}

// Fit paper to content and unfreeze
paper.fitToContent({
    useModelGeometry: true,
    padding: 40,
    allowNewOrigin: 'any'
});
paper.unfreeze();

// --- Helpers ---

function createPersonElement(person: PersonNode): dia.Element {
    let el: dia.Element;

    switch (person.sex) {
        case 'M':
            el = new MalePerson();
            break;
        case 'F':
            el = new FemalePerson();
            break;
        default:
            el = new UnknownPerson();
            break;
    }

    el.attr('label/text', person.name);

    // Deceased: show diagonal line + reduce body opacity
    if (person.death === true || (typeof person.death === 'string' && person.death !== '')) {
        el.attr('deceasedLine/display', 'block');
        el.attr('body/opacity', 0.6);
    }

    return el;
}

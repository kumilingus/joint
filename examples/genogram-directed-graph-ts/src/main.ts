import { dia, shapes } from '@joint/core';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { MalePerson, FemalePerson, UnknownPerson, ELEMENT_WIDTH, COUPLE_WIDTH, COUPLE_HEIGHT } from './shapes';
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

// Create couple containers that will replace both partners in the layout.
// The individual person elements are added to the graph but excluded from layout.
const coupleContainers: dia.Element[] = [];
const personIdToContainer = new Map<string, dia.Element>();
// Map each person element ID to their partner's element ID
const mateOf = new Map<string, string>();
// Track which person IDs are part of a couple (excluded from layout)
const coupledPersonIds = new Set<string>();

interface CoupleInfo {
    container: dia.Element;
    fromId: string;
    toId: string;
}
const coupleInfos: CoupleInfo[] = [];

for (const ml of mateLinks) {
    if (!keyToId.has(ml.from) || !keyToId.has(ml.to)) continue;

    const fromId = keyToId.get(ml.from)!;
    const toId = keyToId.get(ml.to)!;

    // Skip if either partner is already in a couple container
    if (coupledPersonIds.has(fromId) || coupledPersonIds.has(toId)) continue;

    const container = new shapes.standard.Rectangle({
        size: { width: COUPLE_WIDTH, height: COUPLE_HEIGHT },
        attrs: {
            body: {
                fill: 'transparent',
                stroke: 'none',
            },
            label: { text: '' }
        }
    });

    coupledPersonIds.add(fromId);
    coupledPersonIds.add(toId);
    mateOf.set(fromId, toId);
    mateOf.set(toId, fromId);
    personIdToContainer.set(fromId, container);
    personIdToContainer.set(toId, container);
    coupleContainers.push(container);
    coupleInfos.push({ container, fromId, toId });
}

// Resolve the layout ID for a person: container if coupled, own ID otherwise
function layoutId(personElId: string): string {
    const container = personIdToContainer.get(personElId);
    return container ? container.id as string : personElId;
}

// Solo (non-coupled) person elements participate in layout directly
const soloElements = elements.filter((el) => !coupledPersonIds.has(el.id as string));

// Create parent→child links, pointing to containers for layout.
// Store original person IDs so we can reconnect after layout.
interface LinkInfo {
    link: dia.Link;
    realSourceId: string;
    realTargetId: string;
}
const linkInfos: LinkInfo[] = parentChildLinks.map((rel) => {
    const realSourceId = keyToId.get(rel.parentKey)!;
    const realTargetId = keyToId.get(rel.childKey)!;

    const link = new shapes.standard.Link({
        source: { id: layoutId(realSourceId) },
        target: {
            id: layoutId(realTargetId),
        },
        z: -1,
        attrs: {
            line: {
                stroke: '#666',
                strokeWidth: 1.5,
                targetMarker: null,
            }
        }
    });
    return { link, realSourceId, realTargetId };
});
const links = linkInfos.map((li) => li.link);

// Layout only containers + solo elements + links
graph.resetCells([...coupleContainers, ...soloElements, ...links]);

DirectedGraph.layout(graph, {
    rankDir: 'TB',
    nodeSep: 20,
    rankSep: 70,
    ranker: 'tight-tree',
    // align: 'DR',
    // setVertices: true,
    disableOptimalOrderHeuristic: true
});

// Position couple members inside their containers and add them to the graph
const gap = COUPLE_WIDTH - ELEMENT_WIDTH * 2;
for (const { container, fromId, toId } of coupleInfos) {
    const pos = container.position();
    const fromEl = elements.find((e) => e.id === fromId)!;
    const toEl = elements.find((e) => e.id === toId)!;

    fromEl.position(pos.x, pos.y);
    toEl.position(pos.x + ELEMENT_WIDTH + gap, pos.y);
}
// Add the coupled person elements to the graph
const coupledElements = elements.filter((el) => coupledPersonIds.has(el.id as string));
graph.addCells(coupledElements);

// Build lookup: element ID → multiple group (for twins/triplets)
const personByElId = new Map<string, PersonNode>();
for (const person of persons) {
    const elId = keyToId.get(person.key);
    if (elId) personByElId.set(elId, person);
}

// Identify twin/triplet groups: key = "sourceContainerId|multipleValue"
// A child is a twin/triplet if it has a `multiple` field
function twinGroupKey(sourceContainerId: string, targetPersonId: string): string | null {
    const person = personByElId.get(targetPersonId);
    if (!person || person.multiple === undefined) return null;
    return `${sourceContainerId}|${person.multiple}`;
}

// Reconnect links from containers back to the real person elements and set vertices.
const containerIdSet = new Set(coupleContainers.map((c) => c.id as string));

// Pre-compute twin/triplet group fork points (average X of members in each group)
const twinGroupMembers = new Map<string, string[]>(); // groupKey → [targetElId, ...]
for (const { realSourceId, realTargetId } of linkInfos) {
    const sourceContainer = personIdToContainer.get(realSourceId);
    if (!sourceContainer) continue;
    const gKey = twinGroupKey(sourceContainer.id as string, realTargetId);
    if (!gKey) continue;
    const members = twinGroupMembers.get(gKey) || [];
    members.push(realTargetId);
    twinGroupMembers.set(gKey, members);
}

const twinGroupForkX = new Map<string, number>();
for (const [gKey, memberIds] of twinGroupMembers) {
    // Only treat as a twin/triplet group if there are 2+ members
    if (memberIds.length < 2) continue;
    const uniqueIds = [...new Set(memberIds)];
    const avgX = uniqueIds.reduce((sum, id) => {
        return sum + (graph.getCell(id) as dia.Element).getBBox().center().x;
    }, 0) / uniqueIds.length;
    twinGroupForkX.set(gKey, avgX);
}

for (const { link, realSourceId, realTargetId } of linkInfos) {
    const sourceLayoutId = (link.source() as { id: string }).id;
    const targetLayoutId = (link.target() as { id: string }).id;
    const sourceWasContainer = containerIdSet.has(sourceLayoutId);
    const targetWasContainer = containerIdSet.has(targetLayoutId);

    // Reconnect to real persons
    link.source({ id: realSourceId });
    link.target({
        id: realTargetId,
        anchor: { name: 'top', args: { useModelGeometry: true } }
     });

    // If the source was a couple container, add vertices through the couple midpoint
    if (sourceWasContainer) {
        const partnerId = mateOf.get(realSourceId)!;
        const sourceEl = graph.getCell(realSourceId) as dia.Element;
        const partnerEl = graph.getCell(partnerId) as dia.Element;
        const targetEl = graph.getCell(realTargetId) as dia.Element;

        const sourceCenter = sourceEl.getBBox().center();
        const partnerCenter = partnerEl.getBBox().center();
        const targetCenter = targetEl.getBBox().center();

        const midX = (sourceCenter.x + partnerCenter.x) / 2;
        const midY = (sourceCenter.y + partnerCenter.y) / 2;
        const halfwayY = (midY + targetCenter.y) / 2;

        // Check if this target belongs to a twin/triplet group
        const gKey = twinGroupKey(sourceLayoutId, realTargetId);
        const forkX = gKey ? twinGroupForkX.get(gKey) : undefined;

        if (forkX !== undefined) {
            // Twins/triplets: shared fork point at the group's center X
            link.vertices([
                { x: midX, y: midY },
                { x: midX, y: halfwayY },
                { x: forkX, y: halfwayY }
            ]);
        } else {
            link.vertices([
                { x: midX, y: midY },
                { x: midX, y: halfwayY },
                { x: targetCenter.x, y: halfwayY }
            ]);
        }
    }

    // If the target was a couple container, add a vertex to route into the correct person
    if (targetWasContainer && !sourceWasContainer) {
        const targetEl = graph.getCell(realTargetId) as dia.Element;
        const targetCenter = targetEl.getBBox().center();
        const sourceEl = graph.getCell(realSourceId) as dia.Element;
        const sourceCenter = sourceEl.getBBox().center();
        const halfwayY = (sourceCenter.y + targetCenter.y) / 2;

        link.vertices([
            { x: sourceCenter.x, y: halfwayY },
            { x: targetCenter.x, y: halfwayY }
        ]);
    }
}

// Remove containers from the graph — no longer needed
for (const container of coupleContainers) {
    container.remove();
}

// Add mate (partner) links
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

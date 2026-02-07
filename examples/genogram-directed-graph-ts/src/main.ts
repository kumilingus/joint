import { dia, shapes, highlighters } from '@joint/core';
import { MalePerson, FemalePerson, UnknownPerson, ParentChildLink, MateLink, IdenticalLink } from './shapes';
import { colors, sizes } from './theme';
import { getPersonNodes, getParentChildLinks, getMateLinks, PersonNode } from './data';
import { layoutGenogram } from './layout';
import './styles.css';

const cellNamespace = {
    ...shapes,
    genogram: { MalePerson, FemalePerson, UnknownPerson, ParentChildLink, MateLink, IdenticalLink }
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
    background: { color: colors.paperBackground },
    defaultConnector: {
        name: 'straight',
    },
    defaultConnectionPoint: { name: 'rectangle', args: { useModelGeometry: true } },
    defaultAnchor: {
        name: 'center',
        args: { useModelGeometry: true }
    }
});

document.getElementById('paper-container')!.appendChild(paper.el);

// Parse data
const persons = getPersonNodes();
const parentChildLinks = getParentChildLinks(persons);
const mateLinks = getMateLinks(persons);

// Create elements
const elements: dia.Element[] = persons.map((person) => createPersonElement(person));

// Run layout
layoutGenogram({ graph, elements, persons, parentChildLinks, mateLinks });

// Fit paper to content and unfreeze
paper.fitToContent({
    useModelGeometry: true,
    padding: sizes.paperPadding,
    allowNewOrigin: 'any'
});
paper.unfreeze();

// --- Hover highlighting: ancestors & descendants ---

// Build family tree lookups by person id
const childToParentIds = new Map<number, number[]>();
const parentToChildIds = new Map<number, number[]>();
for (const person of persons) {
    const parentIds: number[] = [];
    if (typeof person.mother === 'number') parentIds.push(person.mother);
    if (typeof person.father === 'number') parentIds.push(person.father);
    childToParentIds.set(person.id, parentIds);
    for (const pid of parentIds) {
        if (!parentToChildIds.has(pid)) parentToChildIds.set(pid, []);
        parentToChildIds.get(pid)!.push(person.id);
    }
}

function getAncestors(id: number, visited = new Set<number>()): Set<number> {
    for (const parentId of childToParentIds.get(id) || []) {
        if (visited.has(parentId)) continue;
        visited.add(parentId);
        getAncestors(parentId, visited);
    }
    return visited;
}

function getDescendants(id: number, visited = new Set<number>()): Set<number> {
    for (const childId of parentToChildIds.get(id) || []) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        getDescendants(childId, visited);
    }
    return visited;
}

const personIds = new Set(persons.map((p) => String(p.id)));

const HIGHLIGHT_DIM = 'lineage-dim';
const HIGHLIGHT_FOCUS = 'lineage-focus';

paper.on('element:mouseenter', (cellView: dia.ElementView) => {
    const elId = cellView.model.id as string;
    if (!personIds.has(elId)) return;
    const personId = Number(elId);

    const relatedIds = new Set<number>([personId]);
    for (const k of getAncestors(personId)) relatedIds.add(k);
    for (const k of getDescendants(personId)) relatedIds.add(k);

    const relatedElIds = new Set<string>();
    for (const k of relatedIds) relatedElIds.add(String(k));

    // Highlight hovered element with stroke
    highlighters.stroke.add(cellView, 'body', HIGHLIGHT_FOCUS, {
        padding: 1,
        layer: dia.Paper.Layers.BACK,
        attrs: {
            class: 'highlighted',
            stroke: colors.highlightStroke,
            strokeWidth: 10,
        }
    });

    // Dim non-related elements
    for (const el of graph.getElements()) {
        if (relatedElIds.has(el.id as string)) continue;
        const view = paper.findViewByModel(el);
        if (view) {
            highlighters.addClass.add(view, 'root', HIGHLIGHT_DIM, { className: 'dimmed' });
        }
    }

    // Dim non-related links
    for (const link of graph.getLinks()) {
        const sourceId = (link.source() as { id?: string }).id;
        const targetId = (link.target() as { id?: string }).id;
        const sourceRelated = sourceId ? relatedElIds.has(sourceId) : false;
        const targetRelated = targetId ? relatedElIds.has(targetId) : false;
        if (sourceRelated && targetRelated) continue;

        const view = paper.findViewByModel(link);
        if (view) {
            highlighters.addClass.add(view, 'root', HIGHLIGHT_DIM, { className: 'dimmed' });
        }
    }
});

paper.on('element:mouseleave', () => {
    highlighters.addClass.removeAll(paper, HIGHLIGHT_DIM);
    highlighters.stroke.removeAll(paper, HIGHLIGHT_FOCUS);
});

// --- Helpers ---

function createPersonElement(person: PersonNode): dia.Element {
    let el: dia.Element;

    switch (person.sex) {
        case 'M':
            el = new MalePerson({ id: String(person.id) });
            break;
        case 'F':
            el = new FemalePerson({ id: String(person.id) });
            break;
        default:
            el = new UnknownPerson({ id: String(person.id) });
            break;
    }

    el.attr('name/text', person.name);

    // Tooltip with full name and dates
    const birthYear = person.dob ? person.dob.slice(0, 4) : '?';
    const deathYear = person.dod ? person.dod.slice(0, 4) : '*';
    el.attr('root/title', `${person.name} (${birthYear}–${deathYear})`);

    // Compute and display age
    if (person.dob) {
        const birthDate = new Date(person.dob);
        const endDate = person.dod ? new Date(person.dod) : new Date();
        let age = endDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = endDate.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
            age--;
        }
        el.attr('ageLabel/text', String(age));
    }

    // Deceased: show cross
    if (person.dod) {
        el.attr('deceasedCross/display', 'block');
    }

    return el;
}

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

// Build a family-tree graph (persons + parent-child links only) for traversal
const familyTree = new dia.Graph({}, { cellNamespace });
familyTree.resetCells([
    ...persons.map((p) => new dia.Element({ type: 'family-element', id: String(p.id) })),
    ...parentChildLinks.map((rel) => new dia.Link({
        type: 'family-link',
        source: { id: String(rel.parentId) },
        target: { id: String(rel.childId) },
    }))
]);

const HIGHLIGHT_DIM = 'lineage-dim';
const HIGHLIGHT_FOCUS = 'lineage-focus';

paper.on('element:mouseenter', (cellView: dia.ElementView) => {
    const treeEl = familyTree.getCell(cellView.model.id) as dia.Element;
    if (!treeEl) return;

    const relatedElIds = new Set<string>([
        treeEl.id as string,
        ...familyTree.getPredecessors(treeEl).map((el) => el.id as string),
        ...familyTree.getSuccessors(treeEl).map((el) => el.id as string),
    ]);

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

function computeAge(dob: string, dod?: string): number {
    const birthDate = new Date(dob);
    const endDate = dod ? new Date(dod) : new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function createPersonElement(person: PersonNode): dia.Element {
    const ShapeClass = person.sex === 'M' ? MalePerson : person.sex === 'F' ? FemalePerson : UnknownPerson;
    const birthYear = person.dob ? person.dob.slice(0, 4) : '?';
    const deathYear = person.dod ? person.dod.slice(0, 4) : '*';

    const attrs: Record<string, Record<string, unknown>> = {
        root: { title: `${person.name} (${birthYear}–${deathYear})` },
        name: { text: person.name },
    };
    if (person.dob) {
        attrs.ageLabel = { text: String(computeAge(person.dob, person.dod)) };
    }
    if (person.dod) {
        attrs.deceasedCross = { display: 'block' };
    }

    return new ShapeClass({ id: String(person.id), attrs });
}

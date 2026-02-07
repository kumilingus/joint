# Building a Genogram with Automatic Directed Graph Layout

This tutorial walks through building an interactive family tree (genogram) using [JointJS](https://www.jointjs.com/) and the `@joint/layout-directed-graph` package. The focus is on the **automatic layout** strategy — how we turn flat family data into a clean, hierarchical diagram without manually positioning any nodes.

## Overview

A genogram presents unique layout challenges compared to a standard directed graph:

- **Couples** must appear side-by-side on the same rank
- **Parent→child links** should originate from the midpoint between both parents
- **Twins and triplets** share a common fork point on their parent links
- **Identical twins** are connected by a link-to-link connector
- **Mate links** are horizontal and bidirectional — they break DAG assumptions

The approach we take is:

1. Replace each couple with a single **container node** for layout
2. Pre-sort links rank-by-rank to **control node ordering**
3. Run dagre layout on this simplified DAG
4. **Post-process**: split containers back into individual elements, route links through couple midpoints, and add mate links

## Project Structure

```
src/
├── main.ts      # Orchestration: graph building, layout, link routing, interactivity
├── shapes.ts    # Custom element shapes (MalePerson, FemalePerson, UnknownPerson)
├── data.ts      # Data parsing: extracts persons, parent-child links, mate links
├── data.json    # Family tree dataset
└── styles.css   # Paper container and hover highlight styles
```

## Step 1: Data Model

The family data lives in `data.json` with two arrays:

- **`nodeDataArray`** — person records with `key`, `name`, `sex`, `birth`, `death`, and optional `mother`/`father` keys pointing to other persons
- **`linkDataArray`** — mate (partner) relationships with `from`/`to` keys

Parent→child relationships are **derived from the node data** (each person's `mother` and `father` fields), not from the link array. This is simpler than the alternative of tracing through intermediate "MateLabel" nodes.

```typescript
// data.ts
export function getParentChildLinks(persons: PersonNode[]): ParentChildLink[] {
    const links: ParentChildLink[] = [];
    for (const person of persons) {
        if (typeof person.mother === 'number')
            links.push({ parentKey: person.mother, childKey: person.key });
        if (typeof person.father === 'number')
            links.push({ parentKey: person.father, childKey: person.key });
    }
    return links;
}
```

## Step 2: Couple Containers

Dagre (the engine behind `@joint/layout-directed-graph`) positions individual nodes. But in a genogram, a couple must occupy the same rank and sit next to each other. If we lay out each person independently, partners can end up on different ranks or far apart.

The solution: **replace each couple with a single invisible rectangle** that's wide enough to hold both partners side-by-side.

```typescript
const container = new shapes.standard.Rectangle({
    size: { width: COUPLE_WIDTH, height: COUPLE_HEIGHT },  // 120 x 50
    attrs: { body: { fill: 'transparent', stroke: 'none' } }
});
```

We track the mapping from person elements to their couple containers:

```typescript
personIdToContainer.set(fromId, container);
personIdToContainer.set(toId, container);

function layoutId(personElId: string): string {
    const container = personIdToContainer.get(personElId);
    return container ? container.id : personElId;
}
```

All parent→child links are redirected to point from/to the **container** during layout. Solo (uncoupled) persons participate directly.

## Step 3: Pre-sorting Links to Control Node Order

Dagre determines left-to-right node order within each rank partly based on the order edges are inserted. We exploit this with `disableOptimalOrderHeuristic: true` — dagre then respects our insertion order instead of running its own crossing minimization.

We process links **rank by rank** (top to bottom), using two heuristics:

### Root ordering: Connection-graph BFS

At rank 0, nodes have no parents to reference. Instead, we build a **connection graph** — two root nodes are connected if their children married each other. BFS from the lowest-degree node keeps related families adjacent:

```typescript
// Two nodes are connected if they share a child (through marriage)
for (const childId of children) {
    const childParents = layoutIncoming.get(childId);
    for (const otherParent of childParents) {
        if (otherParent !== nodeId && rankNodeSet.has(otherParent)) {
            connections.get(nodeId).add(otherParent);
            connections.get(otherParent).add(nodeId);
        }
    }
}
```

### Non-root ordering: Barycenter heuristic

For ranks 1+, each node is assigned the **average order of its parents**. Sorting by this barycenter value places children below their parents, minimizing edge crossings:

```typescript
for (const parentId of parents) {
    const order = nodeOrder.get(parentId);
    sum += order;
    count++;
}
barycenter.set(nodeId, sum / count);
```

Within each rank, links are also sorted by source node order and child birth date, ensuring siblings appear in birth order.

## Step 4: Layout Edge Deduplication

When both parents are in the same couple container, a child produces **two** parent→child links that both map to the same container→child layout edge. Dagre gets confused by duplicate edges, so we deduplicate:

```typescript
const edgeKey = `${srcLayout}→${tgtLayout}`;
const isDuplicate = layoutEdgeSet.has(edgeKey);
layoutEdgeSet.add(edgeKey);

if (isDuplicate) {
    (link as any)._layoutDuplicate = true;
}
```

Only the first occurrence participates in layout. Duplicates are added back to the graph afterward.

## Step 5: Running the Layout

With containers replacing couples, solo elements standing alone, and deduplicated links — we run dagre:

```typescript
graph.resetCells([...coupleContainers, ...soloElements, ...layoutLinks]);

DirectedGraph.layout(graph, {
    rankDir: 'TB',
    nodeSep: 20,
    rankSep: 70,
    ranker: 'tight-tree',
    disableOptimalOrderHeuristic: true
});
```

Key options:
- **`rankDir: 'TB'`** — top-to-bottom hierarchy (generations flow downward)
- **`nodeSep: 20`** — horizontal spacing between nodes
- **`rankSep: 70`** — vertical spacing between generations
- **`ranker: 'tight-tree'`** — produces compact layouts
- **`disableOptimalOrderHeuristic: true`** — respects our pre-sorted link insertion order

## Step 6: Post-layout — Positioning Couple Members

After layout, each container has a position. We split it into two person elements, deciding who goes left based on their parents' X positions (so links don't cross unnecessarily):

```typescript
const fromParentX = getParentX(fromId);   // average X of person's parents
const toParentX = getParentX(toId);

const [leftEl, rightEl] = fromParentX <= toParentX
    ? [fromEl, toEl] : [toEl, fromEl];

leftEl.position(pos.x, pos.y);
rightEl.position(pos.x + ELEMENT_WIDTH + gap, pos.y);
```

## Step 7: Post-layout — Link Routing Through Couple Midpoints

Parent→child links must visually originate from the **midpoint between both parents**, not from one parent alone. After layout, we reconnect each link to the real person element and add vertices:

```typescript
const midX = (sourceCenter.x + partnerCenter.x) / 2;
const midY = (sourceCenter.y + partnerCenter.y) / 2;
const halfwayY = (midY + targetCenter.y) / 2;

link.vertices([
    { x: midX, y: midY },       // couple midpoint
    { x: midX, y: halfwayY },   // drop down vertically
    { x: targetCenter.x, y: halfwayY }  // turn toward child
]);
```

This creates the characteristic "T-junction" routing of genogram links.

## Step 8: Twin/Triplet Fork Points

Twins and triplets share a common fork point. Instead of each child's link turning independently, they converge at the **average X position** of the group:

```typescript
// Compute average X of all members in the twin/triplet group
const avgX = uniqueIds.reduce((sum, id) => {
    return sum + (graph.getCell(id) as dia.Element).getBBox().center().x;
}, 0) / uniqueIds.length;

// Use the fork point instead of individual target X
link.vertices([
    { x: midX, y: midY },
    { x: midX, y: halfwayY },
    { x: forkX, y: halfwayY }   // shared fork point
]);
```

## Step 9: Identical Twin Connectors (Link-to-Link)

Identical twins are marked with a horizontal dashed line connecting their parent→child links. This uses JointJS **link-to-link** connections with `connectionRatio` anchors:

```typescript
const ratioA = computeAnchorRatio(linkA, ANCHOR_VERTICAL_OFFSET);
const ratioB = computeAnchorRatio(linkB, ANCHOR_VERTICAL_OFFSET);

new shapes.standard.Link({
    source: { id: linkA.id, anchor: { name: 'connectionRatio', args: { ratio: ratioA } } },
    target: { id: linkB.id, anchor: { name: 'connectionRatio', args: { ratio: ratioB } } },
});
```

The `computeAnchorRatio` function walks backwards along the link path to find the point at a specific vertical offset from the child, converting that into a 0–1 ratio along the total path length.

## Step 10: Mate Links (Added Last)

Mate links are horizontal connections between partners. They're added **after layout** because they're bidirectional and would break dagre's DAG assumption:

```typescript
const mateJointLinks = mateLinks.map((ml) => {
    return new shapes.standard.Link({
        source: { id: keyToId.get(ml.from)! },
        target: { id: keyToId.get(ml.to)! },
        attrs: { line: { stroke: '#c44a80', strokeWidth: 3, targetMarker: null } },
        router: { name: 'normal' }
    });
});
graph.addCells(mateJointLinks);
```

## Step 11: Interactivity — Lineage Highlighting

On hover, we highlight the person's direct ancestors and descendants using JointJS highlighters:

```typescript
paper.on('element:mouseenter', (cellView) => {
    const relatedKeys = new Set([personKey]);
    for (const k of getAncestors(personKey)) relatedKeys.add(k);
    for (const k of getDescendants(personKey)) relatedKeys.add(k);

    // Stroke highlight on hovered element
    highlighters.stroke.add(cellView, 'body', HIGHLIGHT_FOCUS, { ... });

    // Dim non-related cells with CSS class + transition
    highlighters.addClass.add(view, 'root', HIGHLIGHT_DIM, { className: 'dimmed' });
});
```

The CSS provides a smooth opacity transition:

```css
.joint-cells-layer .joint-cell {
    transition: opacity 0.3s ease;
}
.joint-cells-layer .joint-cell.dimmed {
    opacity: 0.1;
}
```

## Summary: The Layout Pipeline

```
 Raw Data (persons + mate links)
        │
        ▼
 Derive parent→child links from mother/father fields
        │
        ▼
 Create couple containers (replace paired persons)
        │
        ▼
 Pre-sort links rank-by-rank (BFS for roots, barycenter for rest)
        │
        ▼
 Deduplicate layout edges (one edge per container→child pair)
        │
        ▼
 Run dagre layout (containers + solo elements + deduplicated links)
        │
        ▼
 Position couple members inside containers (left/right by parent X)
        │
        ▼
 Reconnect links to real persons + add routing vertices
        │
        ▼
 Add twin fork points + identical twin link-to-link connectors
        │
        ▼
 Add mate links (post-layout, visual only)
        │
        ▼
 Add interactivity (hover highlighting)
```

## Data Design Considerations

Cross-family marriages (where children from different root families marry) create **unavoidable edge crossings** in a planar layout. To minimize crossings:

- Keep intermarriage to adjacent families when possible
- Avoid chains of cross-family marriages at the same generation (e.g., Thompson↔Bennett and Mitchell↔Parker at rank 1 is manageable; Thompson↔Bennett↔Mitchell↔Parker creates a mess)
- Persons who marry into the family but have no parents in the tree (like spouses from outside) are placed as solo nodes and don't pull in additional family branches

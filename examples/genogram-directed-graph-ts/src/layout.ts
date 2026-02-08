import { dia, shapes } from '@joint/core';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { ParentChildLink as ParentChildLinkShape, MateLink as MateLinkShape, IdenticalLink as IdenticalLinkShape } from './shapes';
import { sizes } from './theme';
import { PersonNode, ParentChildLink, MateLink } from './data';

interface LayoutInput {
    graph: dia.Graph;
    elements: dia.Element[];
    persons: PersonNode[];
    parentChildLinks: ParentChildLink[];
    mateLinks: MateLink[];
}

// Layout a genogram as a directed graph (top-to-bottom family tree).
//
// The layout is performed in 6 steps:
//
// 1. COUPLE CONTAINERS — Replace each mated pair with a single wide rectangle
//    so dagre treats the couple as one node and keeps partners side by side.
//
// 2. LINK SORTING — Sort parent→child links rank by rank (top to bottom) to
//    control the left-to-right order dagre assigns to siblings. Roots are
//    ordered by connection-graph BFS (grouping families whose children married),
//    deeper ranks use a barycenter heuristic (average parent position).
//
// 3. DAGRE LAYOUT — Run DirectedGraph.layout on the containers, solo elements,
//    and deduplicated links (one edge per couple→child, not two).
//
// 4. COUPLE POSITIONING — Place each partner inside their container (left/right
//    decided by which partner's parents are further left in the layout).
//
// 5. LINK RECONNECTION & ROUTING — Reconnect links from containers back to the
//    real person elements. Add vertices so links route through the couple
//    midpoint, with a shared fork point for twins/triplets.
//
// 6. MATE & IDENTICAL LINKS — Add horizontal mate (partner) links and dashed
//    link-to-link connections between identical twins/triplets.
//
export function layoutGenogram({ graph, elements, persons, parentChildLinks, mateLinks }: LayoutInput): void {

    const personById = new Map<number, PersonNode>();
    for (const person of persons) {
        personById.set(person.id, person);
    }

    // -----------------------------------------------------------------------
    // Step 1: Couple containers
    // -----------------------------------------------------------------------
    // For each mated pair, create an invisible rectangle (couple container)
    // that is wide enough to hold both partners side by side. During layout,
    // dagre sees this single node instead of two separate ones — this keeps
    // partners on the same rank and horizontally adjacent.

    const coupleContainers: dia.Element[] = [];
    const personIdToContainer = new Map<string, dia.Element>();
    const mateOf = new Map<string, string>();
    const coupledPersonIds = new Set<string>();

    interface CoupleInfo {
        container: dia.Element;
        fromId: string;
        toId: string;
    }
    const coupleInfos: CoupleInfo[] = [];

    for (const ml of mateLinks) {
        const fromId = String(ml.from);
        const toId = String(ml.to);

        if (coupledPersonIds.has(fromId) || coupledPersonIds.has(toId)) continue;

        const container = new shapes.standard.Rectangle({
            size: { width: sizes.elementWidth * 2 + sizes.coupleGap, height: sizes.elementHeight },
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

    // Resolve the layout ID for a person: container if coupled, own ID otherwise.
    function layoutId(personElId: string): string {
        const container = personIdToContainer.get(personElId);
        return container ? container.id as string : personElId;
    }

    // Solo (non-coupled) person elements participate in layout directly.
    const soloElements = elements.filter((el) => !coupledPersonIds.has(el.id as string));

    // -----------------------------------------------------------------------
    // Step 2: Link sorting (pre-layout node ordering)
    // -----------------------------------------------------------------------
    // Dagre's `disableOptimalOrderHeuristic` gives us control over left-to-right
    // node order by respecting the order links are added to the graph. We sort
    // links rank by rank so that siblings appear in birth-date order and related
    // families stay close together.

    // Identical twin groups: map each person ID to the minimum ID in their
    // identical group, so the sort comparator keeps identical siblings adjacent.
    const identicalGroupOf = new Map<number, number>();
    for (const person of persons) {
        if (person.identical !== undefined) {
            const groupId = Math.min(person.id, person.identical);
            identicalGroupOf.set(person.id, groupId);
            identicalGroupOf.set(person.identical, groupId);
        }
    }

    // Build layout-level adjacency (parent→children, child→parents).
    const layoutAdj = new Map<string, Set<string>>();
    const layoutIncoming = new Map<string, Set<string>>();
    for (const rel of parentChildLinks) {
        const src = layoutId(String(rel.parentId));
        const tgt = layoutId(String(rel.childId));
        if (src === tgt) continue;
        if (!layoutAdj.has(src)) layoutAdj.set(src, new Set());
        layoutAdj.get(src)!.add(tgt);
        if (!layoutIncoming.has(tgt)) layoutIncoming.set(tgt, new Set());
        layoutIncoming.get(tgt)!.add(src);
    }

    // Compute ranks via BFS from roots (nodes with no incoming edges).
    const allLayoutNodeIds = [
        ...coupleContainers.map((c) => c.id as string),
        ...soloElements.map((e) => e.id as string)
    ];
    const roots = allLayoutNodeIds.filter((id) => !layoutIncoming.has(id));

    const nodeRank = new Map<string, number>();
    let bfsQueue = [...roots];
    for (const r of bfsQueue) nodeRank.set(r, 0);
    while (bfsQueue.length > 0) {
        const next: string[] = [];
        for (const id of bfsQueue) {
            const children = layoutAdj.get(id);
            if (!children) continue;
            const childRank = nodeRank.get(id)! + 1;
            for (const childId of children) {
                if (!nodeRank.has(childId)) {
                    nodeRank.set(childId, childRank);
                    next.push(childId);
                }
            }
        }
        bfsQueue = next;
    }

    const maxRank = Math.max(0, ...nodeRank.values());
    const linksBySourceRank = new Map<number, ParentChildLink[]>();
    for (const rel of parentChildLinks) {
        const src = layoutId(String(rel.parentId));
        const rank = nodeRank.get(src) ?? 0;
        if (!linksBySourceRank.has(rank)) linksBySourceRank.set(rank, []);
        linksBySourceRank.get(rank)!.push(rel);
    }

    const nodesByRank = new Map<number, string[]>();
    for (const [id, rank] of nodeRank) {
        if (!nodesByRank.has(rank)) nodesByRank.set(rank, []);
        nodesByRank.get(rank)!.push(id);
    }

    // Node ordering: assigns a global sequence number to each layout node.
    // Nodes with lower order numbers are placed further left by dagre.
    const nodeOrder = new Map<string, number>();
    let orderIdx = 0;
    for (const r of roots) nodeOrder.set(r, orderIdx++);

    // Reorder nodes at a given rank to minimize edge crossings.
    function refineRankOrder(rank: number) {
        const nodesAtRank = nodesByRank.get(rank) || [];
        if (nodesAtRank.length <= 1) return;
        if (rank === 0) {
            refineByConnectionBFS(nodesAtRank);
        } else {
            refineByBarycenter(nodesAtRank);
        }
    }

    // Barycenter heuristic: place each node at the average position of its parents.
    function refineByBarycenter(nodesAtRank: string[]) {
        const barycenter = new Map<string, number>();
        for (const nodeId of nodesAtRank) {
            const parents = layoutIncoming.get(nodeId);
            if (!parents || parents.size === 0) {
                barycenter.set(nodeId, nodeOrder.get(nodeId) ?? 0);
                continue;
            }
            let sum = 0;
            let count = 0;
            for (const parentId of parents) {
                const order = nodeOrder.get(parentId);
                if (order !== undefined) {
                    sum += order;
                    count++;
                }
            }
            barycenter.set(nodeId, count > 0 ? sum / count : (nodeOrder.get(nodeId) ?? 0));
        }

        const sorted = [...nodesAtRank].sort((a, b) => {
            const ba = barycenter.get(a) ?? 0;
            const bb = barycenter.get(b) ?? 0;
            if (ba !== bb) return ba - bb;
            return (nodeOrder.get(a) ?? 0) - (nodeOrder.get(b) ?? 0);
        });

        for (const nodeId of sorted) {
            nodeOrder.set(nodeId, orderIdx++);
        }
    }

    // Connection-graph BFS (roots only): group nodes that share children
    // (i.e. families whose kids married each other) so they end up adjacent.
    function refineByConnectionBFS(nodesAtRank: string[]) {
        const rankNodeSet = new Set(nodesAtRank);

        // Two root nodes are "connected" if they share a child in the graph.
        const connections = new Map<string, Set<string>>();
        for (const nodeId of nodesAtRank) {
            const children = layoutAdj.get(nodeId);
            if (!children) continue;
            for (const childId of children) {
                const childParents = layoutIncoming.get(childId);
                if (!childParents) continue;
                for (const otherParent of childParents) {
                    if (otherParent !== nodeId && rankNodeSet.has(otherParent)) {
                        if (!connections.has(nodeId)) connections.set(nodeId, new Set());
                        if (!connections.has(otherParent)) connections.set(otherParent, new Set());
                        connections.get(nodeId)!.add(otherParent);
                        connections.get(otherParent)!.add(nodeId);
                    }
                }
            }
        }

        const sortedNodes = [...nodesAtRank].sort(
            (a, b) => (nodeOrder.get(a) ?? Infinity) - (nodeOrder.get(b) ?? Infinity)
        );

        const visited = new Set<string>();
        const orderedNodes: string[] = [];

        for (const seedNode of sortedNodes) {
            if (visited.has(seedNode)) continue;

            // Find the connected component containing this seed node.
            const componentSet = new Set<string>();
            const findStack = [seedNode];
            while (findStack.length > 0) {
                const current = findStack.pop()!;
                if (componentSet.has(current)) continue;
                componentSet.add(current);
                const neighbors = connections.get(current);
                if (neighbors) {
                    for (const n of neighbors) {
                        if (!componentSet.has(n)) findStack.push(n);
                    }
                }
            }

            if (componentSet.size === 1) {
                visited.add(seedNode);
                orderedNodes.push(seedNode);
                continue;
            }

            // BFS from the node with minimum degree (end of a chain).
            let startNode = seedNode;
            let bestDegree = Infinity;
            let bestOrder = Infinity;
            for (const n of componentSet) {
                const degree = connections.get(n)?.size ?? 0;
                const order = nodeOrder.get(n) ?? Infinity;
                if (degree < bestDegree || (degree === bestDegree && order < bestOrder)) {
                    bestDegree = degree;
                    bestOrder = order;
                    startNode = n;
                }
            }

            const queue = [startNode];
            while (queue.length > 0) {
                const current = queue.shift()!;
                if (visited.has(current)) continue;
                visited.add(current);
                orderedNodes.push(current);
                const neighbors = connections.get(current);
                if (neighbors) {
                    const sorted = [...neighbors]
                        .filter(n => !visited.has(n))
                        .sort((a, b) => (nodeOrder.get(a) ?? Infinity) - (nodeOrder.get(b) ?? Infinity));
                    queue.push(...sorted);
                }
            }
        }

        for (const nodeId of orderedNodes) {
            nodeOrder.set(nodeId, orderIdx++);
        }
    }

    // Process rank by rank: refine order, sort links, record child order.
    refineRankOrder(0);

    const sortedLinks: ParentChildLink[] = [];
    for (let rank = 0; rank <= maxRank; rank++) {
        const rankedLinks = linksBySourceRank.get(rank) || [];

        // Sort by: 1) source node order, 2) child birth date,
        // 3) identical group (keeps identical twins adjacent), 4) child id.
        rankedLinks.sort((a, b) => {
            const srcA = layoutId(String(a.parentId));
            const srcB = layoutId(String(b.parentId));
            const orderA = nodeOrder.get(srcA) ?? Infinity;
            const orderB = nodeOrder.get(srcB) ?? Infinity;
            if (orderA !== orderB) return orderA - orderB;

            const childA = personById.get(a.childId)!;
            const childB = personById.get(b.childId)!;
            const birthCmp = (childA.dob || '').localeCompare(childB.dob || '');
            if (birthCmp !== 0) return birthCmp;

            const groupA = identicalGroupOf.get(a.childId) ?? a.childId;
            const groupB = identicalGroupOf.get(b.childId) ?? b.childId;
            if (groupA !== groupB) return groupA - groupB;

            return a.childId - b.childId;
        });

        for (const rel of rankedLinks) {
            const tgt = layoutId(String(rel.childId));
            if (!nodeOrder.has(tgt)) {
                nodeOrder.set(tgt, orderIdx++);
            }
        }

        sortedLinks.push(...rankedLinks);

        if (rank < maxRank) {
            refineRankOrder(rank + 1);
        }
    }

    parentChildLinks.length = 0;
    parentChildLinks.push(...sortedLinks);

    // -----------------------------------------------------------------------
    // Step 3: Dagre layout
    // -----------------------------------------------------------------------
    // Create JointJS links pointing to layout nodes (containers or solo elements).
    // Deduplicate: when both parents share a container, only one layout edge is
    // needed (dagre does not handle duplicate edges well).

    interface LinkInfo {
        link: dia.Link;
        realSourceId: string;
        realTargetId: string;
    }
    const linkInfos: LinkInfo[] = [];
    const layoutEdgeSet = new Set<string>();
    for (const rel of parentChildLinks) {
        const realSourceId = String(rel.parentId);
        const realTargetId = String(rel.childId);
        const srcLayout = layoutId(realSourceId);
        const tgtLayout = layoutId(realTargetId);
        const edgeKey = `${srcLayout}→${tgtLayout}`;
        const isDuplicate = layoutEdgeSet.has(edgeKey);
        layoutEdgeSet.add(edgeKey);

        const link = new ParentChildLinkShape({
            source: { id: srcLayout },
            target: { id: tgtLayout },
        });
        linkInfos.push({ link, realSourceId, realTargetId });
        if (isDuplicate) {
            (link as any)._layoutDuplicate = true;
        }
    }
    const links = linkInfos.map((li) => li.link);
    const layoutLinks = links.filter((l) => !(l as any)._layoutDuplicate);

    graph.resetCells([...coupleContainers, ...soloElements, ...layoutLinks]);

    DirectedGraph.layout(graph, {
        rankDir: 'TB',
        nodeSep: sizes.nodeSep,
        rankSep: sizes.rankSep,
        ranker: 'tight-tree',
        disableOptimalOrderHeuristic: true
    });

    // Add duplicate links back (they were excluded from layout).
    const duplicateLinks = links.filter((l) => (l as any)._layoutDuplicate);
    if (duplicateLinks.length > 0) {
        graph.addCells(duplicateLinks);
    }

    // -----------------------------------------------------------------------
    // Step 4: Couple positioning
    // -----------------------------------------------------------------------
    // Place each partner inside their container. The partner whose parents are
    // further left goes on the left side.

    const gap = sizes.coupleGap;

    function getParentX(personElId: string): number {
        const person = personById.get(Number(personElId));
        if (!person) return Infinity;
        const parentIds: number[] = [];
        if (typeof person.mother === 'number') parentIds.push(person.mother);
        if (typeof person.father === 'number') parentIds.push(person.father);
        if (parentIds.length === 0) return Infinity;

        let sum = 0;
        let count = 0;
        for (const pid of parentIds) {
            const parentLayoutNodeId = layoutId(String(pid));
            const parentCell = graph.getCell(parentLayoutNodeId) as dia.Element;
            if (parentCell) {
                sum += parentCell.getBBox().center().x;
                count++;
            }
        }
        return count > 0 ? sum / count : Infinity;
    }

    for (const { container, fromId, toId } of coupleInfos) {
        const pos = container.position();
        const fromEl = elements.find((e) => e.id === fromId)!;
        const toEl = elements.find((e) => e.id === toId)!;

        const fromParentX = getParentX(fromId);
        const toParentX = getParentX(toId);

        const [leftEl, rightEl] = fromParentX <= toParentX
            ? [fromEl, toEl]
            : [toEl, fromEl];

        leftEl.position(pos.x, pos.y);
        rightEl.position(pos.x + sizes.elementWidth + gap, pos.y);
    }

    const coupledElements = elements.filter((el) => coupledPersonIds.has(el.id as string));
    graph.addCells(coupledElements);

    // -----------------------------------------------------------------------
    // Step 5: Link reconnection & routing
    // -----------------------------------------------------------------------
    // Links currently point to containers. Reconnect them to the real person
    // elements and add vertices so each link routes through the couple midpoint
    // (the point between the two partners). For twins/triplets, links share a
    // common fork point at the average X of the group members.

    function twinGroupKey(sourceContainerId: string, targetPersonId: string): string | null {
        const person = personById.get(Number(targetPersonId));
        if (!person || person.multiple === undefined) return null;
        return `${sourceContainerId}|${person.multiple}`;
    }

    const containerIdSet = new Set(coupleContainers.map((c) => c.id as string));

    // Pre-compute twin/triplet fork points (average X of group members).
    const twinGroupMembers = new Map<string, string[]>();
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

        // Reconnect to real person elements.
        link.source({ id: realSourceId });
        link.target({
            id: realTargetId,
            anchor: { name: 'top', args: { useModelGeometry: true } }
         });

        // Route through couple midpoint when source was a container.
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

            const gKey = twinGroupKey(sourceLayoutId, realTargetId);
            const forkX = gKey ? twinGroupForkX.get(gKey) : undefined;

            if (forkX !== undefined) {
                // Twins/triplets: shared fork point at the group's center X.
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

        // Route into the correct person when target was a container.
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

    // Containers are no longer needed.
    for (const container of coupleContainers) {
        container.remove();
    }

    // -----------------------------------------------------------------------
    // Step 6: Mate & identical links
    // -----------------------------------------------------------------------
    // Add horizontal mate links between partners and dashed link-to-link
    // connections between identical twins/triplets. These are visual-only and
    // were not part of the dagre layout (they would break the DAG structure).

    const mateJointLinks: dia.Link[] = mateLinks.map((ml) => {
        return new MateLinkShape({
            source: {
                id: String(ml.from),
                anchor: { name: 'center', args: { useModelGeometry: true } }
            },
            target: {
                id: String(ml.to),
                anchor: { name: 'center', args: { useModelGeometry: true } }
            },
        });
    });

    if (mateJointLinks.length > 0) {
        graph.addCells(mateJointLinks);
    }

    // Identical twin/triplet links: connect two parent→child links with a
    // dashed line using connectionRatio anchors (link-to-link connection).
    const ANCHOR_VERTICAL_OFFSET = sizes.rankSep / 4;

    // Compute the ratio along a link's path at a given vertical offset from
    // the target end. Used to position link-to-link anchors consistently.
    function computeAnchorRatio(link: dia.Link, verticalOffset: number): number {
        const sourceEl = graph.getCell((link.source() as { id: string }).id) as dia.Element;
        const targetEl = graph.getCell((link.target() as { id: string }).id) as dia.Element;
        if (!sourceEl || !targetEl) return 0.85;

        const srcBBox = sourceEl.getBBox();
        const tgtBBox = targetEl.getBBox();
        const srcPt = { x: srcBBox.x + srcBBox.width / 2, y: srcBBox.y + srcBBox.height / 2 };
        const tgtPt = { x: tgtBBox.x + tgtBBox.width / 2, y: tgtBBox.y };
        const vertices = link.vertices() || [];
        const points: { x: number; y: number }[] = [srcPt, ...vertices, tgtPt];

        const segLengths: number[] = [];
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            segLengths.push(Math.sqrt(dx * dx + dy * dy));
        }
        const totalLength = segLengths.reduce((a, b) => a + b, 0);
        if (totalLength === 0) return 0.85;

        // Walk backwards from the target to find the distance at the offset.
        let remainingVertical = verticalOffset;
        let distFromEnd = 0;
        for (let i = points.length - 1; i > 0; i--) {
            const dy = Math.abs(points[i].y - points[i - 1].y);
            const segLen = segLengths[i - 1];
            if (dy >= remainingVertical && dy > 0) {
                distFromEnd += (remainingVertical / dy) * segLen;
                break;
            }
            remainingVertical -= dy;
            distFromEnd += segLen;
        }

        return Math.max(0.01, Math.min(0.99, 1 - distFromEnd / totalLength));
    }

    const childElIdToLink = new Map<string, dia.Link>();
    for (const { link, realTargetId } of linkInfos) {
        if (!childElIdToLink.has(realTargetId)) {
            childElIdToLink.set(realTargetId, link);
        }
    }

    const identicalLinks: dia.Link[] = [];
    const processedIdenticalPairs = new Set<string>();
    for (const person of persons) {
        if (person.identical === undefined) continue;
        const personElId = String(person.id);
        const identicalElId = String(person.identical);

        const pairKey = [person.id, person.identical].sort().join('|');
        if (processedIdenticalPairs.has(pairKey)) continue;
        processedIdenticalPairs.add(pairKey);

        const linkA = childElIdToLink.get(personElId);
        const linkB = childElIdToLink.get(identicalElId);
        if (!linkA || !linkB) continue;

        const ratioA = computeAnchorRatio(linkA, ANCHOR_VERTICAL_OFFSET);
        const ratioB = computeAnchorRatio(linkB, ANCHOR_VERTICAL_OFFSET);

        identicalLinks.push(new IdenticalLinkShape({
            source: { id: linkA.id, anchor: { name: 'connectionRatio', args: { ratio: ratioA } } },
            target: { id: linkB.id, anchor: { name: 'connectionRatio', args: { ratio: ratioB } } },
        }));
    }

    if (identicalLinks.length > 0) {
        graph.addCells(identicalLinks);
    }
}

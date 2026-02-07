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

export function layoutGenogram({ graph, elements, persons, parentChildLinks, mateLinks }: LayoutInput): void {

    // Build lookup from person id to PersonNode
    const personById = new Map<number, PersonNode>();
    for (const person of persons) {
        personById.set(person.id, person);
    }

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
        const fromId = String(ml.from);
        const toId = String(ml.to);

        // Skip if either partner is already in a couple container
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

    // Resolve the layout ID for a person: container if coupled, own ID otherwise
    function layoutId(personElId: string): string {
        const container = personIdToContainer.get(personElId);
        return container ? container.id as string : personElId;
    }

    // Solo (non-coupled) person elements participate in layout directly
    const soloElements = elements.filter((el) => !coupledPersonIds.has(el.id as string));

    // Sort links layer by layer (top → bottom) so dagre orders each rank correctly.
    // Processing rank N first establishes the node order used to sort rank N+1.

    // Build layout-level adjacency and compute ranks via BFS
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

    // Group links by their source's rank
    const maxRank = Math.max(0, ...nodeRank.values());
    const linksBySourceRank = new Map<number, ParentChildLink[]>();
    for (const rel of parentChildLinks) {
        const src = layoutId(String(rel.parentId));
        const rank = nodeRank.get(src) ?? 0;
        if (!linksBySourceRank.has(rank)) linksBySourceRank.set(rank, []);
        linksBySourceRank.get(rank)!.push(rel);
    }

    // Collect layout nodes by rank
    const nodesByRank = new Map<number, string[]>();
    for (const [id, rank] of nodeRank) {
        if (!nodesByRank.has(rank)) nodesByRank.set(rank, []);
        nodesByRank.get(rank)!.push(id);
    }

    // Reorder nodes at a given rank to minimize edge crossings.
    // Rank 0 (roots): use connection-graph BFS — groups nodes that share children.
    // Other ranks: use barycenter heuristic — average parent order from previous rank.
    const nodeOrder = new Map<string, number>();
    let orderIdx = 0;
    for (const r of roots) nodeOrder.set(r, orderIdx++);

    function refineRankOrder(rank: number) {
        const nodesAtRank = nodesByRank.get(rank) || [];
        if (nodesAtRank.length <= 1) return;

        if (rank === 0) {
            refineByConnectionBFS(nodesAtRank);
        } else {
            refineByBarycenter(nodesAtRank);
        }
    }

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

    function refineByConnectionBFS(nodesAtRank: string[]) {
        const rankNodeSet = new Set(nodesAtRank);

        // Build connections: two nodes are connected if they share a child
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

            // Start BFS from the node with minimum degree (end of a chain)
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

    // Process rank by rank: refine order, sort links, then record child order for the next rank

    // Refine root order first (group roots whose children married each other)
    refineRankOrder(0);

    const sortedLinks: ParentChildLink[] = [];
    for (let rank = 0; rank <= maxRank; rank++) {
        const rankedLinks = linksBySourceRank.get(rank) || [];

        // Sort by: 1) source node's established order, 2) child birth date, 3) child id
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

            return a.childId - b.childId;
        });

        // Establish order for child layout nodes based on the sorted link order
        for (const rel of rankedLinks) {
            const tgt = layoutId(String(rel.childId));
            if (!nodeOrder.has(tgt)) {
                nodeOrder.set(tgt, orderIdx++);
            }
        }

        sortedLinks.push(...rankedLinks);

        // Refine the next rank's order: group nodes that share a child
        if (rank < maxRank) {
            refineRankOrder(rank + 1);
        }
    }

    // Replace parentChildLinks contents with sorted order
    parentChildLinks.length = 0;
    parentChildLinks.push(...sortedLinks);

    // Create parent→child links, pointing to containers for layout.
    // Store original person IDs so we can reconnect after layout.
    // Deduplicate at layout level: when both parents are in the same couple, only one
    // layout edge is needed (dagre gets confused by duplicate edges).
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
        // Skip duplicate layout-level edges (but always create the LinkInfo for reconnection)
        const isDuplicate = layoutEdgeSet.has(edgeKey);
        layoutEdgeSet.add(edgeKey);

        const link = new ParentChildLinkShape({
            source: { id: srcLayout },
            target: { id: tgtLayout },
        });
        linkInfos.push({ link, realSourceId, realTargetId });
        if (isDuplicate) {
            // Mark duplicate links — they won't participate in layout but will be
            // reconnected and added to the graph after layout
            (link as any)._layoutDuplicate = true;
        }
    }
    const links = linkInfos.map((li) => li.link);
    const layoutLinks = links.filter((l) => !(l as any)._layoutDuplicate);

    // Layout only containers + solo elements + deduplicated links
    graph.resetCells([...coupleContainers, ...soloElements, ...layoutLinks]);

    DirectedGraph.layout(graph, {
        rankDir: 'TB',
        nodeSep: sizes.nodeSep,
        rankSep: sizes.rankSep,
        ranker: 'tight-tree',
        // align: 'DR',
        // setVertices: true,
        disableOptimalOrderHeuristic: true
    });

    // Add duplicate links back to the graph (they were excluded from layout)
    const duplicateLinks = links.filter((l) => (l as any)._layoutDuplicate);
    if (duplicateLinks.length > 0) {
        graph.addCells(duplicateLinks);
    }

    // Position couple members inside their containers.
    // Place the partner whose family is further left on the left side.
    const gap = sizes.coupleGap;

    function getParentX(personElId: string): number {
        // Find the person's parent layout nodes and return average X position
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

        // Decide who goes left: the partner whose parents are further left
        const fromParentX = getParentX(fromId);
        const toParentX = getParentX(toId);

        const [leftEl, rightEl] = fromParentX <= toParentX
            ? [fromEl, toEl]
            : [toEl, fromEl];

        leftEl.position(pos.x, pos.y);
        rightEl.position(pos.x + sizes.elementWidth + gap, pos.y);
    }
    // Add the coupled person elements to the graph
    const coupledElements = elements.filter((el) => coupledPersonIds.has(el.id as string));
    graph.addCells(coupledElements);

    // Identify twin/triplet groups: key = "sourceContainerId|multipleValue"
    // A child is a twin/triplet if it has a `multiple` field
    function twinGroupKey(sourceContainerId: string, targetPersonId: string): string | null {
        const person = personById.get(Number(targetPersonId));
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

    // Compute anchor ratio for positioning link-to-link anchors near target end
    const ANCHOR_VERTICAL_OFFSET = sizes.rankSep / 4;

    function computeAnchorRatio(link: dia.Link, verticalOffset: number): number {
        const sourceEl = graph.getCell((link.source() as { id: string }).id) as dia.Element;
        const targetEl = graph.getCell((link.target() as { id: string }).id) as dia.Element;
        if (!sourceEl || !targetEl) return 0.85;

        const srcBBox = sourceEl.getBBox();
        const tgtBBox = targetEl.getBBox();
        // Source uses default 'center' anchor; target uses 'top' anchor
        const srcPt = { x: srcBBox.x + srcBBox.width / 2, y: srcBBox.y + srcBBox.height / 2 };
        const tgtPt = { x: tgtBBox.x + tgtBBox.width / 2, y: tgtBBox.y };
        const vertices = link.vertices() || [];
        const points: { x: number; y: number }[] = [srcPt, ...vertices, tgtPt];

        // Compute segment lengths
        const segLengths: number[] = [];
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            segLengths.push(Math.sqrt(dx * dx + dy * dy));
        }
        const totalLength = segLengths.reduce((a, b) => a + b, 0);
        if (totalLength === 0) return 0.85;

        // Walk backwards from target to find the path distance at the desired vertical offset
        let remainingVertical = verticalOffset;
        let distFromEnd = 0;
        for (let i = points.length - 1; i > 0; i--) {
            const dy = Math.abs(points[i].y - points[i - 1].y);
            const segLen = segLengths[i - 1];
            if (dy >= remainingVertical && dy > 0) {
                // Anchor falls within this segment
                distFromEnd += (remainingVertical / dy) * segLen;
                break;
            }
            remainingVertical -= dy;
            distFromEnd += segLen;
        }

        return Math.max(0.01, Math.min(0.99, 1 - distFromEnd / totalLength));
    }

    // Add link-to-link connections for identical multiples (identical twins/triplets)
    // Build a lookup: child element ID → one of its parent→child links
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

        // Avoid duplicates (A→B and B→A)
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

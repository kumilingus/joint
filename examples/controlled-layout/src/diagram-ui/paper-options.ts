import { g, dia, anchors, connectors, connectionStrategies } from '@joint/core';
import { Button } from '../diagram-engine/shapes/Button';
import { Link } from '../diagram-engine/shapes';
import { PRIMARY_COLOR } from '../diagram-engine/const';

const LINK_SOURCE_ANCHOR_OFFSET = 25;
const LINK_TARGET_ANCHOR_OFFSET = 20;

export const magnetThreshold = 'onleave';
export const clickThreshold = 10;
export const moveThreshold = 5;
export const labelsLayer = true;
export const snapLinks = true;
export const markAvailable = true;

export const allowLink = (linkView: dia.LinkView) => {
    const link = linkView.model;
    const target = link.getTargetElement();
    const source = link.getSourceElement();
    if (!source || !target) return false;
    // Forbid immediate parent-child connections
    if (source === target) return false;
    return !Button.isButton(target);
}

export const validateConnection = (cellViewS: dia.CellView, _magnetS: SVGElement, cellViewT: dia.CellView) => {

    const source = cellViewS.model;
    const target = cellViewT.model;
    const graph = cellViewS.paper.model;

    if (source.isLink() || target.isLink()) return false;

    // Forbid immediate parent-child connections
    if (source === target) return false;

    const links = graph.getConnectedLinks(source, { outbound: true });
    // Forbid connections to elements that are already connected
    if (links.some(link => link.getTargetCell() === target)) return false;

    return !Button.isButton(target);
};

// Enable interaction only for buttons
export const interactive = (cellView: dia.CellView) => {
    if (!Button.isButton(cellView.model)) return false;
    return {
        addLinkFromMagnet: true,
        elementMove: false
    }
}

export const highlighting = {
    [dia.CellView.Highlighting.CONNECTING]: false,
    [dia.CellView.Highlighting.ELEMENT_AVAILABILITY]: false,
};

export const connectionStrategy: connectionStrategies.ConnectionStrategy = (end, endView, _endMagnet, _coords, _link, endType) => {

    const graph = endView.paper.model;

    end.connectionPoint = {
        name: 'anchor'
    }

    if (endType === 'target') {
        end.anchor = {
            name: 'midSide',
            args: {
                padding: LINK_TARGET_ANCHOR_OFFSET,
                mode: 'horizontal'
            }
        };
        return end;
    }

    const button = graph.getCell(end.id);
    const [el] = graph.getNeighbors(button as dia.Element, { inbound: true });
    // Reconnect the link dragged from the button to the parent element
    end.id = el.id;
    end.anchor = {
        name: 'bottom',
        args: {
            dy: LINK_SOURCE_ANCHOR_OFFSET,
        }
    }

    return end;
};

export const defaultConnector: connectors.Connector = (sourcePoint: g.Point, targetPoint: g.Point, routePoints: g.Point[], _opt, linkView: dia.LinkView) => {
    const link = linkView.model;
    const opt: connectors.StraightConnectorArguments = {
        cornerType: 'cubic',
        cornerRadius: 10,
    };

    const midPoints = [sourcePoint];
    const sourceTipPoint = sourcePoint.clone().move(linkView.sourceBBox.center(), -LINK_SOURCE_ANCHOR_OFFSET);

    midPoints.push(...routePoints);

    const targetTipPoint = targetPoint.clone();
    if (link.getTargetCell()) {
        // Don't move the target point if the link is being dragged
        // (i.e. the target is not an element)
        targetTipPoint.move(linkView.targetBBox.center(), -LINK_TARGET_ANCHOR_OFFSET);
        midPoints.push(targetPoint);
    }

    return connectors.straight(sourceTipPoint, targetTipPoint, midPoints, opt);
};

export const defaultAnchor: anchors.AnchorJSON = {
    name: 'midSide',
    args: {
        mode: 'vertical',
        padding: LINK_SOURCE_ANCHOR_OFFSET,
    }
};

export const defaultLink = () => new Link({
    attrs: {
        line: {
            stroke: PRIMARY_COLOR,
            strokeWidth: 2
        }
    }
});

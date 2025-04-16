import { g, dia, anchors, connectors, connectionStrategies } from '@joint/core';
import { Button } from './shapes/Button';

export const magnetThreshold = 'onleave';
export const clickThreshold = 10;
export const moveThreshold = 5;
export const labelsLayer = true;
export const snapLinks = true;

// TODO: remove constants

export const allowLink = (linkView: dia.LinkView) => {
    const { model } = linkView;

    const target = model.getTargetElement();
    const source = model.getSourceElement();

    if (!source || !target) return false;

    // Forbid immediate parent-child connections
    if (source === target) return false;

    return target.isElement() && !Button.isButton(target);
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
    [dia.CellView.Highlighting.CONNECTING]: false
};

export const connectionStrategy: connectionStrategies.ConnectionStrategy = (end, endView, _endMagnet, _coords, _link, endType) => {

    const graph = endView.paper.model;

    end.connectionPoint = {
        name: 'anchor'
    }

    if (endType === 'target') {
        end.anchor = {
            name: 'top',
            args: {
                dy: -25
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
            dy: 25
        }
    }

    return end;
};

export const defaultConnector: connectors.Connector = (sourcePoint: g.Point, targetPoint: g.Point, routePoints: g.Point[]) => {
    const opt: connectors.StraightConnectorArguments = {
        cornerType: 'cubic',
        cornerRadius: 10,
    };
    const offset = 20;
    const targetTipPoint = targetPoint.clone().offset(0, offset);
    const sourceTipPoint = sourcePoint.clone().offset(0, -25);
    return connectors.straight(sourceTipPoint, targetTipPoint, [sourcePoint, ...routePoints, targetPoint], opt);
};

export const defaultAnchor: anchors.AnchorJSON = {
    name: 'midSide',
    args: {
        mode: 'vertical',
        padding: 25
    }
};

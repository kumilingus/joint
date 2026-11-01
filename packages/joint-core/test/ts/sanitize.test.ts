import * as joint from '../../';

const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

const removed: Array<{ path: Array<string | number>, reason: string }> = [];
const options: joint.util.SanitizeJSONOptions = {
    cellNamespace: joint.shapes,
    onRemove: (path, reason) => removed.push({ path, reason }),
    strict: false
};

const graphJSON = joint.util.sanitizeGraphJSON({ cells: [] }, options);
if (graphJSON) graph.fromJSON(graphJSON);

const cellJSON = joint.util.sanitizeCellJSON({ type: 'standard.Rectangle' }, options);
if (cellJSON) graph.addCell(cellJSON);

const rectangle = new joint.shapes.standard.Rectangle();
rectangle.set(joint.util.sanitizeCellAttributes(rectangle, { attrs: { label: { text: 'A' }}}));
const attributes: { attrs: joint.dia.Cell.Selectors } = joint.util.sanitizeCellAttributes(null, { attrs: {}}, { strict: true });

const html: string = joint.util.sanitizeHTML('<b>A</b>');

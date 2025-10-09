import React, { useCallback, useEffect, useState } from "react";
import {
  Paper,
  useGraph,
  GraphProvider,
  ReactElement,
  MeasuredNode,
} from "@joint/react";
import {
  BryntumGrid,
  BryntumToolbar,
} from "@bryntum/grid-react";
import { Grid, GridRowModel, Store } from '@bryntum/grid';

import { DiagramPanel, DiagramCanvas } from "./Diagram";
import { EditorLayout } from "./EditorLayout";
import gridConfig from "../config/grid-config";
import { colors, shapeKinds } from "../constants";
import { syncDiagram } from "../utils/diagram-utils";
import { addRow, deleteSelectedRows, resetRows } from "../utils/grid-utils";


function DiagramEditor({ initialData }) {
  const gridRef = React.useRef();
  const graph = useGraph();
  const [selection, setSelection] = useState([]);

  useEffect(() => {
    const grid = gridRef.current?.instance;
    if (!grid) return;

    // On initial load, populate the diagram from the grid data
    syncDiagram(graph, grid.store?.records);

    // Any subsequent changes to the grid data
    // should also be reflected in the diagram
    grid.store.on('refresh', ({ action, records }) => {
      syncDiagram(graph, records, action);
    });
    grid.store.on('change', ({ action, records }) => {
      syncDiagram(graph, records, action);
      // TODO: How to refresh the subgrid after data change?
      // gridRef.current.instance.subGrids.normal.grid.refreshColumn('id')
    });

    return () => {
      grid.store?.off('refresh');
      grid.store?.off('change');
    }
  }, [graph]);

  // Toolbar handlers

  const onToolbarAddClick = useCallback(() => {
    const grid = gridRef.current?.instance;
    if (!grid) return;
    addRow(grid, {
      name: "New Action",
      kind: shapeKinds.Action,
      color: colors.babyBlue,
    });
  }, []);

  const onToolbarDeleteClick = useCallback(() => {
    const grid = gridRef.current?.instance;
    if (!grid) return;
    deleteSelectedRows(grid);
  }, []);

  const onToolbarResetClick = useCallback(() => {
    const grid = gridRef.current?.instance;
    if (!grid) return;
    resetRows(grid, [
      {
        id: 1,
        name: "Get Started",
        kind: shapeKinds.Start,
        color: colors.babyBlue,
        connections: [{ id: 2 }],
      },
      {
        id: 2,
        name: "Action 1",
        kind: shapeKinds.Action,
        color: colors.peach,
      }
    ]);
    grid.selectRow({ record: 2, scrollIntoView: true });
  }, []);

  // Grid handlers

  const onGridSelectionChange = (data) => {
    setSelection(data.selected.map((record) => record.id));
  };

  const onGridRowExpand = ({ record }) => {
    const grid = gridRef.current?.instance;
    if (!grid) return;
    grid.store.records.forEach((rec) => {
      if (rec.id === record.id) return;
      grid.features.rowExpander.collapse(grid.store.getById(rec.id));
    });
  };

  // Diagram handlers

  const onDiagramSelectionChange = (ids) => {
    const grid = gridRef.current?.instance;
    if (grid) {
      grid.suspendEvents();
      grid.deselectAll();
      ids.forEach((id, index) => {
        grid.selectRow({ record: id, scrollIntoView: index === 0 });
      });
      grid.resumeEvents();
    }
    setSelection(ids);
  };

  const onDiagramElementEditStart = ({ elementId }) => {
    const grid = gridRef.current?.instance;
    if (!grid) return;
    const record = grid.store.getById(elementId);
    if (!record) return;
    grid.scrollRowIntoView({ record });
    grid.startEditing({ record, field: 'name' });
  }

  const onDiagramLinkEditStart = ({ elementId, linkId }) => {
    const grid = gridRef.current?.instance;
    if (!grid) return;
    const record = grid.store.getById(elementId);
    if (!record) return;
    grid.scrollRowIntoView({ record });
    grid.features.rowExpander.expand(record);
    const connectionsGrid = grid.subGrids.normal.grid;
    const linkRecord = connectionsGrid.store.getById(linkId);
    if (linkRecord) {
      connectionsGrid.startEditing({ record: linkRecord, field: 'label' });
      return;
    }
  }

  return (
    <EditorLayout
      toolbar={
        <BryntumToolbar
          items={[
            {
              type: "button",
              text: "Add",
              icon: "b-icon-add",
              cls: 'b-raised',
              tooltip: 'Add new element and connect it to the selected element',
              onClick: onToolbarAddClick,
            },
            {
              type: "button",
              text: "Delete",
              icon: "b-icon-trash",
              cls: 'b-raised',
              tooltip: 'Delete selected elements',
              onClick: onToolbarDeleteClick,
              disabled: selection.length === 0,
            },
            {
              type: "button",
              text: "Reset",
              icon: "b-fa-undo",
              cls: 'b-raised',
              tooltip: 'Reset diagram and grid to initial state',
              onClick: onToolbarResetClick,
            }]
          }/>
      }
      left={
        <BryntumGrid
          ref={gridRef}
          {...gridConfig}
          data={initialData}
          onSelectionChange={onGridSelectionChange}
          onRowExpand={onGridRowExpand}
        />
      }
      right={
        <DiagramPanel>
          <DiagramCanvas
            onSelectionChange={onDiagramSelectionChange}
            onElementEditStart={onDiagramElementEditStart}
            onLinkEditStart={onDiagramLinkEditStart}
            selection={selection}
          />
        </DiagramPanel>
      }
    />
  );
}

export default DiagramEditor;

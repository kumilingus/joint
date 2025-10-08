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
import { addRow, deleteSelectedRecords } from "../utils/grid-utils";


function DiagramEditor({ initialData }) {
  const gridRef = React.useRef();
  const graph = useGraph();
  const [data, setData] = useState(initialData);
  const [selection, setSelection] = useState([]);

  // On initial load, populate the diagram from the grid data
  useEffect(() => {
    syncDiagram(graph, gridRef.current?.instance?.store?.records);
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
    deleteSelectedRecords(grid);
  }, []);

  // Grid handlers

  const onGridDataChange = ({ store, action, records }) => {
    setData(store.data);
    syncDiagram(graph, records, action);
    // TODO: How to refresh the subgrid after data change?
    // gridRef.current.instance.subGrids.normal.grid.refreshColumn('id')
  };

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
          ]}
        />
      }
      left={
        <BryntumGrid
          ref={gridRef}
          {...gridConfig}
          data={data}
          onDataChange={onGridDataChange}
          onSelectionChange={onGridSelectionChange}
          onRowExpand={onGridRowExpand}
        />
      }
      right={
        <DiagramPanel>
          <DiagramCanvas
            onSelectionChange={onDiagramSelectionChange}
            selection={selection}
          />
        </DiagramPanel>
      }
    />
  );
}

export default DiagramEditor;

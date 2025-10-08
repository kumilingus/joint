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

import { DiagramPanel, DiagramCanvas } from "./Diagram";
import { EditorLayout } from "./EditorLayout";
import gridConfig from "../config/grid-config";
import { colors, shapeKinds } from "../constants";
import { syncDiagram } from "../utils/diagram-utils";
import { addRow, deleteSelectedRows } from "../utils/grid-utils";


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
    deleteSelectedRows(grid);
  }, []);

  // Grid handlers

  const onGridDataChange = ({ store, action, records }) => {
    setData(store.data);
    syncDiagram(graph, records, action);
  };

  const onGridBeforeCellEditStart = ({ editorContext }) => {
    const { record, column, editor, grid } = editorContext;
    if (column.field === "connections") {
      // dynamically set options based on current grid data
      editor.store.data = grid.store.data.map(({ id, name }) => {
        const text = id === record.id ? `${name} (self)` : name;
        return { id, text };
      });
    }
  };

  const onGridSelectionChange = (data) => {
    setSelection(data.selected.map((record) => record.id));
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
              onClick: onToolbarAddClick,
            },
            {
              type: "button",
              text: "Delete",
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
          onBeforeCellEditStart={onGridBeforeCellEditStart}
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

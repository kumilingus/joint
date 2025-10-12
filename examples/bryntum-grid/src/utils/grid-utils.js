
import { util } from "@joint/core";

export function addRow(grid, record) {
    const [newRecord] = grid.store.add({ id: util.uuid(), ...record });
    const selected = grid.selectedRecords;
    if (selected?.length) {
      // Add connection from the last selected record to the new one
      const lastSelected = selected[selected.length - 1];
      const connectionStore = lastSelected.connections
      connectionStore.add({
        id: util.uuid(),
        targetId: newRecord.id
      });
    }
    grid.selectRow({ record: newRecord, scrollIntoView: true });
}

// TODO: fix batch update (results in multiple layout calls)
export function deleteSelectedRows(grid) {
    const { selectedRecords, store } = grid;
    if (!selectedRecords.length) return;
    // Select the next record (falling back to the previous one) after deletion
    const nextRecord = store.getNext(
      selectedRecords[selectedRecords.length - 1],
    );
    const prevRecord = store.getPrev(selectedRecords[0]);
    deleteRow(grid, selectedRecords);
    grid.selectRow({ record: nextRecord || prevRecord, scrollIntoView: true });
}

export function deleteRow(grid, records = []) {
    const { store } = grid;
    // Remove references to the deleted records from other records' connections
    store.beginBatch();
    store.forEach((record) => {
      if (records.find((rec) => rec.id === record.id)) return;
      const connectionStore = record.get("connections");
      const connectionsToRemove = connectionStore.records.filter((connection) => {
          return records.find((rec) => rec.id === connection.targetId);
      });
      connectionStore.remove(connectionsToRemove);
    });
    store.remove(records);
    store.endBatch();
}

export function resetRows(grid, data = []) {
    const { store } = grid;
    store.removeAll();
    store.add(data);
}

export function connectRows(connectionsGrid, targetRecords) {
  targetRecords.forEach((record) => {
      if (connectionsGrid.store.getById(record.id)) return;
      connectionsGrid.store.add({
          id: util.uuid(),
          targetId: record.id,
      });
  });
}

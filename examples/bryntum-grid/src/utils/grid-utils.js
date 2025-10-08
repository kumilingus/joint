
export function addRow(grid, record) {
    const [newRecord] = grid.store.add(record);
    const selected = grid.selectedRecords;
    if (selected?.length) {
      // Add connection from the last selected record to the new one
      const lastSelected = selected[selected.length - 1];
      const connections = lastSelected.connections
        ? [...lastSelected.connections]
        : [];
      connections.push(newRecord.id);
      lastSelected.set("connections", connections);
    }
    grid.selectRow({ record: newRecord, scrollIntoView: true });
}

// TODO: fix batch update (results in multiple layout calls)
export function deleteSelectedRows(grid) {
    const { selectedRecords, store } = grid;
    if (!selectedRecords.length) return;
    // Remove references to the deleted records from other records' connections
    // store.beginBatch(); // Not working as expected
    store.forEach((record) => {
      if (selectedRecords.find((rec) => rec.id === record.id)) return;
      const connections = record.connections ? [...record.connections] : [];
      const updatedConnections = connections.filter(
        (id) => !selectedRecords.find((rec) => rec.id === id),
      );
      if (connections.length !== updatedConnections.length) {
        record.set("connections", updatedConnections);
      }
    });
    // Select the next record (falling back to the previous one) after deletion
    const nextRecord = store.getNext(
      selectedRecords[selectedRecords.length - 1],
    );
    const prevRecord = store.getPrev(selectedRecords[0]);
    store.remove(selectedRecords);
    // store.endBatch(); // Not working as expected
    grid.selectRow({ record: nextRecord || prevRecord, scrollIntoView: true });
}

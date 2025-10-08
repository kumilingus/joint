import {
  BryntumSplitter,
} from "@bryntum/grid-react";

export function EditorLayout({ toolbar, left, right }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {toolbar}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100vw",
          height: "100vh",
        }}
      >
        {left}
        <BryntumSplitter />
        {right}
      </div>
    </div>
  );
}

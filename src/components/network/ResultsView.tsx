import { useState } from "react";
import { ResultsSidebar } from "./ResultsSidebar";
import { ResultsTable } from "./ResultsTable";

export function ResultsView() {
  const [activeTable, setActiveTable] = useState<string>("productFlow");

  return (
    <div className="flex gap-4 h-[calc(100vh-250px)]">
      <ResultsSidebar activeTable={activeTable} onTableSelect={setActiveTable} />
      <div className="flex-1 overflow-hidden">
        <ResultsTable tableType={activeTable} />
      </div>
    </div>
  );
}

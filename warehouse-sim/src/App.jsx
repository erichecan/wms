import React, { useEffect } from 'react'
import { useWarehouseSimulation } from './engine/useWarehouseSimulation'
import GridMap from './components/GridMap'
import Dashboard from './components/Dashboard'

function App() {
  const {
    grid,
    agentPos,
    status,
    metrics,
    orders,
    mode,
    toggleMode,
    updateCell,
    clearGrid,
    resetToDefault,
    generateOrder,
    startSimulation
  } = useWarehouseSimulation();

  useEffect(() => {
    // Generate an initial order on mount
    generateOrder(5);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-container">
      <div className="bg-glow"></div>

      <main className="main-content">
        <Dashboard
          metrics={metrics}
          status={status}
          mode={mode}
          onToggleMode={toggleMode}
          onClearGrid={clearGrid}
          onResetGrid={resetToDefault}
          onGenerate={generateOrder}
          onStart={startSimulation}
        />

        <div className="map-wrapper glass-panel">
          <GridMap
            grid={grid}
            agentPos={agentPos}
            orders={orders}
            status={status}
            mode={mode}
            updateCell={updateCell}
          />
        </div>
      </main>
    </div>
  )
}

export default App

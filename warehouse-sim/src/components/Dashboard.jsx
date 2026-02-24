import React from 'react';
import { Play, RotateCcw, Box, Clock, Target, Edit3, Save, Trash2 } from 'lucide-react';

export default function Dashboard({
    metrics, status, mode,
    onToggleMode, onClearGrid, onResetGrid, onGenerate, onStart
}) {
    const isIdle = status === 'IDLE';
    const isCompleted = status === 'COMPLETED';
    const isEdit = mode === 'EDIT';

    return (
        <div className="dashboard glass-panel">
            <div className="header">
                <h1 className="title">Control Center</h1>
                <p className="subtitle">Warehouse Simulation 2.0</p>
            </div>

            <div className="status-badge-container flex-between">
                <div className={`status-badge ${status.toLowerCase()}`}>
                    <span className="pulse-dot"></span>
                    {isEdit ? 'EDITING MAP' : status}
                </div>

                <button
                    className={`btn-icon ${isEdit ? 'active' : ''}`}
                    onClick={onToggleMode}
                    title={isEdit ? "Save & Exit Edit Mode" : "Edit Layout"}
                    disabled={!isIdle && !isCompleted}
                >
                    {isEdit ? <Save size={18} /> : <Edit3 size={18} />}
                </button>
            </div>

            {isEdit ? (
                <div className="edit-instructions">
                    <h3>Edit Mode Controls</h3>
                    <ul>
                        <li><strong>Left Click & Drag:</strong> Add Wall</li>
                        <li><strong>Right Click & Drag:</strong> Remove Wall</li>
                        <li><strong>Shift + Drag:</strong> Alternate Remove</li>
                    </ul>
                    <div className="edit-actions">
                        <button className="btn-secondary sm" onClick={onClearGrid}>
                            <Trash2 size={14} /> Clear All
                        </button>
                        <button className="btn-secondary sm" onClick={onResetGrid}>
                            Reset to Default
                        </button>
                    </div>
                </div>
            ) : (
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon"><Target size={20} /></div>
                        <div className="metric-data">
                            <span className="label">Items Picked</span>
                            <span className="value">{metrics.itemsPicked} <span className="dim">/ {metrics.totalItems}</span></span>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon"><Box size={20} /></div>
                        <div className="metric-data">
                            <span className="label">Distance Walked</span>
                            <span className="value">{metrics.distanceWalked} <span className="dim">m</span></span>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon"><Clock size={20} /></div>
                        <div className="metric-data">
                            <span className="label">Time Elapsed</span>
                            <span className="value">{metrics.timeElapsed} <span className="dim">s</span></span>
                        </div>
                    </div>
                </div>
            )}

            {!isEdit && (
                <div className="controls">
                    <button
                        className="btn-primary"
                        onClick={() => onGenerate(5)}
                        disabled={status === 'MOVING' || status === 'PICKING' || status === 'RETURNING'}
                    >
                        <RotateCcw size={16} />
                        {isCompleted ? 'New Order' : 'Generate Order'}
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={onStart}
                        disabled={!isIdle || metrics.totalItems === 0}
                    >
                        <Play size={16} /> Start Run
                    </button>
                </div>
            )}
        </div>
    );
}

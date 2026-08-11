import { useState, useRef } from "react";

interface FlowNode {
  id: string;
  type: "start" | "ai_agent" | "condition" | "action" | "whatsapp";
  label: string;
  x: number;
  y: number;
}

interface Flow {
  id: string;
  name: string;
  active: boolean;
  nodes: FlowNode[];
  updatedAt: string;
}

const DEFAULT_FLOWS: Flow[] = [
  {
    id: "flow_boas_vindas_01",
    name: "🤖 Fluxo 1: Triagem Automática & Qualificação de Leads (Gemini IA)",
    active: true,
    updatedAt: "2026-08-11 15:00",
    nodes: [
      { id: "1", type: "start", label: "Recebe Mensagem no WhatsApp", x: 50, y: 140 },
      { id: "2", type: "ai_agent", label: "Sofia Gemini IA (Qualifica Lead)", x: 340, y: 140 },
      { id: "3", type: "condition", label: "Lead É Qualificado?", x: 630, y: 140 },
      { id: "4", type: "action", label: "Transferir Fila Comercial", x: 920, y: 60 },
      { id: "5", type: "whatsapp", label: "Enviar Link do Curso Hotmart", x: 920, y: 220 }
    ]
  },
  {
    id: "flow_hotmart_abacs_02",
    name: "🛍️ Fluxo 2: Pós-Venda Hotmart & Matrícula ABACS",
    active: true,
    updatedAt: "2026-08-11 15:10",
    nodes: [
      { id: "1", type: "start", label: "Webhook Hotmart Aprovado", x: 50, y: 140 },
      { id: "2", type: "action", label: "Cadastrar no CRM Kanban", x: 340, y: 140 },
      { id: "3", type: "action", label: "Sincronizar Login ABACS", x: 630, y: 140 },
      { id: "4", type: "whatsapp", label: "Disparar Boas-Vindas no WhatsApp", x: 920, y: 140 }
    ]
  }
];

/** Construtor Visual de Fluxos de Automação de Atendimento com IA (FlowBuilder Arraste e Solte). */
export function FlowBuilderPage() {
  const [flows, setFlows] = useState<Flow[]>(DEFAULT_FLOWS);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("flow_boas_vindas_01");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Dragging de nó no Canvas
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedFlow: Flow = (flows.find((f) => f.id === selectedFlowId) || flows[0] || DEFAULT_FLOWS[0]) as Flow;

  // Inicia o arrasto de um nó existente no Canvas
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setActiveNodeId(nodeId);
    setDraggingNodeId(nodeId);

    const node = selectedFlow.nodes.find((n) => n.id === nodeId);
    if (node && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - canvasRect.left - node.x,
        y: e.clientY - canvasRect.top - node.y
      });
    }
  };

  // Movimenta o nó no Canvas ao mover o mouse
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(10, Math.min(2000, e.clientX - canvasRect.left - dragOffset.x));
    const newY = Math.max(10, Math.min(1000, e.clientY - canvasRect.top - dragOffset.y));

    setFlows((prevFlows) =>
      prevFlows.map((flow) => {
        if (flow.id !== selectedFlowId) return flow;
        return {
          ...flow,
          nodes: flow.nodes.map((node) =>
            node.id === draggingNodeId ? { ...node, x: newX, y: newY } : node
          )
        };
      })
    );
  };

  // Solta o nó no Canvas
  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Adiciona um nó ao arrastar da barra de ferramentas para o Canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("nodeType") as FlowNode["type"];
    const label = e.dataTransfer.getData("nodeLabel") || "Novo Nó";

    if (!type || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newNode: FlowNode = {
      id: String(Date.now()),
      type,
      label,
      x: Math.max(20, e.clientX - canvasRect.left - 100),
      y: Math.max(20, e.clientY - canvasRect.top - 25)
    };

    setFlows((prev) =>
      prev.map((f) =>
        f.id === selectedFlowId
          ? { ...f, nodes: [...(f.nodes || []), newNode] }
          : f
      )
    );
    setActiveNodeId(newNode.id);
  };

  const handleAddNodeClick = (type: FlowNode["type"], label: string) => {
    const newNode: FlowNode = {
      id: String(Date.now()),
      type,
      label,
      x: 100 + (selectedFlow.nodes?.length || 0) * 140,
      y: 150
    };

    setFlows((prev) =>
      prev.map((f) =>
        f.id === selectedFlowId
          ? { ...f, nodes: [...(f.nodes || []), newNode] }
          : f
      )
    );
    setActiveNodeId(newNode.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    setFlows((prev) =>
      prev.map((f) =>
        f.id === selectedFlowId
          ? { ...f, nodes: f.nodes.filter((n) => n.id !== nodeId) }
          : f
      )
    );
    if (activeNodeId === nodeId) setActiveNodeId(null);
  };

  const getNodeColor = (type: FlowNode["type"]) => {
    switch (type) {
      case "start":
        return "#10b981";
      case "ai_agent":
        return "#6d28d9";
      case "condition":
        return "#f59e0b";
      case "whatsapp":
        return "#25d366";
      default:
        return "#3b82f6";
    }
  };

  const activeNode = selectedFlow.nodes.find((n) => n.id === activeNodeId);

  return (
    <div style={{ paddingBottom: 40, userSelect: draggingNodeId ? "none" : "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2>⚡ FlowBuilder — Construtor Visual Arraste e Solte</h2>
          <p className="muted" style={{ marginTop: -8 }}>
            Arraste os elementos para qualquer lugar no Canvas e monte fluxos de atendimento com IA Gemini e WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const newFlowName = prompt("Digite o nome do novo Fluxo:");
            if (newFlowName) {
              const newF: Flow = {
                id: `flow_${Date.now()}`,
                name: newFlowName,
                active: true,
                updatedAt: new Date().toLocaleTimeString(),
                nodes: [
                  { id: "1", type: "start", label: "Início do Atendimento", x: 60, y: 140 },
                  { id: "2", type: "ai_agent", label: "Atendimento IA Gemini", x: 340, y: 140 }
                ]
              };
              setFlows([newF, ...flows]);
              setSelectedFlowId(newF.id);
            }
          }}
          style={{ background: "#6d28d9", color: "#fff", border: 0, padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
        >
          + Novo Fluxo de Automação
        </button>
      </div>

      {/* Seletor de Fluxos */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {flows.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setSelectedFlowId(f.id);
              setActiveNodeId(null);
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: selectedFlowId === f.id ? "2px solid #6d28d9" : "1px solid var(--border)",
              background: selectedFlowId === f.id ? "rgba(109, 40, 217, 0.12)" : "var(--panel)",
              color: selectedFlowId === f.id ? "#6d28d9" : "var(--text)",
              fontWeight: selectedFlowId === f.id ? 700 : 500,
              cursor: "pointer"
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Toolbar do Canvas de Arraste e Solte */}
      <div className="card" style={{ padding: 12, marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>✋ Arraste os elementos para o Canvas:</span>

        {[
          { type: "ai_agent", label: "🤖 Robô Gemini IA", color: "#6d28d9" },
          { type: "condition", label: "🔀 Condição (Se/Senão)", color: "#f59e0b" },
          { type: "whatsapp", label: "💬 Enviar WhatsApp", color: "#25d366" },
          { type: "action", label: "⚙️ Ação Fila/Tag", color: "#3b82f6" }
        ].map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("nodeType", item.type);
              e.dataTransfer.setData("nodeLabel", item.label);
            }}
            onClick={() => handleAddNodeClick(item.type as FlowNode["type"], item.label)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              background: "var(--panel2)",
              border: `1px solid ${item.color}`,
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* Canvas Interativo do Construtor Visual */}
      <div
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        className="card"
        style={{
          height: 520,
          position: "relative",
          background: "radial-gradient(circle, var(--border) 1.2px, transparent 1.2px)",
          backgroundSize: "28px 28px",
          overflow: "hidden",
          borderRadius: 14,
          padding: 20,
          cursor: draggingNodeId ? "grabbing" : "default"
        }}
      >
        {/* Linhas Curvas (Bezier SVG) entre os Nós em Tempo Real */}
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {(selectedFlow.nodes || []).map((node, index) => {
            const nextNode = selectedFlow.nodes?.[index + 1];
            if (!nextNode) return null;

            const startX = node.x + 200;
            const startY = node.y + 35;
            const endX = nextNode.x;
            const endY = nextNode.y + 35;
            const controlX1 = startX + (endX - startX) / 2;
            const controlX2 = startX + (endX - startX) / 2;

            return (
              <g key={`connection_${node.id}_${nextNode.id}`}>
                <path
                  d={`M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`}
                  fill="none"
                  stroke="#6d28d9"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                <circle cx={endX} cy={endY} r="5" fill="#6d28d9" />
              </g>
            );
          })}
        </svg>

        {/* Renderização Interativa dos Nós Draggables */}
        {(selectedFlow.nodes || []).map((node) => (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            style={{
              position: "absolute",
              left: node.x,
              top: node.y,
              width: 200,
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--panel)",
              border: `2px solid ${getNodeColor(node.type)}`,
              boxShadow: activeNodeId === node.id ? "0 0 16px rgba(109, 40, 217, 0.5)" : "0 4px 10px rgba(0,0,0,0.12)",
              cursor: draggingNodeId === node.id ? "grabbing" : "grab",
              zIndex: activeNodeId === node.id ? 10 : 2,
              transition: draggingNodeId === node.id ? "none" : "box-shadow 0.15s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: getNodeColor(node.type), textTransform: "uppercase" }}>
                {node.type}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(node.id);
                }}
                style={{ background: "none", border: 0, color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {node.label}
            </div>

            {/* Handle de Conexão */}
            <div
              style={{
                position: "absolute",
                right: -7,
                top: "50%",
                marginTop: -6,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: getNodeColor(node.type),
                border: "2px solid #fff"
              }}
            />
          </div>
        ))}
      </div>

      {/* Painel Lateral do Nó Selecionado */}
      {activeNode && (
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              ⚙️ Editar Nó: {activeNode.label}
            </div>
            <button type="button" onClick={() => handleDeleteNode(activeNode.id)} style={{ fontSize: 12, background: "#ef4444", color: "#fff", border: 0, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>
              Excluir Nó
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Nome do Nó:</label>
            <input
              type="text"
              value={activeNode.label}
              onChange={(e) => {
                const newLabel = e.target.value;
                setFlows((prev) =>
                  prev.map((f) =>
                    f.id === selectedFlowId
                      ? {
                          ...f,
                          nodes: f.nodes.map((n) => (n.id === activeNode.id ? { ...n, label: newLabel } : n))
                        }
                      : f
                  )
                );
              }}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel2)", color: "var(--text)", fontSize: 13 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

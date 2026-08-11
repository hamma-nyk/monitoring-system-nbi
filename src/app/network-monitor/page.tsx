"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  Connection,
  Edge,
  ReactFlowInstance,
  Node,
  ConnectionMode,
  Viewport,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  X,
  Trash2,
  Plus,
  Monitor,
  Router,
  Server,
  Wifi,
  Printer,
  HardDrive,
  Box,
  Smartphone,
} from "lucide-react";

import DeviceNode from "@/components/DeviceNode";
import NetworkSidebar from "@/components/NetworkSidebar";

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // STATE NODE & EDGE (Kabel)
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const [masterTypes, setMasterTypes] = useState<any[]>([]);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  // State Modal Perangkat
  const [modalData, setModalData] = useState({
    isOpen: false,
    isNew: false,
    nodeId: "",
    type: "",
    icon: "",
    ip: "",
    remark: "",
    xPos: 0,
    yPos: 0,
  });

  // State Modal Master Tipe
  const [typeModal, setTypeModal] = useState({
    isOpen: false,
    newTypeName: "",
    newTypeIcon: "monitor",
  });

  // Daftar Pilihan Ikon
  const availableIcons = [
    { name: "monitor", component: <Monitor size={18} /> },
    { name: "router", component: <Router size={18} /> },
    { name: "server", component: <Server size={18} /> },
    { name: "wifi", component: <Wifi size={18} /> },
    { name: "printer", component: <Printer size={18} /> },
    { name: "harddrive", component: <HardDrive size={18} /> },
    { name: "smartphone", component: <Smartphone size={18} /> },
    { name: "box", component: <Box size={18} /> },
  ];

  const nodeTypes = useMemo(() => ({ device: DeviceNode }), []);

  // --- 1. LOAD DATA AWAL (NODE & EDGE) ---
  const fetchMasterTypes = async () => {
    try {
      const res = await fetch("/api/master-types");
      const data = await res.json();
      setMasterTypes(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchMasterTypes();
      try {
        // Load Nodes
        const res = await fetch("/api/devices");
        const data = await res.json();

        if (Array.isArray(data)) {
          const mappedNodes: Node[] = data.map((d: any) => ({
            id: d.id.toString(),
            type: "device",
            position: { x: d.xPos, y: d.yPos },
            data: {
              remark: d.remark,
              type: d.type?.name || "Device",
              icon: d.type?.icon || "monitor",
              ip: d.ipAddress,
              status: "unknown",
              latency: 0,
            },
          }));
          setNodes(mappedNodes);
        }

        // Load Edges (Kabel)
        const edgesRes = await fetch("/api/edges");
        const dbEdges = await edgesRes.json();
        if (Array.isArray(dbEdges)) {
          const mappedEdges: Edge[] = dbEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            animated: true,
            // Warna kabel disesuaikan menjadi slate-400 agar lebih elegan/monochrome
            style: { strokeWidth: 2, stroke: "#94a3b8" },
          }));
          setEdges(mappedEdges);
        }
      } catch (error) {
        console.error("Gagal memuat data", error);
      }
    };
    loadData();
  }, []);

  // --- 2. SINKRONISASI DATA DARI DATABASE (Pasif) ---
  useEffect(() => {
    const syncData = async () => {
      try {
        const res = await fetch("/api/devices");
        const dbDevices = await res.json();

        if (Array.isArray(dbDevices)) {
          setNodes((currentNodes) => {
            return currentNodes.map((node) => {
              if (node.id.startsWith("temp_")) return node;

              const freshData = dbDevices.find(
                (d) => d.id.toString() === node.id,
              );
              if (freshData) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: freshData.status,
                    latency: freshData.latency,
                  },
                };
              }
              return node;
            });
          });
        }
      } catch (error) {
        console.error("Gagal sinkronisasi data", error);
      }
    };

    const intervalId = setInterval(syncData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // --- 3. FUNGSI VIEWPORT, KABEL (EDGES) & NODE ---

  // A. Mengembalikan posisi Zoom/Pan dari LocalStorage saat Canvas ter-load
  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
    const savedViewport = localStorage.getItem("rf-viewport");
    if (savedViewport) {
      instance.setViewport(JSON.parse(savedViewport));
    }
  }, []);

  // B. Menyimpan posisi Zoom/Pan setiap kali pengguna menggeser atau men-zoom
  const onMoveEnd = useCallback((event: any, viewport: Viewport) => {
    localStorage.setItem("rf-viewport", JSON.stringify(viewport));
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    changes.forEach(async (change) => {
      if (change.type === "remove") {
        try {
          await fetch(`/api/edges/${change.id}`, { method: "DELETE" });
        } catch (error) {
          console.error("Gagal menghapus kabel dari DB:", error);
        }
      }
    });
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback(async (params: Connection) => {
    const edgeId = `e-${params.source}-${params.target}-${Date.now()}`;
    const newEdge = {
      ...params,
      id: edgeId,
      animated: true,
      style: { strokeWidth: 2, stroke: "#94a3b8" }, // slate-400
    };

    setEdges((eds) => addEdge(newEdge, eds));

    await fetch("/api/edges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: edgeId,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      }),
    });
  }, []);

  const onEdgeContextMenu = useCallback(
    async (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      if (confirm("Hapus jalur koneksi ini?")) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        await fetch(`/api/edges/${edge.id}`, { method: "DELETE" });
      }
    },
    [],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      const defaultRemark = event.dataTransfer.getData("remark");
      const icon = event.dataTransfer.getData("icon") || "monitor";
      if (!type) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      setModalData({
        isOpen: true,
        isNew: true,
        nodeId: `temp_${Date.now()}`,
        type,
        icon,
        ip: "",
        remark: defaultRemark,
        xPos: position.x,
        yPos: position.y,
      });
    },
    [reactFlowInstance],
  );

  const onNodeDragStop = async (event: React.MouseEvent, node: Node) => {
    if (node.id.startsWith("temp_")) return;
    await fetch(`/api/devices/${node.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xPos: node.position.x, yPos: node.position.y }),
    });
  };

  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setModalData({
        isOpen: true,
        isNew: false,
        nodeId: node.id,
        type: node.data.type,
        icon: node.data.icon,
        ip: node.data.ip,
        remark: node.data.remark,
        xPos: node.position.x,
        yPos: node.position.y,
      });
    },
    [],
  );

  // --- 4. CRUD NODE & MASTER TIPE ---
  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalData.isNew) {
        const res = await fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typeName: modalData.type,
            ipAddress: modalData.ip,
            remark: modalData.remark,
            xPos: modalData.xPos,
            yPos: modalData.yPos,
          }),
        });
        const newDbNode = await res.json();
        if (!res.ok) return alert(newDbNode.error || "Gagal menyimpan");

        setNodes((nds) =>
          nds.concat({
            id: newDbNode.id.toString(),
            type: "device",
            position: { x: newDbNode.xPos, y: newDbNode.yPos },
            data: {
              remark: newDbNode.remark,
              type: newDbNode.type?.name || modalData.type,
              icon: modalData.icon,
              ip: newDbNode.ipAddress,
              status: "unknown",
              latency: 0,
            },
          }),
        );
      } else {
        await fetch(`/api/devices/${modalData.nodeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ipAddress: modalData.ip,
            remark: modalData.remark,
          }),
        });
        setNodes((nds) =>
          nds.map((n) =>
            n.id === modalData.nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    ip: modalData.ip,
                    remark: modalData.remark,
                  },
                }
              : n,
          ),
        );
      }
      setModalData({ ...modalData, isOpen: false });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!modalData.isNew && confirm("Hapus perangkat ini?")) {
      await fetch(`/api/devices/${modalData.nodeId}`, { method: "DELETE" });
      setNodes((nds) => nds.filter((n) => n.id !== modalData.nodeId));
      setModalData({ ...modalData, isOpen: false });
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeModal.newTypeName) return;

    await fetch("/api/master-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: typeModal.newTypeName,
        icon: typeModal.newTypeIcon,
      }),
    });

    setTypeModal({ ...typeModal, newTypeName: "", newTypeIcon: "monitor" });
    fetchMasterTypes();
  };

  const handleDeleteType = async (id: number) => {
    if (confirm("Yakin hapus tipe ini?")) {
      const res = await fetch(`/api/master-types/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error);
      } else {
        fetchMasterTypes();
      }
    }
  };

  return (
    <div className="flex flex-row h-full w-full bg-slate-50 relative overflow-hidden">
      {/* SIDEBAR MASTER TIPE DI KANAN (Auto Hide) */}
      <NetworkSidebar
        masterTypes={masterTypes}
        onManageClick={() => setTypeModal({ ...typeModal, isOpen: true })}
      />

      {/* CANVAS REACT FLOW */}
      <div className="flex-1 h-full relative w-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeDragStop={onNodeDragStop}
          onInit={onInit}
          onMoveEnd={onMoveEnd}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          connectionMode={ConnectionMode.Loose}
          // ✅ PERBAIKAN: Cek apakah 'window' tersedia (berarti sedang di browser, bukan di server)
          fitView={
            typeof window !== "undefined"
              ? !localStorage.getItem("rf-viewport")
              : true
          }
        >
          <Background color="#cbd5e1" gap={16} size={1.5} />
          <Controls className="bg-white border-slate-200 shadow-sm rounded-md" />
        </ReactFlow>
      </div>

      {/* ================= MODAL PERANGKAT (SHADCN STYLE) ================= */}
      {modalData.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                {modalData.isNew ? "Tambah Perangkat" : "Edit Perangkat"}
              </h3>
              <button
                onClick={() => setModalData({ ...modalData, isOpen: false })}
                className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNode} className="p-5 flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900">
                  Nama / Remark
                </label>
                <input
                  type="text"
                  required
                  value={modalData.remark}
                  onChange={(e) =>
                    setModalData({ ...modalData, remark: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  placeholder="Contoh: Router Ruang Rapat"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900">
                  IP Address
                </label>
                <input
                  type="text"
                  required
                  value={modalData.ip}
                  onChange={(e) =>
                    setModalData({ ...modalData, ip: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  placeholder="192.168.1.x"
                />
              </div>

              <div className="flex justify-between items-center mt-4 pt-2">
                {!modalData.isNew ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-red-50 text-red-600 hover:bg-red-100 h-9 w-9 border border-red-100"
                    title="Hapus Perangkat"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setModalData({ ...modalData, isOpen: false })
                    }
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900 h-9 px-4"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-900 text-slate-50 shadow hover:bg-slate-900/90 h-9 px-4"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL KELOLA MASTER TIPE (SHADCN STYLE) ================= */}
      {typeModal.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-[450px] flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
                Kelola Master Tipe
              </h3>
              <button
                onClick={() => setTypeModal({ ...typeModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAddType}
              className="flex flex-col gap-4 p-5 bg-slate-50/50 border-b border-slate-100"
            >
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900">
                  Nama Tipe
                </label>
                <input
                  type="text"
                  placeholder="Cth: Access Point"
                  required
                  value={typeModal.newTypeName}
                  onChange={(e) =>
                    setTypeModal({ ...typeModal, newTypeName: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900">
                  Ikon Representasi
                </label>
                <div className="flex gap-2 flex-wrap">
                  {availableIcons.map((icon) => {
                    const isSelected = typeModal.newTypeIcon === icon.name;
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() =>
                          setTypeModal({ ...typeModal, newTypeIcon: icon.name })
                        }
                        className={`p-2 rounded-md border transition-all ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-slate-50 shadow-sm"
                            : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                        title={icon.name}
                      >
                        {icon.component}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-900 text-slate-50 shadow hover:bg-slate-900/90 h-9 w-full gap-2 mt-2"
              >
                <Plus size={16} /> Tambah Tipe
              </button>
            </form>

            <div className="flex-1 overflow-y-auto p-5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Daftar Master Tersimpan
              </h4>
              <div className="border border-slate-200 rounded-md divide-y divide-slate-100 bg-white">
                {masterTypes.length === 0 ? (
                  <div className="p-4 text-center text-sm font-medium text-slate-400">
                    Belum ada tipe data.
                  </div>
                ) : (
                  masterTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex justify-between items-center px-4 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm font-medium tracking-tight text-slate-900 capitalize flex items-center gap-3">
                        <span className="text-slate-500 flex items-center justify-center bg-slate-100 p-1.5 rounded-md border border-slate-200">
                          {availableIcons.find((i) => i.name === type.icon)
                            ?.component || <Monitor size={14} />}
                        </span>
                        {type.name}
                      </span>
                      <button
                        onClick={() => handleDeleteType(type.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus Master"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NetworkMonitorPage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

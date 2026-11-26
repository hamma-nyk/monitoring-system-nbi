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
  Cctv,
  Network,
  Waypoints,
  Palette,
  Square,
  RectangleHorizontal,
  Circle,
  Diamond,
  Triangle,
  Hexagon,
  RotateCcw,
  Globe,
  Search,
  Download,
  Upload,
} from "lucide-react";

import DeviceNode from "@/components/DeviceNode";
import NetworkSidebar from "@/components/NetworkSidebar";
import PortEdge from "@/components/PortEdge";
import AreaNode from "@/components/AreaNode";

const PORT_TYPE_OPTIONS: Record<string, string[]> = {
  modem: ["WAN", "LAN"],
  gateway: ["WAN", "LAN", "SFP"],
  switch: ["LAN", "POE", "SFP"],
};

const getDevicePortCategory = (type?: string, icon?: string): string | null => {
  const t = (type || "").toLowerCase();
  const i = (icon || "").toLowerCase();
  if (t === "modem" || i === "modem") return "modem";
  if (t === "gateway" || i === "gateway") return "gateway";
  if (t === "switch" || i === "switch") return "switch";
  return null;
};

const buildDefaultPortTypes = (
  category: string,
  count: number,
  existing: string[] = [],
): string[] => {
  const allowed = PORT_TYPE_OPTIONS[category] || ["LAN"];
  return Array.from({ length: count }, (_, idx) => {
    const prev = existing[idx];
    if (prev && allowed.includes(prev)) return prev;
    if ((category === "modem" || category === "gateway") && idx === 0) {
      return "WAN";
    }
    return "LAN";
  });
};

const buildDefaultPortVlans = (
  count: number,
  existing: string[] = [],
): string[] => {
  return Array.from({ length: count }, (_, idx) => existing[idx] || "");
};

const AREA_SHAPES = [
  { id: "rectangle", name: "Kotak", icon: <Square size={14} /> },
  { id: "rounded", name: "Rounded", icon: <RectangleHorizontal size={14} /> },
  { id: "circle", name: "Bulat", icon: <Circle size={14} /> },
  { id: "diamond", name: "Diamond", icon: <Diamond size={14} /> },
  { id: "triangle", name: "Segitiga", icon: <Triangle size={14} /> },
  { id: "hexagon", name: "Hexagon", icon: <Hexagon size={14} /> },
];

const EDGE_COLORS = [
  { name: "Slate", value: "#94a3b8" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#ef4444" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Orange", value: "#f97316" },
];

const formatPortLabel = (
  sourceHandle?: string | null,
  targetHandle?: string | null,
) => {
  const parts: string[] = [];
  if (sourceHandle?.startsWith("port-")) {
    parts.push(`Port ${sourceHandle.replace("port-", "")}`);
  }
  if (targetHandle?.startsWith("port-")) {
    parts.push(`Port ${targetHandle.replace("port-", "")}`);
  }
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ${parts[1]}`;
};

  const buildEdgeVisuals = (
    color: string,
    sourceHandle?: string | null,
    targetHandle?: string | null,
    labelProgress = 0.5,
  ) => {
    const portLabel = formatPortLabel(sourceHandle, targetHandle);
    return {
      type: "portEdge",
      animated: true,
      data: {
        portLabel,
        labelProgress,
      },
      style: { strokeWidth: 2, stroke: color },
    };
  };

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
    portCount: 8 as number | null,
    portTypes: [] as string[],
    portVlans: [] as string[],
    xPos: 0,
    yPos: 0,
  });

  // State Interactivity (Lock / Unlock Canvas)
  const [isInteractive, setIsInteractive] = useState(true);

  // State Find Device (Search Bar)
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // State Warna Line Penghubung (Edge)
  const [defaultEdgeColor, setDefaultEdgeColor] = useState("#94a3b8");
  const [selectedEdge, setSelectedEdge] = useState<{
    id: string;
    color: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  } | null>(null);

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
    { name: "switch", component: <Network size={18} /> },
    { name: "gateway", component: <Waypoints size={18} /> },
    { name: "modem", component: <Globe size={18} /> },
    { name: "cctv", component: <Cctv size={18} /> },
    { name: "server", component: <Server size={18} /> },
    { name: "wifi", component: <Wifi size={18} /> },
    { name: "printer", component: <Printer size={18} /> },
    { name: "harddrive", component: <HardDrive size={18} /> },
    { name: "smartphone", component: <Smartphone size={18} /> },
    { name: "box", component: <Box size={18} /> },
  ];

  const nodeTypes = useMemo(() => ({ device: DeviceNode, area: AreaNode }), []);
  const edgeTypes = useMemo(() => ({ portEdge: PortEdge }), []);

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

  const loadData = useCallback(async () => {
    await fetchMasterTypes();
    try {
      // Load Devices & Areas
      const [devRes, areaRes] = await Promise.all([
        fetch("/api/devices"),
        fetch("/api/areas"),
      ]);
      const data = await devRes.json();
      const areasData = await areaRes.json();

      const loadedNodes: Node[] = [];

      if (Array.isArray(areasData)) {
        for (const a of areasData) {
          loadedNodes.push({
            id: a.id,
            type: "area",
            position: { x: a.xPos, y: a.yPos },
            zIndex: -1,
            style: { width: a.width || 240, height: a.height || 160 },
            data: {
              shape: a.shape || "rectangle",
              label: a.label || "",
              rotation: a.rotation ?? 0,
              color: a.color || "#3b82f6",
              opacity: a.opacity ?? 5,
            },
          });
        }
      }

      if (Array.isArray(data)) {
        for (const d of data) {
          loadedNodes.push({
            id: d.id.toString(),
            type: "device",
            position: { x: d.xPos, y: d.yPos },
            data: {
              remark: d.remark,
              type: d.type?.name || "Device",
              icon: d.type?.icon || "monitor",
              ip: d.ipAddress,
              portCount: d.portCount ?? null,
              portTypes: Array.isArray(d.portTypes) ? d.portTypes : [],
              portVlans: Array.isArray(d.portVlans) ? d.portVlans : [],
              status: "unknown",
              latency: 0,
            },
          });
        }
      }
      setNodes(loadedNodes);

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
          ...buildEdgeVisuals(
            e.color || "#94a3b8",
            e.sourceHandle,
            e.targetHandle,
            e.labelProgress ?? 0.5,
          ),
        }));
        setEdges(mappedEdges);
      }

      // Load Canvas Settings (Lock / Unlock Interactivity)
      const settingsRes = await fetch("/api/canvas-settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (typeof settingsData?.isInteractive === "boolean") {
          setIsInteractive(settingsData.isInteractive);
        }
      }
    } catch (error) {
      console.error("Gagal memuat data", error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

        const settingsRes = await fetch("/api/canvas-settings");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (typeof settingsData?.isInteractive === "boolean") {
            setIsInteractive(settingsData.isInteractive);
          }
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

  const onConnect = useCallback(
    async (params: Connection) => {
      const edgeId = `e-${params.source}-${params.target}-${Date.now()}`;
      const newEdge: Edge = {
        ...params,
        source: params.source!,
        target: params.target!,
        id: edgeId,
        ...buildEdgeVisuals(
          defaultEdgeColor,
          params.sourceHandle,
          params.targetHandle,
        ),
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
          color: defaultEdgeColor,
        }),
      });
    },
    [defaultEdgeColor],
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!isInteractive) return;
      event.stopPropagation();
      const currentColor =
        (edge.style?.stroke as string) || "#94a3b8";
      setSelectedEdge({
        id: edge.id,
        color: currentColor,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      });
    },
    [isInteractive],
  );

  const handleChangeEdgeColor = async (edgeId: string, newColor: string) => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              ...buildEdgeVisuals(
                newColor,
                e.sourceHandle,
                e.targetHandle,
                e.data?.labelProgress ?? 0.5,
              ),
            }
          : e,
      ),
    );
    setSelectedEdge((prev) =>
      prev && prev.id === edgeId ? { ...prev, color: newColor } : prev,
    );

    try {
      await fetch(`/api/edges/${edgeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: newColor }),
      });
    } catch (error) {
      console.error("Gagal mengupdate warna kabel:", error);
    }
  };

  const handleDeleteSelectedEdge = async () => {
    if (!selectedEdge) return;
    const edgeId = selectedEdge.id;
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdge(null);
    try {
      await fetch(`/api/edges/${edgeId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Gagal menghapus kabel:", error);
    }
  };

  const onEdgeContextMenu = useCallback(
    async (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      if (!isInteractive) return;
      if (confirm("Hapus jalur koneksi ini?")) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        setSelectedEdge((prev) => (prev?.id === edge.id ? null : prev));
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
      if (!isInteractive) return;
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

      const portCategory = getDevicePortCategory(type, icon);
      const initialCount = portCategory
        ? portCategory === "switch"
          ? 8
          : 4
        : null;

      setModalData({
        isOpen: true,
        isNew: true,
        nodeId: `temp_${Date.now()}`,
        type,
        icon,
        ip: "",
        remark: defaultRemark,
        portCount: initialCount,
        portTypes:
          portCategory && initialCount
            ? buildDefaultPortTypes(portCategory, initialCount)
            : [],
        portVlans:
          portCategory && initialCount
            ? buildDefaultPortVlans(initialCount)
            : [],
        xPos: position.x,
        yPos: position.y,
      });
    },
    [reactFlowInstance, isInteractive],
  );

  const onNodeDragStop = async (event: React.MouseEvent, node: Node) => {
    if (node.id.startsWith("temp_")) return;
    if (node.type === "area") {
      await fetch(`/api/areas/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xPos: node.position.x, yPos: node.position.y }),
      });
      return;
    }
    await fetch(`/api/devices/${node.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xPos: node.position.x, yPos: node.position.y }),
    });
  };

  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!isInteractive) return;
      if (node.type === "area") return;
      const portCategory = getDevicePortCategory(
        node.data.type,
        node.data.icon,
      );
      const count = portCategory
        ? node.data.portCount || (portCategory === "switch" ? 8 : 4)
        : null;

      setModalData({
        isOpen: true,
        isNew: false,
        nodeId: node.id,
        type: node.data.type,
        icon: node.data.icon,
        ip: node.data.ip,
        remark: node.data.remark,
        portCount: count,
        portTypes:
          portCategory && count
            ? buildDefaultPortTypes(
                portCategory,
                count,
                Array.isArray(node.data.portTypes) ? node.data.portTypes : [],
              )
            : [],
        portVlans:
          portCategory && count
            ? buildDefaultPortVlans(
                count,
                Array.isArray(node.data.portVlans) ? node.data.portVlans : [],
              )
            : [],
        xPos: node.position.x,
        yPos: node.position.y,
      });
    },
    [],
  );

  const portCategoryModal = getDevicePortCategory(
    modalData.type,
    modalData.icon,
  );
  const allowedPortTypesModal = portCategoryModal
    ? PORT_TYPE_OPTIONS[portCategoryModal]
    : [];

  // --- 4. CRUD NODE & MASTER TIPE ---
  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedPortCount = portCategoryModal
      ? Math.max(
          1,
          Math.min(
            64,
            Number(modalData.portCount) ||
              (portCategoryModal === "switch" ? 8 : 4),
          ),
        )
      : null;

    const resolvedPortTypes =
      portCategoryModal && resolvedPortCount
        ? buildDefaultPortTypes(
            portCategoryModal,
            resolvedPortCount,
            modalData.portTypes,
          )
        : null;

    const resolvedPortVlans =
      (portCategoryModal === "switch" || portCategoryModal === "gateway") &&
      resolvedPortCount
        ? buildDefaultPortVlans(resolvedPortCount, modalData.portVlans)
        : null;

    try {
      if (modalData.isNew) {
        const res = await fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typeName: modalData.type,
            ipAddress: modalData.ip,
            remark: modalData.remark,
            portCount: resolvedPortCount,
            portTypes: resolvedPortTypes,
            portVlans: resolvedPortVlans,
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
              portCount: newDbNode.portCount ?? resolvedPortCount,
              portTypes: newDbNode.portTypes ?? resolvedPortTypes ?? [],
              portVlans: newDbNode.portVlans ?? resolvedPortVlans ?? [],
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
            portCount: resolvedPortCount,
            portTypes: resolvedPortTypes,
            portVlans: resolvedPortVlans,
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
                    portCount: resolvedPortCount,
                    portTypes: resolvedPortTypes ?? [],
                    portVlans: resolvedPortVlans ?? [],
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

  const nodesWithPortColors = useMemo(() => {
    const portColorMap: Record<string, Record<string, string>> = {};
    for (const edge of edges) {
      const stroke = (edge.style?.stroke as string) || "#94a3b8";
      if (edge.sourceHandle?.startsWith("port-")) {
        if (!portColorMap[edge.source]) portColorMap[edge.source] = {};
        portColorMap[edge.source][edge.sourceHandle] = stroke;
      }
      if (edge.targetHandle?.startsWith("port-")) {
        if (!portColorMap[edge.target]) portColorMap[edge.target] = {};
        portColorMap[edge.target][edge.targetHandle] = stroke;
      }
    }

    return nodes.map((node) => {
      const portColors = portColorMap[node.id];
      const isHighlighted = highlightedNodeId === node.id;
      if (!portColors && !node.data?.portColors && !isHighlighted && !node.data?.isHighlighted) {
        return node;
      }
      return {
        ...node,
        data: {
          ...node.data,
          portColors: portColors || {},
          isHighlighted,
        },
      };
    });
  }, [nodes, edges, highlightedNodeId]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const deviceNodes = nodes.filter((n) => n.type === "device");
    if (!q) return deviceNodes.slice(0, 8);
    return deviceNodes.filter((n) => {
      const remark = (n.data?.remark || "").toLowerCase();
      const ip = (n.data?.ip || "").toLowerCase();
      const type = (n.data?.type || "").toLowerCase();
      return remark.includes(q) || ip.includes(q) || type.includes(q);
    });
  }, [nodes, searchQuery]);

  const handleFocusDevice = useCallback(
    (node: Node) => {
      if (!reactFlowInstance) return;
      const centerX = node.position.x + 80;
      const centerY = node.position.y + 65;
      reactFlowInstance.setCenter(centerX, centerY, {
        zoom: 1.15,
        duration: 450,
      });

      setHighlightedNodeId(node.id);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedNodeId(null);
      }, 2500);
      setIsSearchOpen(false);
    },
    [reactFlowInstance],
  );

  const handleAddArea = async (shape: string) => {
    const areaId = `area-${Date.now()}`;
    let xPos = 120;
    let yPos = 120;

    if (reactFlowWrapper.current && reactFlowInstance) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const center = reactFlowInstance.project({
        x: bounds.width / 2 - 120,
        y: bounds.height / 2 - 80,
      });
      xPos = Math.round(center.x);
      yPos = Math.round(center.y);
    }

    const newAreaNode: Node = {
      id: areaId,
      type: "area",
      position: { x: xPos, y: yPos },
      zIndex: -1,
      selected: true,
      style: { width: 240, height: 160 },
      data: {
        shape,
        label: "Area Baru",
        rotation: 0,
        color: defaultEdgeColor || "#3b82f6",
        opacity: 5,
      },
    };

    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      newAreaNode,
    ]);

    try {
      await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: areaId,
          shape,
          label: "Area Baru",
          xPos,
          yPos,
          width: 240,
          height: 160,
          rotation: 0,
          color: defaultEdgeColor || "#3b82f6",
          opacity: 5,
        }),
      });
    } catch (error) {
      console.error("Gagal membuat area:", error);
    }
  };

  const selectedAreaNode = useMemo(
    () => nodes.find((n) => n.type === "area" && n.selected),
    [nodes],
  );

  const updateSelectedArea = async (
    updates: Partial<{
      shape: string;
      label: string;
      color: string;
      opacity: number;
      rotation: number;
    }>,
  ) => {
    if (!selectedAreaNode) return;
    const areaId = selectedAreaNode.id;

    setNodes((nds) =>
      nds.map((n) =>
        n.id === areaId ? { ...n, data: { ...n.data, ...updates } } : n,
      ),
    );

    try {
      await fetch(`/api/areas/${areaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Gagal mengupdate area:", error);
    }
  };

  const handleDeleteSelectedArea = async () => {
    if (!selectedAreaNode) return;
    const areaId = selectedAreaNode.id;
    setNodes((nds) => nds.filter((n) => n.id !== areaId));
    try {
      await fetch(`/api/areas/${areaId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Gagal menghapus area:", error);
    }
  };

  const edgesWithPortLabels = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const getPortText = (nodeId: string, handleId?: string | null) => {
      if (!handleId?.startsWith("port-")) return null;
      const portNum = parseInt(handleId.replace("port-", ""), 10);
      if (isNaN(portNum)) return null;
      const node = nodeMap.get(nodeId);
      const rawVlan = (node?.data?.portVlans?.[portNum - 1] || "").trim();
      if (!rawVlan) return `Port ${portNum}`;
      const tag =
        rawVlan.toUpperCase() === "TRUNK" ? "TRUNK" : `V${rawVlan}`;
      return `Port ${portNum} (${tag})`;
    };

    return edges.map((edge) => {
      const sText = getPortText(edge.source, edge.sourceHandle);
      const tText = getPortText(edge.target, edge.targetHandle);
      const parts = [sText, tText].filter(Boolean) as string[];
      const portLabel =
        parts.length === 0
          ? undefined
          : parts.length === 1
            ? parts[0]
            : `${parts[0]} ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬Â ${parts[1]}`;
      return {
        ...edge,
        data: {
          ...edge.data,
          portLabel,
        },
      };
    });
  }, [edges, nodes]);

  const handleInteractiveChange = useCallback(async (nextStatus: boolean) => {
    setIsInteractive(nextStatus);
    if (!nextStatus) {
      setSelectedEdge(null);
    }
    try {
      await fetch("/api/canvas-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isInteractive: nextStatus }),
      });
    } catch (error) {
      console.error("Gagal menyimpan status lock canvas:", error);
    }
  }, []);

  const handleExportTopology = async () => {
    try {
      const res = await fetch("/api/network/export");
      if (!res.ok) throw new Error("Gagal mengambil data export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `network-topology-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export gagal:", error);
      alert("Gagal mengekspor topologi jaringan.");
    }
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (
      !confirm(
        "Import akan mengganti seluruh topologi (perangkat, kabel, dan area) saat ini dengan data dari file. Lanjutkan?",
      )
    ) {
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/network/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Gagal mengimpor file topologi.");
        return;
      }

      setSelectedEdge(null);
      await loadData();
      alert(
        `Import berhasil: ${result.counts?.deviceCount ?? 0} perangkat, ${result.counts?.edgeCount ?? 0} kabel, ${result.counts?.areaCount ?? 0} area.`,
      );
    } catch (error) {
      console.error("Import gagal:", error);
      alert("File JSON tidak valid atau gagal diimpor.");
    } finally {
      setIsImporting(false);
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
        {/* TOOLBAR WARNA KABEL & GAMBAR AREA */}
        <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-3">
          {/* SEARCH BAR FIND DEVICE */}
          <div className="relative">
            <div className="h-9 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 shadow-sm focus-within:ring-1 focus-within:ring-slate-900">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => {
                  setTimeout(() => setIsSearchOpen(false), 150);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    e.preventDefault();
                    handleFocusDevice(searchResults[0]);
                  } else if (e.key === "Escape") {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
                placeholder="Cari device / IP..."
                className="w-40 text-xs text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setHighlightedNodeId(null);
                  }}
                  className="text-slate-400 hover:text-slate-700"
                  title="Bersihkan pencarian"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {isSearchOpen && (
              <div className="absolute left-0 mt-1.5 w-64 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100 z-40">
                {searchResults.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-400 text-center">
                    Perangkat tidak ditemukan
                  </div>
                ) : (
                  searchResults.map((node) => {
                    const status = node.data?.status;
  return (
                      <button
                        key={node.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleFocusDevice(node);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              status === "online"
                                ? "bg-emerald-500"
                                : status === "offline"
                                  ? "bg-rose-500"
                                  : "bg-slate-300"
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {node.data?.remark}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              {node.data?.ip || "Tanpa IP"}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                          {node.data?.type}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="h-9 flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 pr-1 border-r border-slate-200">
              <Palette size={14} className="text-slate-500" />
              <span>Warna Line</span>
            </div>
            <div className="flex items-center gap-1.5">
              {EDGE_COLORS.map((c) => {
                const active = defaultEdgeColor.toLowerCase() === c.value.toLowerCase();
  return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setDefaultEdgeColor(c.value)}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      active ? "ring-2 ring-offset-1 ring-slate-900 scale-110" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={`Warna ${c.name}`}
                  />
                );
              })}
              <label
                className="relative w-5 h-5 rounded-full border border-slate-300 overflow-hidden cursor-pointer flex items-center justify-center bg-gradient-to-tr from-rose-400 via-amber-300 to-sky-400"
                title="Pilih warna custom"
              >
                <input
                  type="color"
                  value={defaultEdgeColor}
                  onChange={(e) => setDefaultEdgeColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="h-9 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 shadow-sm">
            <span className="text-xs font-medium text-slate-600 pr-1.5 border-r border-slate-200">
              Area
            </span>
            {AREA_SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleAddArea(s.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title={`Tambah Area ${s.name}`}
              >
                {s.icon}
              </button>
            ))}
          </div>

          <div className="h-9 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2 shadow-sm">
            <button
              type="button"
              onClick={handleExportTopology}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Export Topologi ke JSON"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-200" />
            <button
              type="button"
              disabled={isImporting}
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              title="Import Topologi dari JSON"
            >
              <Upload size={14} />
              <span>{isImporting ? "Importing..." : "Import"}</span>
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* FLOATING EDITOR SAAT AREA DIPILIH */}
        {selectedAreaNode && !selectedEdge && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-lg max-w-[92vw]">
            <input
              type="text"
              value={selectedAreaNode.data.label || ""}
              onChange={(e) => updateSelectedArea({ label: e.target.value })}
              placeholder="Nama Area..."
              className="h-7 w-32 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
            />

            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              {AREA_SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateSelectedArea({ shape: s.id })}
                  className={`p-1.5 rounded-md transition-colors ${
                    selectedAreaNode.data.shape === s.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  title={s.name}
                >
                  {s.icon}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              {EDGE_COLORS.slice(0, 6).map((c) => {
                const active =
                  (selectedAreaNode.data.color || "").toLowerCase() ===
                  c.value.toLowerCase();
  return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => updateSelectedArea({ color: c.value })}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      active
                        ? "ring-2 ring-offset-1 ring-slate-900 scale-110"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                );
              })}
              <label
                className="relative w-5 h-5 rounded-full border border-slate-300 overflow-hidden cursor-pointer bg-gradient-to-tr from-rose-400 via-amber-300 to-sky-400"
                title="Warna custom area"
              >
                <input
                  type="color"
                  value={selectedAreaNode.data.color || "#3b82f6"}
                  onChange={(e) =>
                    updateSelectedArea({ color: e.target.value })
                  }
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-[10px] font-medium text-slate-500">
                Opasitas
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedAreaNode.data.opacity ?? 5}
                onChange={(e) =>
                  updateSelectedArea({ opacity: Number(e.target.value) })
                }
                className="w-16 accent-slate-900 cursor-pointer"
                title="Atur transparansi area"
              />
              <span className="text-[10px] font-mono font-semibold text-slate-600 w-8 text-right">
                {selectedAreaNode.data.opacity ?? 5}%
              </span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <input
                type="range"
                min={-180}
                max={180}
                value={selectedAreaNode.data.rotation ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateSelectedArea({
                    rotation: Math.abs(val) <= 4 ? 0 : val,
                  });
                }}
                className="w-20 accent-slate-900 cursor-pointer"
                title="Putar Area"
              />
              <span
                className={`text-[11px] font-mono font-semibold w-10 text-center ${
                  (selectedAreaNode.data.rotation ?? 0) === 0
                    ? "text-emerald-600"
                    : "text-slate-600"
                }`}
              >
                {selectedAreaNode.data.rotation ?? 0}Ãƒâ€šÃ‚Â°
              </span>
              <button
                type="button"
                onClick={() => updateSelectedArea({ rotation: 0 })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                title="Luruskan ke 0Ãƒâ€šÃ‚Â°"
              >
                <RotateCcw size={11} /> 0Ãƒâ€šÃ‚Â°
              </button>
            </div>

            <button
              type="button"
              onClick={handleDeleteSelectedArea}
              className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 transition-colors"
              title="Hapus Area"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}

        {/* FLOATING EDITOR SAAT KABEL (EDGE) DIKLIK */}
        {selectedEdge && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-lg">
            <div className="flex flex-col pr-2 border-r border-slate-200">
              <span className="text-xs font-semibold text-slate-800">
                Edit Warna Line
              </span>
              {(selectedEdge.sourceHandle || selectedEdge.targetHandle) && (
                <span className="text-[10px] font-mono text-slate-500">
                  {selectedEdge.sourceHandle || "auto"} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢{" "}
                  {selectedEdge.targetHandle || "auto"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {EDGE_COLORS.map((c) => {
                const active =
                  selectedEdge.color.toLowerCase() === c.value.toLowerCase();
  return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() =>
                      handleChangeEdgeColor(selectedEdge.id, c.value)
                    }
                    className={`w-5 h-5 rounded-full transition-transform ${
                      active
                        ? "ring-2 ring-offset-1 ring-slate-900 scale-110"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                );
              })}
              <label
                className="relative w-5 h-5 rounded-full border border-slate-300 overflow-hidden cursor-pointer flex items-center justify-center bg-gradient-to-tr from-rose-400 via-amber-300 to-sky-400"
                title="Warna custom"
              >
                <input
                  type="color"
                  value={selectedEdge.color}
                  onChange={(e) =>
                    handleChangeEdgeColor(selectedEdge.id, e.target.value)
                  }
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={handleDeleteSelectedEdge}
                className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 transition-colors"
                title="Hapus Line"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedEdge(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Tutup"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodesWithPortColors}
          edges={edgesWithPortLabels}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onPaneClick={() => setSelectedEdge(null)}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeDragStop={onNodeDragStop}
          onInit={onInit}
          onMoveEnd={onMoveEnd}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          nodesDraggable={isInteractive}
          nodesConnectable={isInteractive}
          elementsSelectable={isInteractive}
          connectionMode={ConnectionMode.Loose}
          // ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ PERBAIKAN: Cek apakah 'window' tersedia (berarti sedang di browser, bukan di server)
          fitView={
            typeof window !== "undefined"
              ? !localStorage.getItem("rf-viewport")
              : true
          }
        >
          <Background color="#cbd5e1" gap={16} size={1.5} />
          <Controls
            className="bg-white border-slate-200 shadow-sm rounded-md"
            onInteractiveChange={handleInteractiveChange}
          />
        </ReactFlow>
      </div>

      {/* ================= MODAL PERANGKAT (SHADCN STYLE) ================= */}
      {modalData.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                  IP Address{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (Opsional)
                  </span>
                </label>
                <input
                  type="text"
                  value={modalData.ip || ""}
                  onChange={(e) =>
                    setModalData({ ...modalData, ip: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  placeholder="192.168.1.x (kosongkan jika tanpa IP)"
                />
              </div>

              {portCategoryModal && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-900">
                      Jumlah Port ({modalData.type})
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(portCategoryModal === "switch"
                        ? [4, 8, 16, 24]
                        : [2, 4, 6, 8]
                      ).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setModalData({
                              ...modalData,
                              portCount: preset,
                              portTypes: buildDefaultPortTypes(
                                portCategoryModal,
                                preset,
                                modalData.portTypes,
                              ),
                            })
                          }
                          className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md border transition-colors ${
                            modalData.portCount === preset
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {preset}P
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={64}
                        required
                        value={modalData.portCount ?? 4}
                        onChange={(e) => {
                          const nextCount = Math.max(
                            1,
                            Math.min(64, Number(e.target.value) || 1),
                          );
                          setModalData({
                            ...modalData,
                            portCount: nextCount,
                            portTypes: buildDefaultPortTypes(
                              portCategoryModal,
                              nextCount,
                              modalData.portTypes,
                            ),
                          });
                        }}
                        className="flex h-8 w-20 rounded-md border border-slate-200 bg-transparent px-2.5 py-1 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                        placeholder="Custom"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Tipe Tiap Port
                      </label>
                      <div className="flex items-center gap-1">
                        {allowedPortTypesModal.map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() =>
                              setModalData({
                                ...modalData,
                                portTypes: Array.from(
                                  { length: modalData.portCount ?? 4 },
                                  () => pt,
                                ),
                              })
                            }
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                            title={`Set semua port menjadi ${pt}`}
                          >
                            Semua {pt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {Array.from(
                        { length: modalData.portCount ?? 4 },
                        (_, idx) => {
                          const currentType =
                            modalData.portTypes[idx] ||
                            allowedPortTypesModal[0] ||
                            "LAN";
                          const currentVlan = modalData.portVlans[idx] || "";
                          const isTrunk =
                            currentVlan.toUpperCase() === "TRUNK";
                          const supportsVlan =
                            portCategoryModal === "switch" ||
                            portCategoryModal === "gateway";

  return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50/70"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-semibold text-slate-600 w-6">
                                  P{idx + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                  {allowedPortTypesModal.map((pt) => (
                                    <button
                                      key={pt}
                                      type="button"
                                      onClick={() => {
                                        const nextTypes = buildDefaultPortTypes(
                                          portCategoryModal,
                                          modalData.portCount ?? 4,
                                          modalData.portTypes,
                                        );
                                        nextTypes[idx] = pt;
                                        setModalData({
                                          ...modalData,
                                          portTypes: nextTypes,
                                        });
                                      }}
                                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                                        currentType === pt
                                          ? "bg-slate-900 text-white"
                                          : "bg-white text-slate-500 border border-slate-200 hover:text-slate-900"
                                      }`}
                                    >
                                      {pt}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {supportsVlan && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextVlans = buildDefaultPortVlans(
                                        modalData.portCount ?? 4,
                                        modalData.portVlans,
                                      );
                                      nextVlans[idx] = isTrunk ? "" : "TRUNK";
                                      setModalData({
                                        ...modalData,
                                        portVlans: nextVlans,
                                      });
                                    }}
                                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                                      isTrunk
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
                                    }`}
                                    title="Tandai sebagai Trunk port"
                                  >
                                    TRUNK
                                  </button>
                                  <input
                                    type="text"
                                    value={isTrunk ? "" : currentVlan}
                                    onChange={(e) => {
                                      const nextVlans = buildDefaultPortVlans(
                                        modalData.portCount ?? 4,
                                        modalData.portVlans,
                                      );
                                      nextVlans[idx] = e.target.value;
                                      setModalData({
                                        ...modalData,
                                        portVlans: nextVlans,
                                      });
                                    }}
                                    placeholder="VLAN"
                                    className="w-14 h-6 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-mono text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                                    title="Masukkan VLAN ID (misal: 10 atau 20)"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              )}

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

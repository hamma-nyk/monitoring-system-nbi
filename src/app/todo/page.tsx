"use client";

import React, { useEffect, useState } from "react";
import { ListTodo, Plus, Edit2, Trash2, Calendar, Clock, RefreshCw, Filter, BarChart3, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function TodoPage() {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    kegiatan: "",
    deskripsi: "",
    progress: 0,
    startDate: "",
    endDate: "",
    priority: "medium",
    status: "open",
  });
  
  const [editingId, setEditingId] = useState<number | null>(null);

  // Filter States
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  
  // Modal Chart State
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todo");
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error("Failed fetch todos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleOpenModal = (todo: any = null) => {
    if (todo) {
      setEditingId(todo.id);
      setFormData({
        kegiatan: todo.kegiatan,
        deskripsi: todo.deskripsi,
        progress: todo.progress,
        startDate: new Date(todo.startDate).toISOString().split("T")[0],
        endDate: new Date(todo.endDate).toISOString().split("T")[0],
        priority: todo.priority,
        status: todo.status || "open",
      });
    } else {
      setEditingId(null);
      setFormData({
        kegiatan: "",
        deskripsi: "",
        progress: 0,
        startDate: "",
        endDate: "",
        priority: "medium",
        status: "open",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/todo/${editingId}` : "/api/todo";
      const method = editingId ? "PUT" : "POST";
      
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      setIsModalOpen(false);
      fetchTodos();
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this todo?")) return;
    try {
      await fetch(`/api/todo/${id}`, { method: "DELETE" });
      fetchTodos();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const getStatusColor = (status: string) => {
    return status === "close" 
      ? "bg-slate-100 text-slate-500 border-slate-200" 
      : "bg-blue-50 text-blue-700 border-blue-200";
  };

  // Filter Logic
  const filteredTodos = todos.filter(todo => {
    const d = new Date(todo.startDate);
    const matchPriority = filterPriority === "all" || todo.priority === filterPriority;
    const matchStatus = filterStatus === "all" || todo.status === filterStatus;
    const matchMonth = filterMonth === "all" || d.getMonth().toString() === filterMonth;
    const matchYear = filterYear === "all" || d.getFullYear().toString() === filterYear;
    return matchPriority && matchStatus && matchMonth && matchYear;
  });

  // Dynamic Years for filter
  const availableYears = Array.from(new Set(todos.map(t => new Date(t.startDate).getFullYear()))).sort((a, b) => b - a);

  // Sort: Open -> Close, lalu Urgent -> Medium -> Low
  const priorityWeight: Record<string, number> = { urgent: 1, medium: 2, low: 3 };
  
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "open" ? -1 : 1;
    }
    return priorityWeight[a.priority] - priorityWeight[b.priority];
  });

  // Data for Chart
  const chartData = [
    {
      name: 'Urgent',
      Open: todos.filter(t => t.priority === 'urgent' && t.status === 'open').length,
      Close: todos.filter(t => t.priority === 'urgent' && t.status === 'close').length,
    },
    {
      name: 'Medium',
      Open: todos.filter(t => t.priority === 'medium' && t.status === 'open').length,
      Close: todos.filter(t => t.priority === 'medium' && t.status === 'close').length,
    },
    {
      name: 'Low',
      Open: todos.filter(t => t.priority === 'low' && t.status === 'open').length,
      Close: todos.filter(t => t.priority === 'low' && t.status === 'close').length,
    },
  ];

  const statCards = [
    { label: "Total Todo", value: todos.length, color: "bg-slate-900" },
    { label: "Total Urgent", value: todos.filter(t => t.priority === "urgent").length, color: "bg-red-500" },
    { label: "Total Medium", value: todos.filter(t => t.priority === "medium").length, color: "bg-amber-500" },
    { label: "Total Low", value: todos.filter(t => t.priority === "low").length, color: "bg-emerald-500" },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-50 text-red-700 border-red-200";
      case "medium": return "bg-amber-50 text-amber-700 border-amber-200";
      case "low": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 font-[family-name:var(--font-quicksand)] overflow-y-auto w-full pb-24">
        {/* HEADER */}
        <div className="mb-6 bg-white p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-[family-name:var(--font-plus-jakarta-sans)] mb-2">
              <ListTodo
                className="text-slate-900"
                size={28}
                strokeWidth={2.5}
              />
              Todo List
            </h1>
            <p className="text-slate-500 text-sm max-w-xl">
              Kelola tugas, jadwal, dan progres pekerjaan Anda di sini.
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0 flex-wrap">
            <button 
              onClick={() => setIsChartModalOpen(true)} 
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm flex items-center gap-2"
            >
              <BarChart3 size={16} /> Grafik Status
            </button>
            <button 
              onClick={() => handleOpenModal()} 
              className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors shadow-sm font-medium text-sm flex items-center gap-2"
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-500 mr-2">
            <Filter size={18} />
            <span className="text-sm font-bold">Filter:</span>
          </div>
          
          <select 
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">Semua Prioritas</option>
            <option value="urgent">Urgent</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select 
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="open">Open</option>
            <option value="close">Close</option>
          </select>

          <select 
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">Semua Bulan</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i.toString()}>
                {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
              </option>
            ))}
          </select>

          <select 
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="all">Semua Tahun</option>
            {availableYears.map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>

        {loading ? (
           <div className="flex justify-center items-center h-40 text-slate-400">
             <RefreshCw className="animate-spin" size={24} />
           </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedTodos.map(todo => (
              <div key={todo.id} className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow ${todo.status === 'close' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  
                  {/* Bagian Kiri: Judul & Deskripsi */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)] line-clamp-1">{todo.kegiatan}</h3>
                      <div className="flex gap-2">
                        <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md border ${getPriorityColor(todo.priority)}`}>
                          {todo.priority}
                        </span>
                        <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md border ${getStatusColor(todo.status)}`}>
                          {todo.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm mb-4 md:mb-0 line-clamp-2 md:line-clamp-none max-w-3xl">{todo.deskripsi}</p>
                  </div>
                  
                  {/* Bagian Kanan: Tanggal & Progress */}
                  <div className="flex flex-col md:w-64 shrink-0 gap-3">
                    <div className="flex flex-col gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span>Mulai: {new Date(todo.startDate).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span>Selesai: {new Date(todo.endDate).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-xs font-semibold text-slate-700">Progress</span>
                         <span className="text-xs font-bold text-slate-900">{todo.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div 
                          className={`h-full rounded-full ${todo.progress === 100 || todo.status === 'close' ? 'bg-emerald-500' : 'bg-slate-900'}`} 
                          style={{ width: `${todo.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                </div>
                
                {/* Tombol Aksi Bawah */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                  <button onClick={() => handleOpenModal(todo)} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(todo.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            {todos.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-12 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <ListTodo size={40} className="mb-3 text-slate-300" />
                <p className="font-medium">Belum ada tugas yang ditambahkan.</p>
              </div>
            )}
          </div>
        )}

        {/* MODAL CHART (CENTERED) */}
      {isChartModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 font-[family-name:var(--font-plus-jakarta-sans)]">
                <BarChart3 size={24} className="text-slate-700" /> Statistik Todo List
              </h2>
              <button 
                onClick={() => setIsChartModalOpen(false)} 
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors border border-slate-200"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((stat, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-center shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full opacity-10 ${stat.color}`}></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{stat.label}</span>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-slate-900 leading-none">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 h-[400px] shadow-inner">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Distribusi Status per Prioritas</h3>
                    <div className="flex gap-4 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-900"></div> Open</span>
                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-300"></div> Close</span>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600, fill: '#475569' }} axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis tick={{ fontSize: 13, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} tickMargin={10} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 600, padding: '12px 16px' }} itemStyle={{ fontWeight: 600 }} />
                    <Bar dataKey="Open" stackId="a" fill="#0f172a" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Close" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-5 tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)] flex items-center gap-2">
              {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
              {editingId ? 'Edit Tugas' : 'Tambah Tugas Baru'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Kegiatan</label>
                <input required type="text" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900" placeholder="Contoh: Rapat Koordinasi IT" value={formData.kegiatan} onChange={e => setFormData({...formData, kegiatan: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi Singkat</label>
                <textarea required rows={3} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 resize-none" placeholder="Jelaskan detail kegiatan..." value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Mulai</label>
                  <input required type="date" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 text-slate-700" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Selesai</label>
                  <input required type="date" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 text-slate-700" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Skala Prioritas</label>
                  <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 text-slate-700" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option value="urgent">Urgent</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Pekerjaan</label>
                  <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 text-slate-700" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="open">Open</option>
                    <option value="close">Close</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Progress (%)</label>
                <input required type="number" min="0" max="100" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900" value={formData.progress} onChange={e => setFormData({...formData, progress: Number(e.target.value)})} />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded-md transition-colors shadow-sm">Batal</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-50 font-medium text-sm rounded-md transition-colors shadow-sm">{editingId ? 'Simpan Perubahan' : 'Simpan Tugas'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

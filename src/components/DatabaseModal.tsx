import React, { useState } from 'react';
import { X, Search, Plus, Trash2, Database, ShieldCheck, UserPlus, HardHat, Briefcase, Factory, UserX } from 'lucide-react';
import { Employee, EmployeeStatus } from '../types';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onAdd: (employee: Omit<Employee, 'id' | 'updatedAt'>) => void;
  onDelete: (id: string, name: string) => void;
  onTerminate: (id: string, name: string) => void;
  availableRoles: string[];
  availableShifts: string[];
  machines: string[];
}

const DatabaseModal: React.FC<DatabaseModalProps> = ({ 
  isOpen, 
  onClose, 
  employees, 
  onAdd, 
  onDelete,
  onTerminate,
  availableRoles,
  availableShifts,
  machines
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newEmp, setNewEmp] = useState({
    name: '',
    role: availableRoles[0] || '',
    sector: 'Extrusão',
    machine: machines[0] || 'Cast 1',
    shift: availableShifts[0] || 'Diurno 1',
    status: 'Ativo' as EmployeeStatus
  });

  const uniqueRoles = Array.from(new Set(availableRoles));
  const uniqueShifts = Array.from(new Set(availableShifts));
  const uniqueMachines = Array.from(new Set(machines));
  const [confirmModal, setConfirmModal] = useState<{ id: string, name: string, type: 'delete' | 'terminate' } | null>(null);

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.machine.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleAdd = () => {
    if (!newEmp.name.trim()) {
      alert('Por favor, informe o nome do colaborador.');
      return;
    }
    onAdd(newEmp);
    setNewEmp({
      name: '',
      role: availableRoles[0] || '',
      sector: 'Extrusão',
      machine: machines[0] || 'Cast 1',
      shift: availableShifts[0] || 'Diurno 1',
      status: 'Ativo' as EmployeeStatus
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-8 py-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase">Gerenciamento de Banco de Dados</h2>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em]">Controle Direto de Colaboradores</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar no banco..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800 border-none text-white pl-12 pr-6 py-3 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/50 w-64 transition-all"
              />
            </div>
            <button onClick={onClose} className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-3 rounded-2xl transition-all border border-slate-700">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Add Form */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-wrap items-end gap-4 overflow-x-auto no-scrollbar">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
            <input 
              type="text" 
              placeholder="Digite o nome..."
              value={newEmp.name}
              onChange={(e) => setNewEmp({...newEmp, name: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
          <div className="w-40 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cargo</label>
            <select 
              value={newEmp.role}
              onChange={(e) => setNewEmp({...newEmp, role: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
            >
              {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="w-40 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Setor</label>
            <select 
              value={newEmp.sector}
              onChange={(e) => setNewEmp({...newEmp, sector: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
            >
              {['Extrusão', 'Reciclagem', 'Fita', 'Liderança'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="w-40 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Máquina</label>
            <select 
              value={newEmp.machine}
              onChange={(e) => setNewEmp({...newEmp, machine: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
            >
              {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
              <option value="Geral">Geral</option>
            </select>
          </div>
          <div className="w-44 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Turno</label>
            <select 
              value={newEmp.shift}
              onChange={(e) => setNewEmp({...newEmp, shift: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
            >
              {uniqueShifts.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Integral">Integral</option>
            </select>
          </div>
          <div className="w-32 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
            <select 
              value={newEmp.status}
              onChange={(e) => setNewEmp({...newEmp, status: e.target.value as EmployeeStatus})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
            >
              {['Ativo', 'Férias', 'Atestado', 'Desligado', 'Em Contratação'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button 
            onClick={handleAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-[42px] px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200 active:scale-95"
          >
            <Plus size={18} />
            <span className="text-[11px] font-black uppercase">Incluir</span>
          </button>
        </div>

        {/* Database Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor / Máquina</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium">Nenhum registro encontrado no banco de dados.</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                          {emp.name.substring(0, 2)}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{emp.sector}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.machine}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600">{emp.shift}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide
                        ${emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 
                          emp.status === 'Férias' ? 'bg-orange-100 text-orange-700' :
                          emp.status === 'Em Contratação' ? 'bg-blue-100 text-blue-700' :
                          emp.status === 'Desligado' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}
                      `}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 px-1">
                        <button 
                          onClick={() => setConfirmModal({ id: emp.id, name: emp.name, type: 'terminate' })}
                          className="p-2.5 bg-orange-50 text-orange-400 hover:bg-orange-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm shadow-orange-100"
                          title="Desligar e abrir vaga"
                        >
                          <UserX size={16} />
                        </button>
                        <button 
                          onClick={() => setConfirmModal({ id: emp.id, name: emp.name, type: 'delete' })}
                          className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm shadow-red-100"
                          title="Excluir (Remover Slot)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Custom Confirmation Dialog */}
        {confirmModal && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-6">
              <div className={`w-16 h-16 ${confirmModal.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} rounded-2xl flex items-center justify-center mx-auto shadow-inner`}>
                {confirmModal.type === 'delete' ? <Trash2 size={32} /> : <UserX size={32} />}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  {confirmModal.type === 'delete' ? 'Confirmar Exclusão' : 'Confirmar Desligamento'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {confirmModal.type === 'delete' ? (
                    <>Tem certeza que deseja excluir <span className="font-bold text-red-500">{confirmModal.name}</span> permanentemente? Isso removerá o registro e o slot extra do quadro.</>
                  ) : (
                    <>Tem certeza que deseja desligar <span className="font-bold text-orange-500">{confirmModal.name}</span>? Isso manterá o registro como vaga disponível para contratação.</>
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (confirmModal.type === 'delete') {
                        onDelete(confirmModal.id, confirmModal.name);
                    } else {
                        onTerminate(confirmModal.id, confirmModal.name);
                    }
                    setConfirmModal(null);
                  }}
                  className={`flex-1 px-6 py-3 ${confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'} text-white rounded-xl text-[11px] font-black uppercase transition-all shadow-lg`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="bg-slate-50 px-8 py-4 flex items-center justify-between border-t border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Sistema de Segurança Ativo • {filteredEmployees.length} registros exibidos
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase">Acesso Administrador</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseModal;

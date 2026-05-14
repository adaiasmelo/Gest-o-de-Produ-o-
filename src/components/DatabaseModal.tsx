import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Trash2, Database, ShieldCheck, UserPlus, HardHat, Briefcase, Factory, UserX, Edit2 } from 'lucide-react';
import { Employee, EmployeeStatus, Collaborator } from '../types';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  collaborators: Collaborator[];
  onAdd: (employee: Omit<Employee, 'id' | 'updatedAt'>) => void;
  onDelete: (id: string, name: string) => void;
  onTerminate: (id: string, name: string) => void;
  onEditCollaborator: (collaborator: Collaborator) => void;
  availableRoles: string[];
  availableShifts: string[];
  machines: string[];
}

const DatabaseModal: React.FC<DatabaseModalProps> = ({ 
  isOpen, 
  onClose, 
  employees, 
  collaborators,
  onAdd, 
  onDelete,
  onTerminate,
  onEditCollaborator,
  availableRoles,
  availableShifts,
  machines
}) => {
  const [activeTab, setActiveTab] = useState<'allocations' | 'collaborators'>('allocations');
  const [searchTerm, setSearchTerm] = useState('');
  const [colSearchTerm, setColSearchTerm] = useState('');
  const [isColDropdownOpen, setIsColDropdownOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: '',
    role: availableRoles[0] || '',
    sector: 'Extrusão',
    machine: machines[0] || 'Cast 1',
    shift: availableShifts[0] || 'Diurno 1',
    status: 'Ativo' as EmployeeStatus,
    collaboratorId: ''
  });

  const filteredCollaboratorsForSelect = useMemo(() => {
    if (!colSearchTerm) return collaborators;
    return collaborators.filter(c => 
      c.name.toLowerCase().includes(colSearchTerm.toLowerCase())
    );
  }, [collaborators, colSearchTerm]);

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

  const filteredCollaboratorsList = collaborators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.role && c.role.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleAdd = () => {
    if (!newEmp.name.trim() && newEmp.status !== 'Em Contratação') {
      alert('Por favor, selecione um colaborador.');
      return;
    }
    
    const empToSave = { ...newEmp };
    if (newEmp.status === 'Em Contratação' && !newEmp.name.trim()) {
      empToSave.name = 'Em Contratação';
    }
    
    onAdd(empToSave);
    setNewEmp({
      name: '',
      role: availableRoles[0] || '',
      sector: 'Extrusão',
      machine: machines[0] || 'Cast 1',
      shift: availableShifts[0] || 'Diurno 1',
      status: 'Ativo' as EmployeeStatus,
      collaboratorId: ''
    });
    setColSearchTerm('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-8 py-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                <Database size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight uppercase">Base de Dados</h2>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em]">Gestão de Pessoal</p>
              </div>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-xl ml-8">
              <button 
                onClick={() => { setActiveTab('allocations'); setSearchTerm(''); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'allocations' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:text-white'}`}
              >
                Alocações de Pessoal
              </button>
              <button 
                onClick={() => { setActiveTab('collaborators'); setSearchTerm(''); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'collaborators' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:text-white'}`}
              >
                Base Central (Global)
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder={activeTab === 'allocations' ? "Pesquisar alocação..." : "Pesquisar colaborador..."}
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

        {activeTab === 'allocations' ? (
          <>
            {/* Quick Add Form */}
            <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-wrap items-end gap-4 overflow-x-auto no-scrollbar">
              <div className="flex-1 min-w-[240px] space-y-1.5 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecionar Colaborador</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Pesquisar na base central..."
                    value={colSearchTerm}
                    onChange={(e) => {
                      setColSearchTerm(e.target.value);
                      setIsColDropdownOpen(true);
                    }}
                    onFocus={() => setIsColDropdownOpen(true)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />

                  {isColDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsColDropdownOpen(false)}></div>
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredCollaboratorsForSelect.length > 0 ? (
                          filteredCollaboratorsForSelect.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setNewEmp({
                                  ...newEmp, 
                                  name: c.name, 
                                  collaboratorId: c.id, 
                                  registration: c.registration,
                                  role: c.role || newEmp.role
                                });
                                setColSearchTerm(c.name);
                                setIsColDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs font-black text-slate-700">{c.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">{c.role}</p>
                                </div>
                                <span className="text-[9px] font-mono font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">#{c.registration}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-[10px] font-bold text-slate-400 italic">
                            Colaborador não encontrado.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
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

            {/* Allocations Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
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
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-black text-slate-400 font-mono">#{emp.registration || '----'}</span>
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
          </>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função Principal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nascimento</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCollaboratorsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">Nenhum colaborador cadastrado na base central.</td>
                  </tr>
                ) : (
                  filteredCollaboratorsList.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-black text-blue-600 font-mono">#{col.registration || '----'}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{col.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{col.address || 'Sem endereço'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                          {col.role || 'Não Definitivo'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-bold text-slate-600">
                          {col.birthDate ? col.birthDate.split('-').reverse().join('/') : '- - / - - / - -'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {col.contact ? (
                          <a 
                            href={`https://wa.me/${col.contact.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-600 font-mono hover:underline flex items-center gap-1.5 group/wa"
                            title="Conversar no WhatsApp"
                          >
                            <svg className="w-3 h-3 fill-emerald-500 group-hover/wa:scale-110 transition-transform" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.628 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            {col.contact}
                          </a>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 italic">Sem contato</span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => onEditCollaborator(col)}
                          className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm border border-blue-100 hover:border-blue-600 flex items-center gap-2 ml-auto"
                        >
                          <Edit2 size={14} />
                          <span className="text-[10px] font-black uppercase">Editar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

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
            <ShieldCheck size={14} /> Sistema de Segurança Ativo • 
            {activeTab === 'allocations' ? ` ${filteredEmployees.length} registros exibidos` : ` ${filteredCollaboratorsList.length} colaboradores na base`}
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

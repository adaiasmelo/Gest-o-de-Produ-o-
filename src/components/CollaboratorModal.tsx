import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, Briefcase, Calendar, MapPin, Phone } from 'lucide-react';
import { Collaborator } from '../types';

interface CollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Collaborator>) => void;
  initialData?: Collaborator | null;
  availableRoles: string[];
}

const CollaboratorModal: React.FC<CollaboratorModalProps> = ({ isOpen, onClose, onSave, initialData, availableRoles }) => {
  const [formData, setFormData] = useState<Partial<Collaborator>>({
    registration: '',
    name: '',
    role: '',
    birthDate: '',
    address: '',
    contact: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          registration: initialData.registration || '',
          name: initialData.name || '',
          role: initialData.role || '',
          birthDate: initialData.birthDate || '',
          address: initialData.address || '',
          contact: initialData.contact || ''
        });
      } else {
        setFormData({
          registration: '',
          name: '',
          role: availableRoles[0] || '',
          birthDate: '',
          address: '',
          contact: ''
        });
      }
    }
  }, [isOpen, initialData, availableRoles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#1e293b] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase leading-none">
                {initialData ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h2>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">
                Cadastro Centralizado de Pessoal
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-xl transition-colors text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-2">
                  Matrícula <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={formData.registration} 
                  onChange={e => setFormData({...formData, registration: e.target.value})} 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono" 
                  placeholder="Ex: 0001" 
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-2">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                  placeholder="Ex: João da Silva" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Função Principal</label>
                <div className="relative">
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none appearance-none focus:border-blue-500 transition-all"
                  >
                    {availableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <Briefcase className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Data de Nascimento</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={formData.birthDate} 
                    onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-2">
                <MapPin size={14} className="text-blue-500" /> Endereço Residencial
              </label>
              <input 
                type="text" 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                placeholder="Rua, Número, Bairro, Cidade" 
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-2">
                <Phone size={14} className="text-emerald-500" /> Contato / Telefone
              </label>
              <input 
                type="text" 
                value={formData.contact} 
                onChange={e => setFormData({...formData, contact: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                placeholder="(00) 00000-0000" 
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-200 transition-all transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Save size={18} /> Salvar Cadastro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollaboratorModal;

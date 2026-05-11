
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit2, Package, Layers, Trash2, Clock, Wrench, CalendarX, Camera, Loader2 } from 'lucide-react';
import { ProductionEntry, Shift } from '../types';
import { extractProductionData } from '../services/aiService';

interface LaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<ProductionEntry, 'id'> & { id?: string }) => void;
  operators: string[];
  activeMachines: string[];
  availableShifts: Shift[];
  initialData?: ProductionEntry | null;
}

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE');
};

const LaunchModal: React.FC<LaunchModalProps> = ({ isOpen, onClose, onSave, operators, activeMachines, availableShifts, initialData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState({
    date: getYesterdayStr(),
    operator: '',
    machine: '',
    shift: '',
    grossWeight: 0,
    tara: 0,
    netWeight: 0,
    volumes: 0,
    tubetes: 0,
    ecoA: 0,
    ecoBP: 0,
    ecoBM: 0,
    borraTotal: 0,
    manutencaoMin: 0,
    manutencaoMotivo: '',
    processoMin: 0,
    processoMotivo: '',
    outrosMin: 0,
    outrosMotivo: '',
    isMaintenanceEntry: false,
    isNoWorkDay: false,
    noWorkReason: '',
  });

  const isErema = formData.machine.toLowerCase().includes('erema');

  useEffect(() => {
    if (isOpen) {
      setPendingEntries([]);
      setCurrentIndex(0);
      if (initialData) {
        setFormData({
          date: initialData.date,
          operator: initialData.operator,
          machine: initialData.machine,
          shift: initialData.shift,
          grossWeight: initialData.grossWeight,
          tara: initialData.tara,
          netWeight: initialData.netWeight,
          volumes: initialData.volumes,
          tubetes: initialData.tubetes,
          ecoA: initialData.ecoA,
          ecoBP: initialData.ecoBP,
          ecoBM: initialData.ecoBM,
          borraTotal: initialData.borraTotal,
          manutencaoMin: initialData.manutencaoMin,
          manutencaoMotivo: initialData.manutencaoMotivo || '',
          processoMin: initialData.processoMin,
          processoMotivo: initialData.processoMotivo || '',
          outrosMin: initialData.outrosMin,
          outrosMotivo: initialData.outrosMotivo || '',
          isMaintenanceEntry: initialData.isMaintenanceEntry || false,
          isNoWorkDay: initialData.isNoWorkDay || false,
          noWorkReason: initialData.noWorkReason || '',
        });
      } else {
        setFormData({
          date: getYesterdayStr(),
          operator: '',
          machine: activeMachines.length > 0 ? activeMachines[0] : '',
          shift: availableShifts.length > 0 ? availableShifts[0].name : '',
          grossWeight: 0,
          tara: 0,
          netWeight: 0,
          volumes: 0,
          tubetes: 0,
          ecoA: 0,
          ecoBP: 0,
          ecoBM: 0,
          borraTotal: 0,
          manutencaoMin: 0,
          manutencaoMotivo: '',
          processoMin: 0,
          processoMotivo: '',
          outrosMin: 0,
          outrosMotivo: '',
          isMaintenanceEntry: false,
          isNoWorkDay: false,
          noWorkReason: '',
        });
      }
    }
  }, [isOpen, initialData, activeMachines, availableShifts]);

  useEffect(() => {
    // Apenas recalcula automaticamente se NÃO for Erema.
    // Se for Erema, o peso líquido é inserido manualmente.
    if (!isErema) {
      setFormData(prev => ({
        ...prev,
        netWeight: (prev.isMaintenanceEntry || prev.isNoWorkDay) ? 0 : Math.max(0, prev.grossWeight - prev.tara)
      }));
    }
  }, [formData.grossWeight, formData.tara, formData.isMaintenanceEntry, formData.isNoWorkDay, isErema]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.operator && !formData.isNoWorkDay) {
      alert('Por favor, selecione um operador.');
      return;
    }
    if (!formData.machine) {
      alert('Nenhuma máquina ativa selecionada.');
      return;
    }
    if (!formData.shift) {
      alert('Por favor, selecione um turno.');
      return;
    }
    
    const isSpecialEntry = formData.isMaintenanceEntry || formData.isNoWorkDay;
    const processEntry = (data: typeof formData) => {
      return isSpecialEntry ? {
        ...data,
        grossWeight: 0,
        tara: 0,
        netWeight: 0,
        volumes: 0,
        tubetes: 0,
        ecoA: 0,
        ecoBP: 0,
        ecoBM: 0,
        borraTotal: 0,
        manutencaoMin: data.isNoWorkDay ? 0 : data.manutencaoMin,
        processoMin: data.isNoWorkDay ? 0 : data.processoMin,
        outrosMin: data.isNoWorkDay ? 0 : data.outrosMin,
      } : (isErema ? {
        ...data,
        grossWeight: 0,
        tara: 0,
        ecoA: 0,
        ecoBP: 0,
        ecoBM: 0,
        borraTotal: 0
      } : data);
    };

    if (pendingEntries.length > 0) {
      pendingEntries.forEach(entry => {
        onSave(processEntry(entry));
      });
    } else {
      onSave(initialData ? { ...processEntry(formData), id: initialData.id } : processEntry(formData));
    }
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    let val: any;
    
    if (type === 'checkbox') {
      val = (e.target as HTMLInputElement).checked;
      
      if (name === 'isNoWorkDay' && val) {
        setFormData(prev => ({ ...prev, [name]: val, isMaintenanceEntry: false }));
        return;
      }
      if (name === 'isMaintenanceEntry' && val) {
        setFormData(prev => ({ ...prev, [name]: val, isNoWorkDay: false }));
        return;
      }
    } else {
      val = type === 'number' ? parseFloat(value) || 0 : value;
    }
    
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      if (pendingEntries.length > 0) {
        const newPending = [...pendingEntries];
        newPending[currentIndex] = next;
        setPendingEntries(newPending);
      }
      return next;
    });
  };

  const handleScanAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    try {
      const newEntries: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const extracted = await extractProductionData(base64);
        
        const entryData = {
          date: extracted.date || getYesterdayStr(),
          operator: extracted.operator || '',
          machine: extracted.machine ? (activeMachines.find(m => m.toLowerCase().includes(extracted.machine!.toLowerCase())) || extracted.machine) : (activeMachines.length > 0 ? activeMachines[0] : ''),
          shift: extracted.shift || (availableShifts.length > 0 ? availableShifts[0].name : ''),
          grossWeight: extracted.grossWeight ?? 0,
          tara: extracted.tara ?? 0,
          netWeight: extracted.netWeight ?? 0,
          volumes: extracted.volumes ?? 0,
          tubetes: extracted.tubetes ?? 0,
          ecoA: extracted.ecoA ?? 0,
          ecoBP: extracted.ecoBP ?? 0,
          ecoBM: extracted.ecoBM ?? 0,
          borraTotal: extracted.borraTotal ?? 0,
          manutencaoMin: extracted.manutencaoMin ?? 0,
          manutencaoMotivo: extracted.manutencaoMotivo || '',
          processoMin: extracted.processoMin ?? 0,
          processoMotivo: extracted.processoMotivo || '',
          outrosMin: extracted.outrosMin ?? 0,
          outrosMotivo: extracted.outrosMotivo || '',
          isMaintenanceEntry: false,
          isNoWorkDay: false,
          noWorkReason: '',
        };
        newEntries.push(entryData);
      }

      if (newEntries.length > 0) {
        setPendingEntries(newEntries);
        setCurrentIndex(0);
        setFormData(newEntries[0]);
      }
    } catch (error) {
      console.error("Erro ao escanear com IA:", error);
      alert("Falha ao extrair dados da imagem. Verifique a nitidez da foto e tente novamente.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      setFormData(pendingEntries[nextIndex]);
    }
  };

  const handleNext = () => {
    if (currentIndex < pendingEntries.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setFormData(pendingEntries[nextIndex]);
    }
  };

  const handleRemoveEntry = () => {
    if (pendingEntries.length <= 1) {
      setPendingEntries([]);
      return;
    }
    const newPending = pendingEntries.filter((_, i) => i !== currentIndex);
    const nextIndex = Math.min(currentIndex, newPending.length - 1);
    setPendingEntries(newPending);
    setCurrentIndex(nextIndex);
    setFormData(newPending[nextIndex]);
  };

  const totalParadas = formData.manutencaoMin + formData.processoMin + formData.outrosMin;
  const isHiddenProduction = formData.isMaintenanceEntry || formData.isNoWorkDay;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden my-auto">
        <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {initialData ? <Edit2 size={20} /> : <Save size={20} />}
            <h2 className="text-lg font-semibold tracking-tight uppercase">{initialData ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-blue-500 rounded-lg overflow-hidden shadow-lg shadow-blue-500/20">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-1.5 hover:bg-blue-600 disabled:bg-blue-400 text-white px-2.5 py-1.5 text-[9px] font-black uppercase border-r border-blue-400 transition-all"
                title="Carregar Imagem"
              >
                {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                {isScanning ? '...' : 'Imagem'}
              </button>
              <button 
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-1.5 hover:bg-blue-600 disabled:bg-blue-400 text-white px-2.5 py-1.5 text-[9px] font-black uppercase transition-all"
                title="Usar Câmera"
              >
                {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                {isScanning ? '...' : 'Câmera'}
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleScanAI} 
              accept="image/*" 
              multiple
              className="hidden" 
            />
            <input 
              type="file" 
              ref={cameraInputRef} 
              onChange={handleScanAI} 
              accept="image/*" 
              capture="environment"
              className="hidden" 
            />
            <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar relative">
          {pendingEntries.length > 1 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button type="button" onClick={handlePrev} disabled={currentIndex === 0} className="p-1.5 bg-white rounded-lg border border-blue-200 text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition-all">
                  <Clock size={16} className="rotate-180" />
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Documento</p>
                  <p className="text-sm font-black text-blue-700">{currentIndex + 1} de {pendingEntries.length}</p>
                </div>
                <button type="button" onClick={handleNext} disabled={currentIndex === pendingEntries.length - 1} className="p-1.5 bg-white rounded-lg border border-blue-200 text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition-all">
                  <Clock size={16} />
                </button>
              </div>
              <button type="button" onClick={handleRemoveEntry} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remover este documento">
                <Trash2 size={18} />
              </button>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <Camera className="text-white" size={32} />
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Processando Documento</h3>
                <p className="text-sm font-bold text-blue-600 animate-bounce mt-1">A IA está extraindo as informações...</p>
                <div className="mt-4 flex gap-1 justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl flex items-center justify-between transition-colors border ${formData.isMaintenanceEntry ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.isMaintenanceEntry ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Wrench size={16} />
                </div>
                <div><h3 className="text-[9px] font-black text-slate-800 uppercase">Manutenção</h3></div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="isMaintenanceEntry" checked={formData.isMaintenanceEntry} onChange={handleChange} className="sr-only peer" />
                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className={`p-3 rounded-xl flex items-center justify-between transition-colors border ${formData.isNoWorkDay ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.isNoWorkDay ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                  <CalendarX size={16} />
                </div>
                <div><h3 className="text-[9px] font-black text-slate-800 uppercase">Parado</h3></div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="isNoWorkDay" checked={formData.isNoWorkDay} onChange={handleChange} className="sr-only peer" />
                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={formData.isNoWorkDay ? 'col-span-2' : ''}>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Data</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            {!formData.isNoWorkDay && (
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Operador</label>
                <input 
                  type="text" 
                  name="operator" 
                  value={formData.operator} 
                  onChange={handleChange} 
                  placeholder="Nome do operador..."
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Máquina</label>
              <input 
                type="text" 
                name="machine" 
                value={formData.machine} 
                onChange={handleChange} 
                placeholder="Ex: CAST 01..."
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Turno</label>
              <input 
                type="text" 
                name="shift" 
                value={formData.shift} 
                onChange={handleChange} 
                placeholder="Ex: Diurno, Noturno..."
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
              />
            </div>
          </div>

          {formData.isNoWorkDay && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-red-700 font-black text-[10px] uppercase tracking-widest"><CalendarX size={14} /> Motivo da Parada Total</div>
              <div>
                <label className="text-[9px] font-black text-red-500 uppercase">Descrição do Motivo</label>
                <input 
                  type="text" 
                  name="noWorkReason" 
                  value={formData.noWorkReason} 
                  onChange={handleChange} 
                  placeholder="Ex: Falta de energia, feriado, falta de pessoal..." 
                  className="w-full mt-1 bg-white border border-red-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                />
              </div>
            </div>
          )}

          {!isHiddenProduction && (
            <div className="space-y-4">
              {isErema ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest"><Package size={14} /> Produção Reciclada</div>
                  <div>
                    <label className="text-[9px] font-black text-emerald-500 uppercase">Peso Líquido Reciclado (kg)</label>
                    <input type="number" name="netWeight" value={formData.netWeight || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-blue-700 font-black text-[10px] uppercase tracking-widest"><Package size={14} /> Produção Líquida</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-blue-500 uppercase">T. Bruto (kg)</label>
                        <input type="number" name="grossWeight" value={formData.grossWeight || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-blue-500 uppercase">Tara (kg)</label>
                        <input type="number" name="tara" value={formData.tara || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold" />
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-200 flex justify-between items-center">
                      <span className="text-[10px] font-black text-blue-400 uppercase">Peso Líquido Total</span>
                      <span className="text-xl font-black text-blue-600">{formData.netWeight} KG</span>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-orange-700 font-black text-[10px] uppercase tracking-widest"><Layers size={14} /> Reciclagem (Kg)</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-orange-500 uppercase">Eco A</label>
                        <input type="number" name="ecoA" value={formData.ecoA || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-orange-500 uppercase">Eco B (P)</label>
                        <input type="number" name="ecoBP" value={formData.ecoBP || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-orange-500 uppercase">Eco B (M)</label>
                        <input type="number" name="ecoBM" value={formData.ecoBM || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm font-bold" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                    <label className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-2">🗑️ Borra Total (Kg)</label>
                    <input type="number" name="borraTotal" value={formData.borraTotal || ''} onChange={handleChange} className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm font-black text-red-600" />
                  </div>
                </>
              )}
            </div>
          )}

          {!formData.isNoWorkDay && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-slate-700 font-black text-[10px] uppercase tracking-widest"><Clock size={14} /> Tempos de Parada</div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 items-end">
                   <div>
                     <label className="text-[9px] font-black text-slate-500 uppercase">Manutenção (Min)</label>
                     <input type="number" name="manutencaoMin" value={formData.manutencaoMin || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
                   </div>
                   <input type="text" name="manutencaoMotivo" value={formData.manutencaoMotivo} onChange={handleChange} placeholder="Motivo..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs italic" />
                </div>
                {!formData.isMaintenanceEntry && (
                  <>
                    <div className="grid grid-cols-2 gap-4 items-end">
                       <div>
                         <label className="text-[9px] font-black text-slate-500 uppercase">Processo (Min)</label>
                         <input type="number" name="processoMin" value={formData.processoMin || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
                       </div>
                       <input type="text" name="processoMotivo" value={formData.processoMotivo} onChange={handleChange} placeholder="Motivo..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs italic" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                       <div>
                         <label className="text-[9px] font-black text-slate-500 uppercase">Outros (Min)</label>
                         <input type="number" name="outrosMin" value={formData.outrosMin || ''} onChange={handleChange} className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
                       </div>
                       <input type="text" name="outrosMotivo" value={formData.outrosMotivo} onChange={handleChange} placeholder="Motivo..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs italic" />
                    </div>
                  </>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Parado</span>
                  <span className="text-sm font-black text-slate-700">{totalParadas} min</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <Save size={16} /> {initialData ? 'Atualizar' : (pendingEntries.length > 1 ? `Salvar Todos (${pendingEntries.length})` : 'Salvar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LaunchModal;

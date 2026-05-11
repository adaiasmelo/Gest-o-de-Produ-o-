
export interface ProductionEntry {
  id: string;
  date: string;
  operator: string;
  machine: string;
  shift: string;
  grossWeight: number;
  tara: number;
  netWeight: number;
  volumes: number;
  tubetes: number;
  ecoA: number;
  ecoBP: number;
  ecoBM: number;
  borraTotal: number;
  manutencaoMin: number;
  manutencaoMotivo?: string;
  processoMin: number;
  processoMotivo?: string;
  outrosMin: number;
  outrosMotivo?: string;
  isMaintenanceEntry?: boolean;
  isNoWorkDay?: boolean;
  noWorkReason?: string;
  updatedAt: string;
  userId: string;
}

export interface SummaryStats {
  totalNet: number;
  ecoA: number;
  ecoBP: number;
  ecoBM: number;
  borra: number;
  paradas: number;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'Diurno' | 'Noturno';
}

export type EmployeeStatus = 'Ativo' | 'Férias' | 'Atestado' | 'Desligado' | 'Em Contratação';

export interface Employee {
  id: string;
  name: string;
  role: string; // Changed from strict union to string to allow dynamic roles
  sector: string; // Extrusão, Reciclagem, Fita
  machine: string;
  shift: string;
  status: EmployeeStatus;
  statusDetails?: string; // Motivo do atestado, observações
  returnDate?: string; // Data de retorno para Férias/Atestado
  updatedAt: string;
}

export interface PersonnelLog {
  id: string;
  date: string;
  employeeName: string;
  action: 'Contratação' | 'Alteração' | 'Férias' | 'Atestado' | 'Transferência' | 'Desligamento' | 'Retorno';
  details: string;
  user: string; // Quem fez a alteração
  userId: string;
}

// Interfaces para Estrutura Dinâmica
export interface MachineStructure {
  name: string;
  roles: string[]; // Lista de cargos (slots) dessa máquina
}

export interface ShiftStructure {
  name: string; // ou 'shift' para extrusão
  machines?: MachineStructure[]; // Para estrutura tipo Extrusão
  roles?: string[]; // Para estrutura tipo Erema/Fita onde roles estão direto no turno dentro da maquina
}

export interface SectorStructureExtrusao {
  shift: string;
  machines: MachineStructure[];
}

export interface SectorStructureStandard {
  name: string;
  shifts: { name: string; roles: string[] }[];
}

export interface SectorStructureLeadership {
  shift: string;
  roles: string[];
}

export interface PersonnelStructure {
  leadership: SectorStructureLeadership[];
  extrusao: SectorStructureExtrusao[];
  erema: SectorStructureStandard[];
  fitaAdesiva: SectorStructureStandard[];
}

export interface UserPermissions {
  canViewDashboard: boolean;
  canViewReports: boolean;
  canViewPersonnel: boolean;
  canManageSettings: boolean;
  canEditProduction: boolean;
  canManagePersonnel: boolean;
  isReadOnly: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  registration: string; // Matricula
  role: string;
  password?: string;
  isFirstAccess: boolean;
  permissions?: UserPermissions;
}

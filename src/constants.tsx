import { ProductionEntry, Employee, PersonnelLog } from './types';

export const DEFAULT_OPERATORS: string[] = [
  "Everson", "Erivan", "Carlos Philips", "Cidonei", "Deyvis", 
  "Nahim", "Edilson", "Marcelo ", "Cristian", "Fábio", "Jocelan"
];
export const INITIAL_DATA: ProductionEntry[] = [
  { "date": "2026-01-29", "operator": "Edilson", "machine": "Cast 1", "shift": "Noturno 1", "grossWeight": 12439, "tara": 0, "netWeight": 12439, "volumes": 0, "tubetes": 0, "ecoA": 0, "ecoBP": 139, "ecoBM": 0, "borraTotal": 0, "manutencaoMin": 0, "processoMin": 0, "outrosMin": 0, "id": "qlzunsyps", "updatedAt": "2026-01-29T00:00:00Z", "userId": "initial" },
  { "date": "2026-01-29", "operator": "Carlos Philips", "machine": "Cast 2", "shift": "Noturno 1", "grossWeight": 12141, "tara": 337, "netWeight": 11804, "volumes": 0, "tubetes": 0, "ecoA": 0, "ecoBP": 412, "ecoBM": 0, "borraTotal": 0, "manutencaoMin": 0, "processoMin": 0, "outrosMin": 0, "id": "d6ryythfd", "updatedAt": "2026-01-29T00:00:00Z", "userId": "initial" },
  { "date": "2026-01-29", "operator": "Nahim", "machine": "Cast 2", "shift": "Diurno 1", "grossWeight": 16576, "tara": 456, "netWeight": 16120, "volumes": 0, "tubetes": 0, "ecoA": 0, "ecoBP": 245, "ecoBM": 0, "borraTotal": 0, "manutencaoMin": 0, "processoMin": 24, "outrosMin": 0, "id": "5qsc3utu6", "updatedAt": "2026-01-29T00:00:00Z", "userId": "initial" },
  { "date": "2026-01-29", "operator": "Erivan", "machine": "Cast 1", "shift": "Diurno 1", "grossWeight": 9106, "tara": 265, "netWeight": 8841, "volumes": 0, "tubetes": 0, "ecoA": 0, "ecoBP": 670, "ecoBM": 0, "borraTotal": 0, "manutencaoMin": 0, "processoMin": 30, "outrosMin": 0, "id": "xoljlhxv5", "updatedAt": "2026-01-29T00:00:00Z", "userId": "initial" }
];

export const GOAL_VALUE = 1200000;

export const INITIAL_EMPLOYEES: Employee[] = [
  // EXTRUSÃO - DIURNO 1
  { id: "e1", name: "Marcelo", role: "Operador 1", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e2", name: "Márcio", role: "Auxiliar 1", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e3", name: "Everson", role: "Operador 2", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e4", name: "Adriano", role: "Auxiliar 1", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e5", name: "Gilsimar", role: "Auxiliar 2", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  
  // EXTRUSÃO - NOTURNO 1
  { id: "e6", name: "Cidonei", role: "Operador 1", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e7", name: "João Vitor", role: "Auxiliar 1", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e8", name: "Diones", role: "Auxiliar 2", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e9", name: "Deywis", role: "Operador 1", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e10", name: "Carlos", role: "Auxiliar 1", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e11", name: "Neto", role: "Auxiliar 2", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },

  // EXTRUSÃO - DIURNO 2
  { id: "e12", name: "Erivan", role: "Operador 2", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e13", name: "Cristian", role: "Auxiliar 1", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e14", name: "Oeuler", role: "Auxiliar 2", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e15", name: "Nahim", role: "Operador 1", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e16", name: "Leno", role: "Auxiliar 1", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },

  // EXTRUSÃO - NOTURNO 2
  { id: "e17", name: "Philip", role: "Operador 1", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e18", name: "João Augusto", role: "Auxiliar 1", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e19", name: "Vitor", role: "Auxiliar 2", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e20", name: "Edilson", role: "Operador 1", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e21", name: "Endrew", role: "Auxiliar 1", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e22", name: "Alessandro", role: "Auxiliar 2", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },

  // RECICLAGEM
  { id: "e23", name: "Jocelan", role: "Operador 1", sector: "Reciclagem", machine: "Erema 1", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e24", name: "Fabio", role: "Operador 1", sector: "Reciclagem", machine: "Erema 1", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },

  // FITA ADESIVA
  { id: "e25", name: "Jorge", role: "Operador 1", sector: "Fita", machine: "Ghezzi", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e26", name: "Maurício", role: "Auxiliar 1", sector: "Fita", machine: "Ghezzi", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e27", name: "Andre", role: "Operador 1", sector: "Fita", machine: "Ghezzi", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e28", name: "Keven", role: "Operador 1", sector: "Fita", machine: "Lintech", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e29", name: "Giovane", role: "Operador 1", sector: "Fita", machine: "Lintech", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e30", name: "Edmilson", role: "Auxiliar 1", sector: "Fita", machine: "Wutec", shift: "Comercial", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e31", name: "Mario", role: "Auxiliar 1", sector: "Fita", machine: "Wutec", shift: "Comercial", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" }
];

export const INITIAL_LOGS: PersonnelLog[] = [
  { "id": "l1", "date": new Date().toISOString(), "employeeName": "Sistema", "action": "Contratação", "details": "Importação inicial de quadro", "user": "Admin", "userId": "initial" }
];
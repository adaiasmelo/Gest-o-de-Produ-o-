import React, { useState, useMemo, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Plus, Settings, Cpu, ShieldCheck, Target, TrendingUp, Clock, FileDown, 
  Users, HardHat, Factory, Briefcase, History, RotateCcw, X, Edit2, Trash2, 
  LogOut, Search, Activity, Package, ChevronRight, TrendingDown, Upload, Info,
  UserPlus, Download, AlertCircle, FileSpreadsheet, Scale, FileText, Menu, Fingerprint, Smartphone, Bell, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import html2canvas from 'html2canvas';
import { db, auth, OperationType, handleFirestoreError, seedInitialData } from './lib/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { ProductionEntry, Shift, Employee, Collaborator, PersonnelLog, SystemUser, UserPermissions, TrainingRecord, TrainingTemplate } from './types';
import { INITIAL_DATA, GOAL_VALUE, DEFAULT_OPERATORS, INITIAL_EMPLOYEES, INITIAL_LOGS } from './constants';
import { isBiometricAvailable, registerBiometrics, authenticateBiometrics } from './services/biometricService';
import LaunchModal from './components/LaunchModal';
import EmployeeModal from './components/EmployeeModal';
import CollaboratorModal from './components/CollaboratorModal';
import HistoryModal from './components/HistoryModal';
import ShiftModal from './components/ShiftModal';
import DatabaseModal from './components/DatabaseModal';
import TrainingModal from './components/TrainingModal';
import TrainingTemplateModal from './components/TrainingTemplateModal';
import ConfirmDialog from './components/ConfirmDialog';
import { Database } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b', '#1e293b', '#64748b', '#475569', '#94a3b8'];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#1e293b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-black">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loggedUser, setLoggedUser] = useState<SystemUser | null>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse logged user from localStorage', e);
      return null;
    }
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (e) {
          console.error("Confirm action failed:", e);
        }
      },
      type
    });
  };

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [systemName, setSystemName] = useState('CONTROLE DE PRODUÇÃO');
  const [loginSystemName, setLoginSystemName] = useState('CONTROLE DE PRODUÇÃO');
  const [loginSystemSubtitle, setLoginSystemSubtitle] = useState('');
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'personnel'>('dashboard');
  const [productionData, setProductionData] = useState<ProductionEntry[]>([]);
  const [dashboardMonth, setDashboardMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [filterOperator, setFilterOperator] = useState('Todos');
  const [filterDay, setFilterDay] = useState('');

  const [goals, setGoals] = useState<Record<string, number>>({});
  const [operators, setOperators] = useState<string[]>(DEFAULT_OPERATORS);
  const [availableRoles, setAvailableRoles] = useState<string[]>(['Operador 1', 'Operador 2', 'Auxiliar 1', 'Auxiliar 2', 'Líder', 'Supervisor', 'Gerente']);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [personnelLogs, setPersonnelLogs] = useState<PersonnelLog[]>([]);
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'filters' | 'goals' | 'config' | 'system'>('filters');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [trainingTemplate, setTrainingTemplate] = useState<TrainingTemplate>({
    id: 'main',
    companyName: 'MANU',
    subCompanyName: 'PACKAGING',
    subtitle: 'FITASA & AMAZÔNIA',
    formCode: 'FMRH 010',
    baseFontSize: 11,
    titleFontSize: 14,
    footerText: 'Revisão: 004 Data emissão: 08/01/2016 Data revisão: 22/01/2024 Elaboração: Leila Silva Aprovação: Lara Andrade',
  });

  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [showEremaChart, setShowEremaChart] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loginMatricula, setLoginMatricula] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [confirmLoginPass, setConfirmLoginPass] = useState('');
  const [discoveredUser, setDiscoveredUser] = useState<SystemUser | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExtraMenuOpen, setIsExtraMenuOpen] = useState(false);
  const [employeeDetailData, setEmployeeDetailData] = useState<any>(null);
  
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricUser, setBiometricUser] = useState<SystemUser | null>(null);
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'success' | 'info', operator: string }[]>([]);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const addNotification = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev as any, { id, message, type: 'success', operator: 'Sistema' }]);
    if (notificationAudioRef.current) {
        notificationAudioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const personnelRef = useRef<HTMLDivElement>(null);

  const activeMachines = useMemo(() => ["Cast 1", "Cast 2", "Erema 1", "Ghezzi", "Lintech", "Wutec"], []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricSupported);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;

    // Update Favicon
    const favicon = document.getElementById('favicon-link') as HTMLLinkElement;
    if (favicon) {
      favicon.href = systemLogo || "https://cdn-icons-png.flaticon.com/512/2618/2618488.png";
    }

    // Update PWA Manifest dynamically
    const manifest = {
      "name": systemName || "Gestão e Controle de Produção",
      "short_name": systemName?.substring(0, 15) || "Manupackaging",
      "description": "Sistema de Gestão Industrial e Controle de Produção",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#3b82f6",
      "icons": [
        {
          "src": systemLogo || "https://cdn-icons-png.flaticon.com/512/2618/2618488.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any maskable"
        }
      ]
    };
    
    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(blob);
    const manifestLink = document.getElementById('manifest-link') as HTMLLinkElement;
    if (manifestLink) {
      manifestLink.href = manifestURL;
    }

    return () => {
      URL.revokeObjectURL(manifestURL);
    };
  }, [systemLogo, systemName, settingsLoaded]);

  useEffect(() => {
    if (!currentUser) return;

    const audioRef = { current: new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') };
    audioRef.current.volume = 0.5;

    let isInitialLoad = true;
    const unsubProduction = onSnapshot(collection(db, 'productionEntries'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionEntry));
      setProductionData(data.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));

      // Notify on new entries
      if (!isInitialLoad) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newEntry = change.doc.data() as ProductionEntry;
            const id = Math.random().toString(36).substring(7);
            
            // Play sound
            audioRef.current.play().catch(e => console.log('Autoplay blocked or audio error:', e));

            // Add notification
            setNotifications(prev => [
              { 
                id, 
                message: `Novo lançamento: ${formatWeight(newEntry.netWeight)} na máquina ${newEntry.machine}`, 
                type: 'success',
                operator: newEntry.operator
              },
              ...prev
            ]);

            // Auto remove
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== id));
            }, 5000);
          }
        });
      }
      isInitialLoad = false;
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'productionEntries'));

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'employees'));

    const unsubCollaborators = onSnapshot(collection(db, 'collaborators'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
      setCollaborators(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'collaborators'));

    const unsubTraining = onSnapshot(collection(db, 'training_records'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingRecord));
      setTrainingRecords(data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'training_records'));

    const unsubTemplate = onSnapshot(doc(db, 'settings', 'training_template'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as TrainingTemplate;
        // Forced Migration: If footer is still the old one, update it automatically
        const newFooter = 'Revisão: 004 Data emissão: 08/01/2016 Data revisão: 22/01/2024 Elaboração: Leila Silva Aprovação: Lara Andrade';
        
        if (data.footerText && (data.footerText.includes('Gestão Industrial') || data.footerText.includes('13/05/2026') || data.footerText.includes('Status: Aprovado') || data.footerText.includes('Rev.: 00'))) {
          if (data.footerText !== newFooter) {
            setDoc(doc(db, 'settings', 'training_template'), { ...data, footerText: newFooter }, { merge: true });
            setTrainingTemplate({ ...data, footerText: newFooter });
          } else {
            setTrainingTemplate(data);
          }
        } else {
          setTrainingTemplate(data);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/training_template'));

    const unsubLogs = onSnapshot(collection(db, 'personnelLogs'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonnelLog));
      setPersonnelLogs(data.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'personnelLogs'));

    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift));
      if (data.length > 0) {
        setAvailableShifts(data);
      }
    }, (err) => {
      console.error('Shifts error:', err);
    });

    const unsubUsers = onSnapshot(collection(db, 'system_users'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemUser));
      setSystemUsers(data);
      setIsInitializing(false);
    }, (err) => {
      console.error('Users error:', err);
      setIsInitializing(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.operators) setOperators(data.operators);
        if (data.availableRoles) setAvailableRoles(data.availableRoles);
        if (data.goals) setGoals(data.goals);
        if (data.systemName) setSystemName(data.systemName);
        if (data.loginSystemName) setLoginSystemName(data.loginSystemName);
        if (data.loginSystemSubtitle) setLoginSystemSubtitle(data.loginSystemSubtitle);
        if (data.systemLogo) setSystemLogo(data.systemLogo);
      }
      setSettingsLoaded(true);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/global'));

    return () => {
      unsubProduction();
      unsubEmployees();
      unsubCollaborators();
      unsubLogs();
      unsubShifts();
      unsubUsers();
      unsubSettings();
    };
  }, [currentUser]);

  // Auto-migrar funcionários existentes para colaboradores se não existirem
  const migrationRef = useRef(false);
  useEffect(() => {
    if (!settingsLoaded || employees.length === 0 || isInitializing || migrationRef.current) return;

    const migration = async () => {
      migrationRef.current = true;
      const currentCollaborators = collaborators; // snapshot of current state
      
      // Cleanup Duplicates if they already exist
      const nameGroups = new Map<string, Collaborator[]>();
      currentCollaborators.forEach(c => {
        if (!nameGroups.has(c.name)) nameGroups.set(c.name, []);
        nameGroups.get(c.name)!.push(c);
      });

      for (const [name, cols] of nameGroups.entries()) {
        if (cols.length > 1) {
          // Keep the first one, delete others
          console.log(`Cleaning up duplicates for ${name}`);
          for (let i = 1; i < cols.length; i++) {
            await deleteDoc(doc(db, 'collaborators', cols[i].id));
          }
        }
      }

      // Track names being added to avoid duplicates within the same migration loop
      const namesAdded = new Set<string>(currentCollaborators.map(c => c.name));
      let nextRegNumber = Math.max(0, ...currentCollaborators.map(c => parseInt(c.registration) || 0)) + 1;

      for (const emp of employees) {
        if (!emp.name || emp.name === 'VAGA DISPONÍVEL' || emp.name === 'Em Contratação') continue;
        
        let targetColId = emp.collaboratorId;
        let existingCol = currentCollaborators.find(c => c.id === emp.collaboratorId || c.name === emp.name);

        if (!existingCol && !namesAdded.has(emp.name)) {
          try {
            const colRef = doc(collection(db, 'collaborators'));
            const colId = colRef.id;
            const registration = emp.registration || String(nextRegNumber++).padStart(4, '0');
            
            await setDoc(colRef, {
              id: colId,
              name: emp.name,
              registration: registration,
              role: emp.role || 'Colaborador',
              updatedAt: new Date().toISOString()
            });
            namesAdded.add(emp.name);
            targetColId = colId;
            
            // Also link the employee to this new collaborator ID
            await setDoc(doc(db, 'employees', emp.id), { 
              collaboratorId: colId,
              registration: registration 
            }, { merge: true });
          } catch (err) {
            console.error('Migration error for', emp.name, err);
          }
        } else if (existingCol) {
          // Ensure sync: employee should have the same registration as collaborator
          const updates: any = {};
          if (!emp.collaboratorId) updates.collaboratorId = existingCol.id;
          if (emp.registration !== existingCol.registration && existingCol.registration) {
            updates.registration = existingCol.registration;
          }
          
          if (Object.keys(updates).length > 0) {
            await setDoc(doc(db, 'employees', emp.id), updates, { merge: true });
          }
          
          // Also check if the collaborator itself needs a registration
          if (!existingCol.registration) {
             const registration = emp.registration || String(nextRegNumber++).padStart(4, '0');
             await setDoc(doc(db, 'collaborators', existingCol.id), { registration }, { merge: true });
          }
        }
      }
    };
    
    migration().catch(console.error);
  }, [settingsLoaded, employees.length > 0, isInitializing]);

  const formatDisplayName = (fullName: string) => {
    if (!fullName || fullName === 'VAGA DISPONÍVEL') return fullName;
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return `${parts[0]} Junior`;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const handleSaveCollaborator = async (data: Partial<Collaborator>) => {
    try {
      const colRef = data.id ? doc(db, 'collaborators', data.id) : doc(collection(db, 'collaborators'));
      await setDoc(colRef, {
        id: colRef.id,
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Update names and registrations in employee slots if they were changed
      if (data.id && (data.name || data.registration)) {
        const affectedEmployees = employees.filter(e => e.collaboratorId === data.id);
        for (const emp of affectedEmployees) {
          const updates: any = {};
          if (data.name && emp.name !== data.name) updates.name = data.name;
          if (data.registration && emp.registration !== data.registration) updates.registration = data.registration;
          
          if (Object.keys(updates).length > 0) {
            await setDoc(doc(db, 'employees', emp.id), updates, { merge: true });
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'collaborators');
    }
  };

  const handleLogout = () => {
    setLoggedUser(null);
    setLoginMatricula('');
    setLoginPass('');
    setConfirmLoginPass('');
    setDiscoveredUser(null);
    localStorage.removeItem('manupackaging_user');
  };

  const lastBiometricAttemptRef = useRef<string>('');

  const handleMatriculaChange = (val: string) => {
    setLoginMatricula(val);
    
    if (val.length >= 3) {
      let user = systemUsers.find(u => u.registration === val);
      
      // Fallback for admin 1010 if not in database yet
      if (!user && val === '1010') {
        user = {
          id: 'admin_1010',
          registration: '1010',
          name: 'Administrador 1010',
          role: 'Administrador',
          isFirstAccess: false,
          password: '1010',
          permissions: {
            canManagePersonnel: true,
            canManageSettings: true,
            canViewHistory: true,
            canManageUsers: true
          }
        };
      }

      if (user) {
        setDiscoveredUser(user);
        // Direct call within the event loop to satisfy user gesture requirement
        if (user.biometricId && biometricSupported && !loggedUser && lastBiometricAttemptRef.current !== val) {
          lastBiometricAttemptRef.current = val;
          handleBiometricLogin(user);
        }
      } else {
        setDiscoveredUser(null);
        lastBiometricAttemptRef.current = '';
      }
    } else {
      setDiscoveredUser(null);
      lastBiometricAttemptRef.current = '';
    }
  };

  const handleLogin = async (matricula: string, pass: string, confirmPas?: string) => {
    // Default Admin Check
    if (matricula === '1010' && pass === '1010') {
      const defaultAdmin: SystemUser = {
        id: 'admin_1010',
        name: 'Administrador Padrão',
        registration: '1010',
        role: 'Administrador',
        password: '1010',
        isFirstAccess: false,
        permissions: {
          canViewDashboard: true,
          canViewReports: true,
          canViewPersonnel: true,
          canManageSettings: true,
          canEditProduction: true,
          canManagePersonnel: true,
          isReadOnly: false
        }
      };
      setLoggedUser(defaultAdmin);
      localStorage.setItem('manupackaging_user', JSON.stringify(defaultAdmin));
      return;
    }

    const user = discoveredUser || systemUsers.find(u => u.registration === matricula);
    if (!user) {
      alert('Matrícula não encontrada.');
      return;
    }

    if (user.isFirstAccess) {
      if (!pass || pass.length < 4) {
        alert('A senha deve ter pelo menos 4 caracteres.');
        return;
      }
      if (pass !== confirmPas) {
        alert('As senhas não coincidem.');
        return;
      }

      try {
        const updated = { ...user, password: pass, isFirstAccess: false };
        await setDoc(doc(db, 'system_users', user.id), updated);
        setLoggedUser(updated);
        localStorage.setItem('manupackaging_user', JSON.stringify(updated));

        // Prompt for biometrics immediately after first access
        if (biometricSupported) {
          setBiometricUser(updated);
          setShowBiometricPrompt(true);
        }
      } catch (err) {
        alert('Erro ao salvar senha.');
      }
      return;
    }

    if (user.password === pass) {
      setLoggedUser(user);
      localStorage.setItem('manupackaging_user', JSON.stringify(user));
      
      // Check if user should be prompted to register biometrics
      if (biometricSupported && !user.biometricId) {
        setBiometricUser(user);
        setShowBiometricPrompt(true);
      }
    } else {
      alert('Senha incorreta.');
    }
  };

  const handleBiometricLogin = async (userParam?: SystemUser) => {
    const user = userParam || systemUsers.find(u => u.registration === loginMatricula);
    if (!user || !user.biometricId) return;

    const success = await authenticateBiometrics(user.biometricId);
    if (success) {
      setLoggedUser(user);
      localStorage.setItem('manupackaging_user', JSON.stringify(user));
    }
  };

  const handleRegisterBiometrics = async () => {
    if (!biometricUser) return;
    
    const biometricId = await registerBiometrics(biometricUser);
    if (biometricId) {
      try {
        const updated = { ...biometricUser, biometricId };
        await setDoc(doc(db, 'system_users', biometricUser.id), updated);
        setLoggedUser(updated);
        localStorage.setItem('manupackaging_user', JSON.stringify(updated));
        alert('Biometria cadastrada com sucesso!');
      } catch (err) {
        console.error('Error saving biometric data:', err);
      }
    }
    setShowBiometricPrompt(false);
    setBiometricUser(null);
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        operators,
        availableRoles,
        goals,
        systemName,
        loginSystemName,
        loginSystemSubtitle,
        systemLogo,
        lastUpdated: new Date().toISOString()
      });
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    }
  };

  const formatWeight = (val: number) => (val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 }) + ' T';
  const formatMinutes = (val: number) => val >= 60 ? `${Math.floor(val / 60)}h ${val % 60}m` : `${val} min`;

  const isAdmin = loggedUser?.registration === '1010';
  const isReadOnlyAccount = !isAdmin && loggedUser?.permissions?.isReadOnly;
  const canViewDashboard = isAdmin || loggedUser?.permissions?.canViewDashboard || isReadOnlyAccount;
  const canViewReports = isAdmin || loggedUser?.permissions?.canViewReports || isReadOnlyAccount;
  const canViewPersonnel = isAdmin || loggedUser?.permissions?.canViewPersonnel || isReadOnlyAccount;
  const canManageSettings = (isAdmin || loggedUser?.permissions?.canManageSettings) && !isReadOnlyAccount;
  const canEditProduction = (isAdmin || loggedUser?.permissions?.canEditProduction) && !isReadOnlyAccount;
  const canManagePersonnel = (isAdmin || loggedUser?.permissions?.canManagePersonnel) && !isReadOnlyAccount;

  // Centraliza a filtragem de dados para respeitar os novos filtros
  const filteredDashboardData = useMemo(() => {
    if (!Array.isArray(productionData)) return [];
    return productionData.filter(e => {
      if (!e || !e.date) return false;
      const matchDay = filterDay ? e.date === filterDay : true;
      const matchMonth = !filterDay ? e.date.startsWith(dashboardMonth) : true;
      const matchOperator = filterOperator === 'Todos' ? true : e.operator === filterOperator;
      return matchDay && matchMonth && matchOperator;
    });
  }, [productionData, dashboardMonth, filterOperator, filterDay]);

  const dashboardStats = useMemo(() => {
    const currentGoal = goals[dashboardMonth] || GOAL_VALUE;
    const res = { month: 0, eremaMonth: 0, yesterday: 0, goal: currentGoal, projection: 0, avgReq: 0, prevMonthTotal: 0, prevMonthGoal: 0 };
    
    // Dados para o mês anterior (comparativo)
    const [year, month] = dashboardMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    productionData.filter(e => e.date.startsWith(prevMonthStr)).forEach(e => { 
      if (!e.machine.toLowerCase().includes('erema')) res.prevMonthTotal += (e.netWeight || 0); 
    });
    res.prevMonthGoal = goals[prevMonthStr] || GOAL_VALUE;

    // Produção "Ontem" (Dia anterior ao atual real)
    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('sv-SE');
    productionData.filter(e => e.date === yesterdayStr).forEach(e => { 
      if (!e.machine.toLowerCase().includes('erema')) res.yesterday += (e.netWeight || 0); 
    });

    // Lógica principal baseada nos dados filtrados (Dia/Operador/Mês/Ano)
    filteredDashboardData.forEach(e => { 
      if (e.machine.toLowerCase().includes('erema')) res.eremaMonth += (e.netWeight || 0); 
      else res.month += (e.netWeight || 0); 
    });

    const today = new Date();
    const currentDay = dashboardMonth === today.toISOString().slice(0, 7) ? today.getDate() : 30;
    res.projection = (res.month / Math.max(1, currentDay)) * 30;
    res.avgReq = Math.max(0, (res.goal - res.month) / Math.max(1, 30 - currentDay));
    return res;
  }, [productionData, dashboardMonth, goals, filteredDashboardData]);

  const dashboardChartsData = useMemo(() => {
    const ops: any = {};
    const machines: any = {};
    const shifts: any = {};
    
    filteredDashboardData.forEach(e => {
      if (!ops[e.operator]) ops[e.operator] = { name: e.operator, net: 0, borra: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, ecoTotal: 0, manut: 0, proc: 0, outros: 0, stops: 0 };
      if (!machines[e.machine]) machines[e.machine] = { name: e.machine, net: 0, borra: 0, stops: 0 };
      if (!shifts[e.shift]) shifts[e.shift] = { name: e.shift, net: 0 };

      if (!e.machine.toLowerCase().includes('erema')) {
        ops[e.operator].net += (e.netWeight || 0);
        machines[e.machine].net += (e.netWeight || 0);
        shifts[e.shift].net += (e.netWeight || 0);
      }
      ops[e.operator].borra += (e.borraTotal || 0);
      ops[e.operator].ecoA += (e.ecoA || 0);
      ops[e.operator].ecoBP += (e.ecoBP || 0);
      ops[e.operator].ecoBM += (e.ecoBM || 0);
      ops[e.operator].ecoTotal += (e.ecoA || 0) + (e.ecoBP || 0) + (e.ecoBM || 0);
      ops[e.operator].manut += (e.manutencaoMin || 0);
      ops[e.operator].proc += (e.processoMin || 0);
      ops[e.operator].outros += (e.outrosMin || 0);
      ops[e.operator].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);

      machines[e.machine].borra += (e.borraTotal || 0);
      machines[e.machine].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
    });

    return {
      ops: Object.values(ops).sort((a: any, b: any) => b.net - a.net),
      machines: Object.values(machines).sort((a: any, b: any) => b.net - a.net),
      shifts: Object.values(shifts).sort((a: any, b: any) => b.net - a.net)
    };
  }, [filteredDashboardData]);

  // Hook para calcular o balanço acumulado de Eco B vs Produção Erema.
  // "a sobra do eco b do mes deve acumular para o proximo mes"
  const ecoBalance = useMemo(() => {
    const monthlyData: Record<string, { ecoB: number, recycled: number }> = {};
    
    productionData.forEach(e => {
      const monthStr = e.date.substring(0, 7); // Mês YYYY-MM
      if (!monthlyData[monthStr]) monthlyData[monthStr] = { ecoB: 0, recycled: 0 };
      
      const totalEcoBMonth = (e.ecoBP || 0) + (e.ecoBM || 0);
      monthlyData[monthStr].ecoB += totalEcoBMonth;
      
      if (e.machine.toLowerCase().includes('erema')) {
        monthlyData[monthStr].recycled += (e.netWeight || 0);
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    let accumulatedSurplus = 0;
    const balances: Record<string, { monthEcoB: number, monthRecycled: number, startingSurplus: number, endingSurplus: number, totalAvailable: number }> = {};
    
    if (sortedMonths.length > 0) {
      const firstMonthStr = sortedMonths[0];
      let [currYear, currMonth] = firstMonthStr.split('-').map(Number);
      const [endYear, endMonth] = dashboardMonth.split('-').map(Number);
      
      while(currYear < endYear || (currYear === endYear && currMonth <= endMonth)) {
        const mStr = `${currYear}-${String(currMonth).padStart(2, '0')}`;
        const ecoB = monthlyData[mStr]?.ecoB || 0;
        const recycled = monthlyData[mStr]?.recycled || 0;
        
        const startingSurplus = accumulatedSurplus;
        const totalAvailable = startingSurplus + ecoB;
        const endingSurplus = Math.max(0, totalAvailable - recycled); // Limite em zero para evitar saldo negativo de estoque
        
        accumulatedSurplus = endingSurplus;
        
        balances[mStr] = {
          monthEcoB: ecoB,
          monthRecycled: recycled,
          startingSurplus,
          totalAvailable,
          endingSurplus
        };
        
        currMonth++;
        if (currMonth > 12) { currMonth = 1; currYear++; }
      }
    }

    return balances;
  }, [productionData, dashboardMonth]);

  // Nova lógica para motivos de parada detalhados
  const machineStopsDetails = useMemo(() => {
    const results: Record<string, { total: number; motifs: { type: string; min: number; reason: string; operator: string; date: string }[] }> = {};
    
    filteredDashboardData.forEach(e => {
      if (!results[e.machine]) results[e.machine] = { total: 0, motifs: [] };
      
      const entryTotal = (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
      results[e.machine].total += entryTotal;

      if (e.manutencaoMin > 0) {
        results[e.machine].motifs.push({ type: 'Manutenção', min: e.manutencaoMin, reason: e.manutencaoMotivo || 'Não informado', operator: e.operator, date: e.date });
      }
      if (e.processoMin > 0) {
        results[e.machine].motifs.push({ type: 'Processo', min: e.processoMin, reason: e.processoMotivo || 'Não informado', operator: e.operator, date: e.date });
      }
      if (e.outrosMin > 0) {
        results[e.machine].motifs.push({ type: 'Outros', min: e.outrosMin, reason: e.outrosMotivo || 'Não informado', operator: e.operator, date: e.date });
      }
    });

    return Object.entries(results)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([_, data]) => data.total > 0);
  }, [filteredDashboardData]);

  const eremaOperatorStats = useMemo(() => {
    const stats: any = {};
    filteredDashboardData
      .filter(e => e.machine.toLowerCase().includes('erema'))
      .forEach(e => {
        if (!stats[e.operator]) stats[e.operator] = 0;
        stats[e.operator] += (e.netWeight || 0);
      });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDashboardData]);

  const filteredReportData = useMemo(() => {
    return filteredDashboardData.filter(e => {
      const matchSearch = e.operator.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.machine.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [filteredDashboardData, searchTerm]);

  const reportTotals = useMemo(() => {
    return filteredReportData.reduce((acc, curr) => ({
      grossWeight: acc.grossWeight + (curr.grossWeight || 0),
      tara: acc.tara + (curr.tara || 0),
      netWeight: acc.netWeight + (curr.netWeight || 0),
      ecoA: acc.ecoA + (curr.ecoA || 0),
      ecoBP: acc.ecoBP + (curr.ecoBP || 0),
      ecoBM: acc.ecoBM + (curr.ecoBM || 0),
      borraTotal: acc.borraTotal + (curr.borraTotal || 0),
      manutencaoMin: acc.manutencaoMin + (curr.manutencaoMin || 0),
      processoMin: acc.processoMin + (curr.processoMin || 0),
      outrosMin: acc.outrosMin + (curr.outrosMin || 0),
    }), { grossWeight: 0, tara: 0, netWeight: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, borraTotal: 0, manutencaoMin: 0, processoMin: 0, outrosMin: 0 });
  }, [filteredReportData]);

  const exportToCSV = () => {
    const csvRows = [];
    const BOM = "\uFEFF";
    
    csvRows.push('RELATÓRIO DE PRODUÇÃO - ' + (filterDay || dashboardMonth));
    csvRows.push('');
    csvRows.push([
      'Data', 'Operador', 'Máquina', 'Turno', 
      'Peso Bruto (kg)', 'Tara (kg)', 'Peso Líquido (kg)', 
      'Eco A (kg)', 'Eco B(P) (kg)', 'Eco B(M) (kg)', 
      'Borra (kg)', 'Manutenção (min)', 'Processo (min)', 'Outros (min)'
    ].join(';'));

    filteredReportData.forEach(e => {
      csvRows.push([
        e.date.split('-').reverse().join('/'),
        e.operator,
        e.machine,
        e.shift,
        e.grossWeight,
        e.tara,
        e.netWeight,
        e.ecoA,
        e.ecoBP,
        e.ecoBM,
        e.borraTotal,
        e.manutencaoMin,
        e.processoMin,
        e.outrosMin
      ].join(';'));
    });

    csvRows.push([
      'SOMATÓRIA TOTAL', '', '', '',
      reportTotals.grossWeight,
      reportTotals.tara,
      reportTotals.netWeight,
      reportTotals.ecoA,
      reportTotals.ecoBP,
      reportTotals.ecoBM,
      reportTotals.borraTotal,
      reportTotals.manutencaoMin,
      reportTotals.processoMin,
      reportTotals.outrosMin
    ].join(';'));

    csvRows.push('');
    csvRows.push('');
    csvRows.push('RESUMO PARA INDICADORES (DADOS DOS GRÁFICOS)');
    csvRows.push('');
    
    csvRows.push('PRODUÇÃO POR OPERADOR');
    csvRows.push('Nome;Produção Líquida (kg);Borra Total (kg);Perda Eco Total (kg);Tempo Parado (min)');
    dashboardChartsData.ops.forEach(op => {
      csvRows.push(`${op.name};${op.net};${op.borra};${op.ecoTotal};${op.stops}`);
    });

    csvRows.push('');
    csvRows.push('PRODUÇÃO POR MÁQUINA');
    csvRows.push('Nome;Produção Líquida (kg);Borra (kg);Tempo Parado (min)');
    dashboardChartsData.machines.forEach(m => {
      csvRows.push(`${m.name};${m.net};${m.borra};${m.stops}`);
    });

    csvRows.push('');
    csvRows.push('PRODUÇÃO POR TURNO');
    csvRows.push('Turno;Produção Líquida (kg)');
    dashboardChartsData.shifts.forEach(s => {
      csvRows.push(`${s.name};${s.net}`);
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Manupackaging_Export_${filterDay || dashboardMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportStopsToCSV = () => {
    const csvRows = [];
    const BOM = "\uFEFF";
    let totalManut = 0;
    let totalProc = 0;
    let totalOutros = 0;

    csvRows.push('RELATÓRIO DETALHADO DE PARADAS - ' + (filterDay || dashboardMonth));
    csvRows.push('');
    csvRows.push(['Equipamento', 'Data', 'Operador', 'Tipo de Parada', 'Motivo', 'Duração (min)'].join(';'));

    machineStopsDetails.forEach(([machine, data]) => {
      data.motifs.forEach(m => {
        csvRows.push([
          machine,
          m.date.split('-').reverse().join('/'),
          m.operator,
          m.type,
          m.reason.replace(/;/g, ','), // Evita quebra de coluna se o usuário usou ponto e vírgula
          m.min
        ].join(';'));

        if (m.type === 'Manutenção') totalManut += m.min;
        if (m.type === 'Processo') totalProc += m.min;
        if (m.type === 'Outros') totalOutros += m.min;
      });
    });

    csvRows.push('');
    csvRows.push('RESUMO TOTAL POR MOTIVO');
    csvRows.push('Tipo;Duração Total (min);Duração Formatada');
    csvRows.push(`Manutenção;${totalManut};${formatMinutes(totalManut)}`);
    csvRows.push(`Processo;${totalProc};${formatMinutes(totalProc)}`);
    csvRows.push(`Outros;${totalOutros};${formatMinutes(totalOutros)}`);
    csvRows.push(`GERAL;${totalManut + totalProc + totalOutros};${formatMinutes(totalManut + totalProc + totalOutros)}`);

    const csvString = csvRows.join('\n');
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Paradas_${filterDay || dashboardMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBackup = () => {
    const backupData = {
      productionData,
      employees,
      operators,
      availableRoles,
      availableShifts,
      goals,
      dashboardMonth,
      personnelLogs
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `manupackaging_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadChartAsPNG = async (id: string, title: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    
    const btns = element.querySelectorAll('.chart-download-btn');
    btns.forEach((btn: any) => btn.style.display = 'none');
    
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById(id);
          if (clonedEl) {
            clonedEl.style.height = 'auto';
            clonedEl.style.minHeight = 'auto';
            clonedEl.style.maxHeight = 'none';
            clonedEl.style.overflow = 'visible';
            
            const truncates = clonedEl.querySelectorAll('.truncate');
            truncates.forEach((node: any) => {
              node.style.whiteSpace = 'normal';
              node.style.overflow = 'visible';
              node.style.textOverflow = 'clip';
              node.classList.remove('truncate');
            });
          }
        }
      });
      
      const link = document.createElement('a');
      link.download = `Indicador_${title.replace(/\s+/g, '_')}_${dashboardMonth}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Erro ao exportar gráfico:', error);
      alert('Ocorreu um erro ao gerar a imagem do gráfico.');
    } finally {
      btns.forEach((btn: any) => btn.style.display = 'flex');
    }
  };

  const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState<{ sector: string, machine: string, shift: string, role: string } | null>(null);

  const exportPersonnelToPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');
    const nowFull = new Date().toLocaleString('pt-BR');
    
    // Configurações Globais
    doc.setFont('helvetica', 'bold');
    
    // Título Principal
    doc.setFontSize(22);
    doc.text('CONTROLE DE PESSOAL — MANUPACKAGING', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Espelho de Quadro — Gerado em: ${nowFull}`, 105, 28, { align: 'center' });
    
    let yPos = 40;

    // Helper to sort by role priority (Operador > others)
    const sortByRole = (a: Employee, b: Employee) => {
        const priority = (role: string) => (role || '').toLowerCase().includes('operador') ? 0 : 1;
        return priority(a.role) - priority(b.role);
    };

    // Função auxiliar para desenhar tabelas por seção
    const addSectionTable = (title: string, sectorEmployees: Employee[]) => {
        if (sectorEmployees.length === 0) return;

        if (yPos > 240) { doc.addPage(); yPos = 20; }

        // Cabeçalho da Seção (Faixa cinza claro)
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 10, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title.toUpperCase(), 16, yPos + 7);
        yPos += 12;

        const tableData = sectorEmployees
            .map(emp => [
                emp.status === 'Em Contratação' ? 'VAGA DISPONÍVEL' : emp.name,
                emp.role,
                emp.machine,
                emp.shift,
                emp.status
            ]);

        autoTable(doc, {
            startY: yPos,
            head: [['NOME', 'FUNÇÃO', 'MÁQUINA/POSTO', 'TURNO', 'STATUS']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
                fillColor: [30, 41, 59], 
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: { 
                fontSize: 11, 
                cellPadding: 4,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 40 },
                2: { cellWidth: 35 },
                3: { cellWidth: 30 },
                4: { cellWidth: 22, halign: 'center' }
            },
            didParseCell: (data) => {
                if (data.row.cells[0].text[0] === 'VAGA DISPONÍVEL') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [220, 38, 38]; // Red-600
                }
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                yPos = data.cursor ? data.cursor.y : yPos;
            }
        });
        
        yPos += 15;
    };

    // 1. Liderança
    const liderança = employees.filter(e => normalize(e.sector) === 'lideranca').sort(sortByRole);
    if (liderança.length > 0) {
        addSectionTable('LIDERANÇA E GESTÃO', liderança.map(e => ({ ...e, shift: 'Comercial' })));
    }

    // Função para renderizar setor agrupado por turno e máquina
    const addGroupedSector = (sectorTitle: string, sectorKey: string, machines: string[], shifts: string[]) => {
        const sectorEmps = employees.filter(e => normalize(e.sector) === normalize(sectorKey));
        if (sectorEmps.length === 0) return;

        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setFillColor(30, 41, 59);
        doc.rect(14, yPos, 182, 10, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(sectorTitle.toUpperCase(), 105, yPos + 7, { align: 'center' });
        yPos += 18;

        shifts.forEach(shift => {
            const shiftEmps = sectorEmps.filter(e => normalize(e.shift) === normalize(shift));
            if (shiftEmps.length === 0) return;

            if (yPos > 250) { doc.addPage(); yPos = 20; }
            
            doc.setFillColor(241, 245, 249);
            doc.rect(14, yPos, 182, 8, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 99, 235);
            doc.text(`TURNO: ${shift.toUpperCase()}`, 105, yPos + 6, { align: 'center' });
            yPos += 12;

            machines.forEach(machine => {
                const machEmps = shiftEmps.filter(e => normalize(e.machine) === normalize(machine)).sort(sortByRole);
                if (machEmps.length === 0) return;

                if (yPos > 260) { doc.addPage(); yPos = 20; }

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text(`EQUIPAMENTO: ${machine.toUpperCase()}`, 16, yPos);
                yPos += 4;

                const tableData = machEmps.map(emp => [
                    emp.status === 'Em Contratação' ? 'VAGA DISPONÍVEL' : emp.name,
                    emp.role,
                    emp.status
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['NOME', 'FUNÇÃO', 'STATUS']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105], fontSize: 10, halign: 'center' },
                    styles: { fontSize: 11, cellPadding: 3.5 },
                    columnStyles: {
                        0: { cellWidth: 100 },
                        1: { cellWidth: 52 },
                        2: { cellWidth: 30, halign: 'center' }
                    },
                    didParseCell: (data) => {
                        if (data.row.cells[0].text[0] === 'VAGA DISPONÍVEL') {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.textColor = [220, 38, 38];
                        }
                    },
                    margin: { left: 14, right: 14 },
                    didDrawPage: (data) => { yPos = data.cursor ? data.cursor.y : yPos; }
                });
                yPos += 10;
            });
            yPos += 5;
        });
        yPos += 10;
    };

    // 2. Extrusão
    addGroupedSector('SETOR: EXTRUSÃO', 'extrusao', ['Cast 1', 'Cast 2'], ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2']);

    // 3. Reciclagem
    addGroupedSector('SETOR: RECICLAGEM', 'reciclagem', ['Erema 1'], ['Diurno 1', 'Diurno 2']);

    // 4. Fita
    addGroupedSector('SETOR: FITA ADESIVA', 'fita', ['Ghezzi', 'Lintech', 'Wutec'], ['Diurno 1', 'Diurno 2']);

    // Rodapé com número de páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Página ${i} de ${pageCount} — Manu Packaging Indústria`, 200, 285, { align: 'right' });
    }

    doc.save(`Quadro_Pessoal_Planilha_${now.replace(/\//g, '-')}.pdf`);
  };

  const handleSaveTraining = async (data: Partial<TrainingRecord>) => {
    try {
      const id = data.id || doc(collection(db, 'training_records')).id;
      const record = {
        ...data,
        id,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'training_records', id), record, { merge: true });
      exportTrainingToPDF(record as TrainingRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'training_records');
    }
  };

  const handleDeleteTraining = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'training_records', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `training_records/${id}`);
    }
  };

  const handleSaveTrainingTemplate = async (template: TrainingTemplate) => {
    try {
      await setDoc(doc(db, 'settings', 'training_template'), template);
      setIsTemplateModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/training_template');
    }
  };

  const exportTrainingToPDF = (training: TrainingRecord) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const footerH = 15;
    let y = 10;

    const drawHeader = (startY: number) => {
      doc.setLineWidth(0.4);
      doc.setDrawColor(0);
      doc.rect(10, startY, 50, 18);  // Logo Box
      doc.rect(60, startY, 100, 18); // Title Box
      doc.rect(160, startY, 40, 18); // Code Box

      if (trainingTemplate.logoBase64) {
        try {
          doc.addImage(trainingTemplate.logoBase64, 'PNG', 12, startY + 1, 46, 16);
        } catch (e) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(trainingTemplate.titleFontSize - 4);
          doc.text(trainingTemplate.companyName, 12, startY + 6);
          doc.text(trainingTemplate.subCompanyName, 12, startY + 11);
          doc.setFontSize(trainingTemplate.baseFontSize - 5);
          doc.setFont('helvetica', 'normal');
          doc.text(trainingTemplate.subtitle, 12, startY + 15);
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(trainingTemplate.titleFontSize - 4);
        doc.text(trainingTemplate.companyName, 12, startY + 6);
        doc.text(trainingTemplate.subCompanyName, 12, startY + 11);
        doc.setFontSize(trainingTemplate.baseFontSize - 5);
        doc.setFont('helvetica', 'normal');
        doc.text(trainingTemplate.subtitle, 12, startY + 15);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(trainingTemplate.titleFontSize);
      doc.text('LISTA DE PRESENÇA', 110, startY + 11, { align: 'center' }); 
      
      doc.setFontSize(trainingTemplate.baseFontSize + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(trainingTemplate.formCode, 180, startY + 11, { align: 'center' });
    };

    const drawFooter = () => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(trainingTemplate.baseFontSize - 4);
        doc.setFont('helvetica', 'normal');
        doc.text(trainingTemplate.footerText, 10, pageHeight - 8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 10, pageHeight - 8, { align: 'right' });
      }
    };

    const checkPageBreak = (neededH: number, repeatHeader: boolean = true) => {
      if (y + neededH > pageHeight - footerH) {
        doc.addPage();
        y = 10;
        if (repeatHeader) {
          drawHeader(y);
          y += 18;
        }
        // Always reset to a default state, or caller must re-set
        doc.setFont('helvetica', 'normal');
        return true;
      }
      return false;
    };

    // --- Page 1 Start ---
    drawHeader(y);
    y += 18;

    const rowH = 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(trainingTemplate.baseFontSize - 2.5);

    // Info Rows
    const infoRows = [
      { label: 'TREINAMENTO:', val: training.training, cols: [50, 140] },
      { label: 'DATA:', val: training.date.split('-').reverse().join('/'), label2: 'CARGA HORÁRIA (H):', val2: training.duration, cols: [50, 40, 60, 40] },
      { label: 'LOCAL:', val: training.location, cols: [50, 140] },
      { label: 'INSTRUTOR:', val: training.instructor, cols: [50, 140] }
    ];

    infoRows.forEach(row => {
      checkPageBreak(rowH);
      let xPos = 10;
      if (row.cols.length === 2) {
        doc.rect(xPos, y, row.cols[0], rowH);
        doc.text(row.label, xPos + 2, y + 4.5);
        doc.rect(xPos + row.cols[0], y, row.cols[1], rowH);
        doc.setFont('helvetica', 'normal');
        doc.text(row.val, xPos + row.cols[0] + 2, y + 4.5);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.rect(10, y, 50, rowH); doc.text('DATA:', 12, y + 4.5);
        doc.rect(60, y, 40, rowH); doc.setFont('helvetica', 'normal'); doc.text(row.val, 62, y + 4.5);
        doc.rect(100, y, 60, rowH); doc.setFont('helvetica', 'bold'); doc.text('CARGA HORÁRIA (H):', 102, y + 4.5);
        doc.rect(160, y, 40, rowH); doc.setFont('helvetica', 'normal'); doc.text(row.val2 || '', 162, y + 4.5);
      }
      y += rowH;
    });

    y += 2; // Spacer

    // Table Header
    const colWidths = [10, 25, 100, 55]; // Reduzi Nome completo (115 -> 100), aumentei Visto (40 -> 55)
    const colLabels = ['Nº', 'Matrícula', 'Nome completo (legível)', 'Visto'];
    checkPageBreak(rowH);
    let xHead = 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(trainingTemplate.baseFontSize - 3.5);
    colWidths.forEach((w, i) => {
      doc.rect(xHead, y, w, rowH);
      doc.text(colLabels[i], xHead + w/2, y + 4.5, { align: 'center' });
      xHead += w;
    });
    y += rowH;

    // Participants Rows
    const participantRowH = 9; // Increased height
    const totalRows = Math.max(13, training.participants.length);
    doc.setFont('helvetica', 'normal'); 
    doc.setFontSize(trainingTemplate.baseFontSize - 2);
    for (let i = 0; i < totalRows; i++) {
        if (checkPageBreak(participantRowH)) {
            // Re-apply participant font style after page break
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(trainingTemplate.baseFontSize - 2);
        }
        const participant = training.participants[i];
        let xPos = 10;
        colWidths.forEach((w, j) => {
            doc.rect(xPos, y, w, participantRowH);
            if (participant) {
                if (j === 0) doc.text((i + 1).toString().padStart(2, '0'), xPos + w/2, y + 5.5, { align: 'center' });
                if (j === 1) doc.text(participant.registration, xPos + w/2, y + 5.5, { align: 'center' });
                if (j === 2) doc.text(participant.name.toUpperCase(), xPos + 2, y + 5.5);
            } else if (j === 0) {
              doc.text((i + 1).toString().padStart(2, '0'), xPos + w/2, y + 5.5, { align: 'center' });
            }
            xPos += w;
        });
        y += participantRowH;
    }

    // Programming Content Section
    y += 4;
    checkPageBreak(8 + 8 + 60); // Repetir cabeçalho se houver quebra de página

    // Programming Content Header
    doc.rect(10, y, pageWidth - 20, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(trainingTemplate.baseFontSize - 2);
    doc.text('Conteúdo Programático', pageWidth/2, y + 5.5, { align: 'center' });
    y += 8;

    doc.rect(10, y, pageWidth - 20, 8);
    doc.setFontSize(trainingTemplate.baseFontSize - 4);
    doc.text('Obs.: Preencha o conteúdo aplicado no treinamento ou curso', 12, y + 5);
    y += 8;

    const stripHtml = (html: string) => {
      const d = new DOMParser().parseFromString(html, 'text/html');
      return d.body.textContent || "";
    };

    const rawContent = stripHtml(training.content);
    const splitContent = doc.splitTextToSize(rawContent, pageWidth - 30);
    const contentH = Math.max(60, (splitContent.length * 6) + 10); // Dynamic height but min 60
    
    checkPageBreak(contentH); // Permite repetição do cabeçalho
    doc.rect(10, y, pageWidth - 20, contentH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(trainingTemplate.baseFontSize - 1);
    doc.text(splitContent, 15, y + 10);
    y += contentH;

    // Final Footer
    drawFooter();
    doc.save(`Ficha_Treinamento_${training.date}.pdf`);
  };

  const findEmployee = (s: string, m: string, sh: string, r: string) => 
    employees.find(e => e.sector === s && e.machine === m && e.shift === sh && e.role === r && (e.status === 'Ativo' || e.status === 'Em Contratação'));

  const normalize = (s: string | undefined | null) => 
    (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

  const isEmployed = (s: string) => {
    const n = normalize(s);
    return ['ativo', 'ferias', 'atestado'].includes(n);
  };

  const isRelevantSector = (s: string) => {
    const n = normalize(s);
    return ['extrusao', 'reciclagem', 'fita', 'lideranca'].includes(n);
  };

  const totalAtivos = employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && isRelevantSector(e.sector)).length;
  const totalOperadoresAtivos = employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && e.role?.toLowerCase().includes('operador')).length;
  const totalAuxiliaresAtivos = employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && e.role?.toLowerCase().includes('auxiliar')).length;
  
  const totalVacancies = useMemo(() => {
    let count = 0;
    const isOccupying = (s: string) => {
      const n = normalize(s);
      return ['ativo', 'ferias', 'atestado'].includes(n);
    };
    
    // Extrusão: 24 slots (4 turns * 2 machines * 3 staff)
    ['Cast 1', 'Cast 2'].forEach(ma => {
      ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'].forEach(sh => {
        const occupied = employees.filter(e => normalize(e.sector) === 'extrusao' && normalize(e.machine) === normalize(ma) && normalize(e.shift) === normalize(sh) && isOccupying(e.status)).length;
        count += Math.max(0, 3 - occupied);
      });
    });
    
    // Reciclagem: 2 slots (2 turns * 1 staff)
    ['Diurno 1', 'Diurno 2'].forEach(sh => {
      const occupied = employees.filter(e => normalize(e.sector) === 'reciclagem' && normalize(e.machine) === 'erema 1' && normalize(e.shift) === normalize(sh) && isOccupying(e.status)).length;
      count += Math.max(0, 1 - occupied);
    });

    // Fita: 12 slots (3 machines * 2 turns * 2 staff)
    ['Ghezzi', 'Lintech', 'Wutec'].forEach(ma => {
        ['Diurno 1', 'Diurno 2'].forEach(sh => {
            const occupied = employees.filter(e => normalize(e.sector) === 'fita' && normalize(e.machine) === normalize(ma) && normalize(e.shift) === normalize(sh) && isOccupying(e.status)).length;
            count += Math.max(0, 2 - occupied);
        });
    });

    return count;
  }, [employees]);

  const renderSlot = (sector: string, machine: string, shift: string, role: string, label: string, employee?: Employee, keySuffix?: string) => {
    const emp = employee;
    const isHiring = emp?.status === 'Em Contratação';
    const isVacant = !emp || isHiring;
    
    return (
      <div key={emp ? emp.id : `${sector}-${machine}-${shift}-${role}${keySuffix || ''}`} onClick={() => { 
          if (emp && !isHiring) {
            setEmployeeDetailData(emp);
            setIsDetailModalOpen(true);
          } else {
            if (!canManagePersonnel) return;
            setSelectedSlot({ sector, machine, shift, role: isHiring ? emp.role : role });
            if (isHiring && emp) setSelectedEmployee(emp);
            setIsEmployeeModalOpen(true); 
          }
      }} className={`flex items-center justify-between p-2.5 rounded-xl transition-all border cursor-pointer ${isVacant ? (isHiring ? 'bg-orange-50/40 border-orange-200' : 'bg-red-50/10 border-dashed border-red-100') : 'bg-white border-slate-100 hover:border-blue-400 shadow-sm'}`}>
        <div className="flex flex-col gap-0">
          <span className={`text-[13px] font-bold truncate max-w-[150px] slot-name ${isVacant ? (isHiring ? 'text-orange-600' : 'text-slate-400 italic') : 'text-slate-800'}`}>
            {isHiring ? `Em Contratação` : !emp ? `(Vaga)` : formatDisplayName(emp.name)}
          </span>
          {isVacant && <span className="text-[9px] font-black text-slate-400/50 uppercase tracking-tighter slot-role">{label || role}</span>}
        </div>
        {!isVacant ? (
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shrink-0 slot-tag ${emp.role.toLowerCase().includes('operador') ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
            {emp.role.includes('Operador') ? 'OPE' : emp.role.includes('Auxiliar') ? 'AUX' : emp.role.substring(0,3).toUpperCase()}
          </span>
        ) : (
          isHiring ? <UserPlus size={12} className="text-orange-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        )}
      </div>
    );
  };

  const renderMachineGroup = (sector: string, machine: string, shift: string, minCapacity: number) => {
    const isVisible = (s: string) => {
      const n = normalize(s);
      return ['ativo', 'ferias', 'atestado', 'em contratacao'].includes(n);
    };
    const machineEmps = employees.filter(e => 
      normalize(e.sector) === normalize(sector) && 
      normalize(e.machine) === normalize(machine) && 
      normalize(e.shift) === normalize(shift) && 
      isVisible(e.status)
    ).sort((a, b) => {
      const getRank = (r: string) => (r || '').toLowerCase().includes('operador') ? 0 : 1;
      return getRank(a.role) - getRank(b.role);
    });
    
    const slots = [];
    
    // Render existing employees
    machineEmps.forEach(emp => {
      slots.push(renderSlot(sector, machine, shift, emp.role, '', emp));
    });
    
    // Render remaining slots as vacancies up to minCapacity
    for (let i = machineEmps.length; i < minCapacity; i++) {
        const isOpSlot = i === 0 && !machineEmps.some(e => e.role.toLowerCase().includes('operador'));
        const defaultRole = isOpSlot ? 'Operador 1' : 'Auxiliar 1';
        const label = isOpSlot ? 'OPE' : 'AUX';
        slots.push(renderSlot(sector, machine, shift, defaultRole, label, undefined, `-${i}`));
    }
    
    return <div className="space-y-3">{slots}</div>;
  };

  const renderPersonnelStat = (label: string, value: number, sub: string, icon: React.ReactNode, color: string) => (
    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-md">
      <div>
        <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 ${color}`}>{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-slate-800">{value}</p>
        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase mt-0.5 sm:mt-1">{sub}</p>
      </div>
      <div className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${color.replace('text', 'bg').replace('-400', '-50')}`}>
        {icon}
      </div>
    </div>
  );

  const renderTwoColumnLegend = (props: any, chartType?: string) => {
    const { payload } = props;
    return (
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-6 px-2">
        {payload.map((entry: any, i: number) => (
          <li key={i} className="flex items-center gap-2 text-[9px] font-black text-slate-700 uppercase">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="truncate">
              {entry.value} — {chartType === 'time' ? formatMinutes(entry.payload.value) : (entry.payload.value < 1000 ? `${entry.payload.value} kg` : formatWeight(entry.payload.value))}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const handleRestoreData = async () => {
    if (!window.confirm('Isso irá restaurar todos os dados iniciais do sistema. Continuar?')) return;
    setIsInitializing(true);
    try {
      await seedInitialData({
        productionEntries: INITIAL_DATA,
        employees: INITIAL_EMPLOYEES,
        logs: INITIAL_LOGS,
        operators: DEFAULT_OPERATORS,
        roles: availableRoles,
        goals: { [dashboardMonth]: GOAL_VALUE }
      });
      alert('Dados restaurados com sucesso!');
      window.location.reload();
    } catch (e) {
      alert('Erro ao restaurar dados.');
      console.error(e);
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing && !loggedUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6 shadow-2xl"></div>
        <h2 className="text-white font-black text-xs uppercase tracking-widest animate-pulse">Iniciando Sistema...</h2>
        <p className="text-slate-500 text-[10px] uppercase font-bold mt-4 tracking-tighter">Estamos preparando seu ambiente de trabalho</p>
      </div>
    );
  }

  if (!loggedUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"></div>
        <div className="w-full max-w-md bg-white rounded-[3rem] px-10 pt-10 pb-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-500">
           <div className="flex flex-col items-center mb-10">
              <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-400 rounded-[2.5rem] animate-pulse blur-xl opacity-30"></div>
                {systemLogo ? (
                  <img src={systemLogo} alt="Logo" className="w-full h-full object-cover relative z-10" />
                ) : (
                  <Cpu size={48} className="relative z-10" />
                )}
              </div>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter text-center leading-[0.9]">
                {loginSystemName}
              </h2>
              {loginSystemSubtitle && (
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center mt-3 max-w-[280px] leading-relaxed">
                  {loginSystemSubtitle}
                </p>
              )}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500"/> Área Restrita
              </p>
           </div>

           <div className="space-y-6">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Número de Matrícula</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={loginMatricula} 
                      onChange={e => handleMatriculaChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all pr-12"
                      placeholder="Sua matrícula"
                    />
                    {discoveredUser && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  {discoveredUser && (
                    <p className="mt-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                      <ShieldCheck size={12} /> {discoveredUser.name.split(' ')[0]} Identificado
                    </p>
                  )}
                  
                  {!discoveredUser && loginMatricula.length < 3 && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-500">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                          <Info size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Primeiro Acesso?</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight tracking-tighter">Insira sua matrícula para cadastrar sua senha de 4 dígitos.</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <Fingerprint size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Acesso Rápido</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight tracking-tighter">Após o primeiro login, você poderá usar sua digital ou rosto para entrar.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                          <Smartphone size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Segurança</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight tracking-tighter">Seus dados estão protegidos por criptografia de ponta a ponta.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!discoveredUser?.isFirstAccess ? (
                  <div className={`space-y-6 transition-all duration-500 ${discoveredUser ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Senha de Acesso</label>
                      <input 
                        type="password" 
                        value={loginPass} 
                        onChange={e => setLoginPass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <button 
                      onClick={() => handleLogin(loginMatricula, loginPass)}
                      className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                      disabled={isInitializing || !loginPass}
                    >
                      {isInitializing ? 'Carregando...' : 'Entrar no Sistema'} <ChevronRight size={18} />
                    </button>
                    {discoveredUser?.biometricId && biometricSupported && (
                      <button 
                        onClick={() => handleBiometricLogin(discoveredUser)}
                        className="w-full py-4 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Fingerprint size={16} /> Usar Biometria Agora
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-amber-50 p-5 rounded-[1.5rem] border border-amber-100 mb-2">
                      <p className="text-xs font-bold text-amber-700 text-center leading-relaxed">Olá, <span className="text-slate-900 font-black">{discoveredUser.name.split(' ')[0]}</span>!<br/>Este é o seu primeiro acesso. Por favor, crie uma senha de segurança.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nova Senha</label>
                        <input 
                          type="password" 
                          value={loginPass} 
                          onChange={e => setLoginPass(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                          placeholder="Senha"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Confirmar</label>
                        <input 
                          type="password" 
                          value={confirmLoginPass} 
                          onChange={e => setConfirmLoginPass(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                          placeholder="Confirmar"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => handleLogin(loginMatricula, loginPass, confirmLoginPass)}
                      className="w-full py-5 bg-emerald-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
                    >
                      Ativar Conta e Biometria <Target size={18} />
                    </button>
                  </div>
                )}
            </div>

            <div className={`mt-2 pt-4 border-t border-slate-100 flex flex-col gap-2 items-center ${!discoveredUser && loginMatricula.length < 3 ? 'mt-1' : ''}`}>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Criado por Adaias Melo</p>
           </div>
        </div>

        {/* Biometric Registration Prompt Modal */}
        {showBiometricPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                <Fingerprint size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ativar Biometria?</h3>
                <p className="text-xs text-slate-500 font-norma leading-relaxed">
                  Deseja cadastrar sua digital ou senha do aparelho para acessos futuros mais rápidos neste dispositivo?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRegisterBiometrics}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-200"
                >
                  Sim, Cadastrar Agora
                </button>
                <button 
                  onClick={() => {
                    setShowBiometricPrompt(false);
                    setBiometricUser(null);
                  }}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Agora Não
                </button>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Você poderá configurar isso mais tarde no perfil.</p>
            </div>
          </div>
        )}
      </div>
    );
  }


  if (isInitializing) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-white rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <header className="bg-white px-4 py-3 md:px-6 md:py-5 flex items-center justify-between sticky top-0 z-40 border-b border-slate-100 no-print">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <div className="w-9 h-9 md:w-11 md:h-11 bg-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-lg overflow-hidden border border-blue-500">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Cpu className="w-5 h-5 md:w-6 md:h-6" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-xl font-black text-slate-800 uppercase tracking-tight truncate leading-tight">{systemName}</h1>
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{loggedUser.name} — {loggedUser.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3 ml-2">
          {canEditProduction && (
            <button onClick={() => { setEditingEntry(null); setIsModalOpen(true); }} className="bg-blue-600 text-white p-2.5 md:p-3.5 rounded-xl md:rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all"><Plus size={18} className="md:w-[22px] md:h-[22px]" /></button>
          )}
          {canManageSettings && (
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2.5 md:p-3.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95"><Settings size={18} className="md:w-[22px] md:h-[22px]" /></button>
          )}
          <button onClick={handleLogout} className="p-2.5 md:p-3.5 text-red-600 bg-red-50 border border-red-100 rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95" title="Sair do Sistema"><LogOut size={18} className="md:w-[22px] md:h-[22px]" /></button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-4 md:mt-8 no-print flex flex-col md:flex-row items-center justify-center gap-4">
        <div className="flex p-1 md:p-1.5 bg-slate-200/50 rounded-2xl md:rounded-[1.8rem] w-full max-w-2xl shadow-sm mx-auto">
          {canViewDashboard && (
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 py-2.5 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[9px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}><Activity className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]"/> <span className="truncate">Indicadores</span></button>
          )}
          {canViewReports && (
            <button onClick={() => setActiveTab('reports')} className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 py-2.5 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[9px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'reports' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}><FileDown className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]"/> <span className="truncate">Relatórios</span></button>
          )}
          {canViewPersonnel && (
            <button onClick={() => setActiveTab('personnel')} className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 py-2.5 md:px-6 md:py-3.5 rounded-xl md:rounded-[1.4rem] text-[9px] md:text-[11px] font-black uppercase transition-all ${activeTab === 'personnel' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}><Users className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]"/> <span className="truncate">Pessoal</span></button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#2563eb] text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div><p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">DESEMPENHO</p><h2 className="text-2xl font-black uppercase tracking-tight">{filterDay ? `RESULTADO EM ${filterDay.split('-').reverse().join('/')}` : 'META MENSAL'}</h2></div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20"><Activity size={24} /></div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl md:text-5xl font-black">{formatWeight(dashboardStats.month)}</span>
                {!filterDay && <span className="text-lg font-bold opacity-80">/ {((dashboardStats.month/dashboardStats.goal)*100).toFixed(1)}%</span>}
              </div>
              
              <div className="mb-8"></div>

              <div className="space-y-4 mb-8">
                {/* Linha do Tempo Mês Atual */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-60">
                    <span>{filterDay ? 'Filtrado' : 'Mês Atual'} — {formatWeight(dashboardStats.month)}</span>
                    {!filterDay && <span>Meta: {formatWeight(dashboardStats.goal)}</span>}
                  </div>
                  <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${Math.min((dashboardStats.month/dashboardStats.goal)*100, 100)}%` }}></div>
                  </div>
                </div>

                {/* Linha do Tempo Mês Anterior */}
                {!filterDay && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-60">
                      <span>Resultado Mês Anterior — {formatWeight(dashboardStats.prevMonthTotal)}</span>
                      <span>{((dashboardStats.prevMonthTotal/dashboardStats.prevMonthGoal)*100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400/60 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((dashboardStats.prevMonthTotal/dashboardStats.prevMonthGoal)*100, 100)}%` }}></div>
                    </div>
                  </div>
                )}
              </div>

              {!filterDay && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black opacity-60 uppercase mb-1">OBJETIVO</p><p className="text-base font-bold">{formatWeight(dashboardStats.goal)}</p></div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black opacity-60 uppercase mb-1">FALTA</p><p className="text-base font-bold">{formatWeight(Math.max(0, dashboardStats.goal - dashboardStats.month))}</p></div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black opacity-60 uppercase mb-1">MÉDIA NEC.</p><p className="text-base font-bold">{formatWeight(dashboardStats.avgReq)}/dia</p></div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black opacity-60 uppercase mb-1">PROJEÇÃO</p><p className="text-base font-bold">{formatWeight(dashboardStats.projection)}</p></div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center group transition-all hover:shadow-md">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DIÁRIO</p>
                    <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">PRODUÇÃO ONTEM</h3>
                    <p className="text-3xl sm:text-5xl font-black text-slate-800 mt-3">{formatWeight(dashboardStats.yesterday)}</p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 text-slate-300 rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center border border-slate-100"><TrendingUp size={24} className="sm:w-8 sm:h-8"/></div>
                </div>

                <div 
                  onClick={() => setShowEremaChart(true)} 
                  className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center group transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">RECICLAGEM <Info size={10} /></p>
                    <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">PRODUÇÃO EREMA ({filterDay ? 'DIA' : 'MÊS'})</h3>
                    <p className="text-3xl sm:text-5xl font-black text-slate-800 mt-3">{formatWeight(dashboardStats.eremaMonth)}</p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-300 rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center border border-emerald-100"><RotateCcw size={24} className="sm:w-8 sm:h-8"/></div>
                </div>
            </div>

            {!filterDay && ecoBalance[dashboardMonth] && (
              <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center gap-3 sm:gap-4 text-slate-800">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 text-orange-500 rounded-xl sm:rounded-[1.2rem] flex items-center justify-center border border-orange-100"><Scale size={20} className="sm:w-6 sm:h-6" /></div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-tight">Eco B vs Reciclagem</h3>
                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-widest">MÊS DE REFERÊNCIA: {dashboardMonth}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex items-center justify-between gap-2">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Sobra Anterior</p>
                    <p className="text-lg sm:text-xl font-black text-slate-500">{formatWeight(ecoBalance[dashboardMonth].startingSurplus)}</p>
                  </div>
                  <div className="bg-orange-50/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-orange-100/50 flex items-center justify-between gap-2">
                    <p className="text-[9px] sm:text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1"><TrendingUp size={10} className="sm:w-3 sm:h-3"/> Gerado</p>
                    <p className="text-lg sm:text-xl font-black text-orange-500">+{formatWeight(ecoBalance[dashboardMonth].monthEcoB)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest text-nowrap">Total Disponível</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800">{formatWeight(ecoBalance[dashboardMonth].totalAvailable)}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-100/50 flex items-center justify-between gap-2">
                    <p className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><TrendingDown size={10} className="sm:w-3 sm:h-3"/> Reciclado</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600">-{formatWeight(ecoBalance[dashboardMonth].monthRecycled)}</p>
                  </div>
                  <div className="bg-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden flex items-center justify-between gap-2">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Sobra Seg.</p>
                    <p className="text-lg sm:text-xl font-black text-white relative z-10">{formatWeight(ecoBalance[dashboardMonth].endingSurplus)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'PRODUÇÃO LÍQUIDA (OPERADOR)', key: 'net', data: dashboardChartsData.ops, description: 'Distribuição da produção total líquida (descontando taras e perdas) por operador no período selecionado.' },
                { title: 'BORRA TOTAL (OPERADOR)', key: 'borra', data: dashboardChartsData.ops, description: 'Volume total de resíduos (borra) gerado por cada operador durante o processo produtivo.' },
                { title: 'PERDA ECO A (OPERADOR)', key: 'ecoA', data: dashboardChartsData.ops, description: 'Quantidade de material segregado como Eco A (reciclável de alta qualidade) por operador.' },
                { title: 'Eco B Produção', key: 'ecoBP', data: dashboardChartsData.ops, description: 'Material de transição or qualidade inferior gerado durante o início ou ajuste da produção.' },
                { title: 'Eco B Manutenção', key: 'ecoBM', data: dashboardChartsData.ops, description: 'Material gerado especificamente durante intervenções de manutenção nas máquinas.' },
                { title: 'PARADA MANUTENÇÃO (OPERADOR)', key: 'manut', data: dashboardChartsData.ops, type: 'time', description: 'Tempo total em que as máquinas ficaram paradas para manutenções preventivas ou corretivas.' },
                { title: 'PARADA PROCESSO (OPERADOR)', key: 'proc', data: dashboardChartsData.ops, type: 'time', description: 'Tempo de paradas causadas por ajustes técnicos, trocas de bobinas ou problemas de processo.' },
                { title: 'OUTRAS PARADAS (OPERADOR)', key: 'outros', data: dashboardChartsData.ops, type: 'time', description: 'Paradas diversas não classificadas como manutenção ou processo (ex: falta de pessoal ou energia).' },
                { title: 'PRODUÇÃO LÍQUIDA (TURNO)', key: 'net', data: dashboardChartsData.shifts, description: 'Comparativo de desempenho produtivo entre os diferentes turnos de trabalho ativos.' },
                { title: 'BORRA POR MÁQUINA', key: 'borra', data: dashboardChartsData.machines, description: 'Desempenho de cada equipamento em relação à geração de resíduos sólidos (borra).' },
                { title: 'PRODUÇÃO LÍQUIDA (MÁQUINA)', key: 'net', data: dashboardChartsData.machines, description: 'Volume total de product acabado processado por cada máquina do parque fabril.' },
                { title: 'TEMPO PARADO TOTAL (MÁQUINA)', key: 'stops', data: dashboardChartsData.machines, type: 'time', description: 'Acúmulo de todas as paradas registradas por equipamento, indicando a disponibilidade da máquina.' }
              ].map((conf: any, i) => {
                const data = conf.data.map((s: any) => ({ name: s.name, value: s[conf.key] }))
                  .filter((d: any) => d.value > 0)
                  .sort((a: any, b: any) => b.value - a.value);
                
                if (data.length === 0) return null;
                
                return (
                  <div key={i} id={`chart-card-${i}`} className="bg-white p-5 sm:p-7 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[500px] sm:min-h-[550px] flex flex-col relative group">
                    <div className="flex items-center justify-between mb-8">
                      <div className="w-8"></div>
                      <h3 className="text-[10px] font-black text-center uppercase text-slate-800 tracking-widest flex-1">{conf.title}</h3>
                      <button 
                        onClick={() => downloadChartAsPNG(`chart-card-${i}`, conf.title)} 
                        className="chart-download-btn p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 no-print"
                        title="Baixar PNG"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        {conf.bar ? (
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                            <RechartsTooltip formatter={(v: any) => conf.type === 'time' ? formatMinutes(v) : v.toLocaleString('pt-BR') + ' kg'} />
                            <Bar dataKey="value" fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} barSize={35} />
                          </BarChart>
                        ) : (
                          <PieChart>
                            <Pie data={data} cx="50%" cy="32%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" label={renderCustomizedLabel}>
                              {data.map((_, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip formatter={(v: any) => conf.type === 'time' ? formatMinutes(v) : v.toLocaleString('pt-BR') + ' kg'} />
                            <Legend content={(props) => renderTwoColumnLegend(props, conf.type)} />
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50">
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                        {conf.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Card: Relação de Paradas e Motivos */}
            <div id="stops-motifs-card" className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm relative group animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-100">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Relação de Paradas e Motivos</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhamento por Equipamento</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 no-print">
                        <button 
                            onClick={exportStopsToCSV} 
                            className="chart-download-btn p-3 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                            title="Exportar CSV (Excel)"
                        >
                            <FileSpreadsheet size={20} />
                        </button>
                        <button 
                            onClick={() => downloadChartAsPNG('stops-motifs-card', 'Relação de Paradas e Motivos')} 
                            className="chart-download-btn p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                            title="Baixar PNG"
                        >
                            <Download size={20} />
                        </button>
                    </div>
                </div>

                {machineStopsDetails.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {machineStopsDetails.map(([machine, data]) => (
                      <div key={machine} className="bg-slate-50 rounded-[1.8rem] p-5 border border-slate-100 hover:border-blue-200 transition-all">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                          <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{machine}</span>
                          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                            <Clock size={12} className="text-blue-500"/>
                            <span className="text-[11px] font-black text-blue-600">{formatMinutes(data.total)}</span>
                          </div>
                        </div>
                        <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                          {data.motifs.map((m, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                        m.type === 'Manutenção' ? 'bg-orange-100 text-orange-600' :
                                        m.type === 'Processo' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {m.type}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-700">{m.min} min</span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-600 leading-tight">"{m.reason}"</p>
                                <div className="flex justify-between items-center pt-1 mt-1 border-t border-slate-50">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">{m.operator}</span>
                                    <span className="text-[8px] font-bold text-slate-300">{m.date.split('-').reverse().join('/')}</span>
                                </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                      <Activity size={64} className="opacity-10" />
                      <p className="font-black uppercase text-xs tracking-[0.2em]">Sem registros de parada no período</p>
                  </div>
                )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none" />
              </div>
              <button onClick={exportToCSV} className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95">
                <FileDown size={18}/> Exportar Excel
              </button>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100 whitespace-nowrap">
                            <tr>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operador</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Máquina</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Turno</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Peso Bruto</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tara</th>
                              <th className="px-4 py-5 text-[9px] font-black text-blue-500 uppercase tracking-widest text-right">P. Líquido</th>
                              <th className="px-4 py-5 text-[9px] font-black text-orange-400 uppercase tracking-widest text-right">Eco A</th>
                              <th className="px-4 py-5 text-[9px] font-black text-orange-400 uppercase tracking-widest text-right">Eco B(P)</th>
                              <th className="px-4 py-5 text-[9px] font-black text-orange-400 uppercase tracking-widest text-right">Eco B(M)</th>
                              <th className="px-4 py-5 text-[9px] font-black text-red-500 uppercase tracking-widest text-right">Borra</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Manut(m)</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Proc(m)</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Outros(m)</th>
                              <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-[10px] whitespace-nowrap">
                            {filteredReportData.map(entry => (
                                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3 font-bold text-slate-700">{entry.date.split('-').reverse().join('/')}</td>
                                    <td className="px-4 py-3 font-medium text-slate-600 uppercase">{entry.operator}</td>
                                    <td className="px-4 py-3 font-bold text-slate-400">{entry.machine}</td>
                                    <td className="px-4 py-3 text-slate-500 uppercase">{entry.shift}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-500">{entry.grossWeight.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-500">{entry.tara.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-right font-black text-blue-600 bg-blue-50/20">{entry.netWeight.toLocaleString('pt-BR')} kg</td>
                                    <td className="px-4 py-3 text-right font-bold text-orange-600">{entry.ecoA.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-right font-bold text-orange-600">{entry.ecoBP.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-right font-bold text-orange-600">{entry.ecoBM.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-right font-black text-red-600 bg-red-50/20">{entry.borraTotal.toLocaleString('pt-BR')} kg</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{entry.manutencaoMin}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{entry.processoMin}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{entry.outrosMin}</td>
                                    <td className="px-4 py-3 text-center">
                                          {canEditProduction && (
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => { setEditingEntry(entry); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={13}/></button>
                                              <button onClick={() => { 
                                                openConfirm(
                                                  'Confirmar Exclusão',
                                                  `Deseja realmente excluir este lançamento de ${entry.operator}?`,
                                                  async () => {
                                                    try {
                                                      await deleteDoc(doc(db, 'productionEntries', entry.id));
                                                    } catch(e) { console.error(e); }
                                                  }
                                                );
                                              }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13}/></button>
                                            </div>
                                          )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-800 text-white font-black text-[10px] whitespace-nowrap sticky bottom-0 border-t border-slate-700">
                            <tr>
                              <td colSpan={4} className="px-4 py-4 text-center uppercase tracking-widest bg-slate-900 border-r border-slate-700">Somatória Total</td>
                              <td className="px-4 py-4 text-right">{reportTotals.grossWeight.toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-4 text-right">{reportTotals.tara.toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-4 text-right text-blue-400 bg-slate-900/50">{reportTotals.netWeight.toLocaleString('pt-BR')} kg</td>
                              <td className="px-4 py-4 text-right">{reportTotals.ecoA.toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-4 text-right">{reportTotals.ecoBP.toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-4 text-right">{reportTotals.ecoBM.toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-4 text-right text-red-400 bg-slate-900/50">{reportTotals.borraTotal.toLocaleString('pt-BR')} kg</td>
                              <td className="px-4 py-4 text-right">{reportTotals.manutencaoMin}</td>
                              <td className="px-4 py-4 text-right">{reportTotals.processoMin}</td>
                              <td className="px-4 py-4 text-right">{reportTotals.outrosMin}</td>
                              <td className="px-4 py-4 bg-slate-900"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'personnel' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-center no-print">
              <div className="relative">
                <button 
                  onClick={() => setIsExtraMenuOpen(!isExtraMenuOpen)}
                  className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-slate-600 flex items-center gap-2"
                >
                  <Menu size={22} />
                  <span className="text-[10px] font-black uppercase tracking-widest px-1">Menu Extra</span>
                </button>
                
                {isExtraMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExtraMenuOpen(false)}></div>
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
                      <button 
                        onClick={() => { setIsExtraMenuOpen(false); setIsCollaboratorModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 text-[11px] font-black uppercase transition-colors border-b border-slate-50"
                      >
                        <UserPlus size={18} className="text-blue-600" />
                        Cadastrar Colaborador
                      </button>
                      <button 
                        onClick={() => { setIsExtraMenuOpen(false); exportPersonnelToPDF(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 text-[11px] font-black uppercase transition-colors"
                      >
                        <FileText size={18} className="text-emerald-500" />
                        Baixar PDF Pessoal
                      </button>
                      <button 
                        onClick={() => { setIsExtraMenuOpen(false); setIsHistoryModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 text-[11px] font-black uppercase transition-colors"
                      >
                        <History size={18} className="text-blue-500" />
                        Histórico de Pessoal
                      </button>
                      <button 
                        onClick={() => { setIsExtraMenuOpen(false); setIsDatabaseModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 text-[11px] font-black uppercase transition-colors"
                      >
                        <Database size={18} className="text-emerald-500" />
                        Banco de Dados
                      </button>
                      <button 
                        onClick={() => { setIsExtraMenuOpen(false); setIsTrainingModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 text-[11px] font-black uppercase transition-colors border-t border-slate-50"
                      >
                        <FileText size={18} className="text-blue-600" />
                        Treinamento / DDP
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div ref={personnelRef} data-ref-personnel-root className="space-y-8 p-1">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {renderPersonnelStat('Colaboradores', totalAtivos, 'Ativos', <Users size={20} className="sm:w-6 sm:h-6"/>, 'text-blue-400')}
                {renderPersonnelStat('Operadores', totalOperadoresAtivos, 'Ativos', <HardHat size={20} className="sm:w-6 sm:h-6"/>, 'text-emerald-400')}
                {renderPersonnelStat('Auxiliares', totalAuxiliaresAtivos, 'Ativos', <Briefcase size={20} className="sm:w-6 sm:h-6"/>, 'text-orange-400')}
                {renderPersonnelStat('Vagas', totalVacancies, 'Aberto', <UserPlus size={20} className="sm:w-6 sm:h-6"/>, 'text-red-400')}
              </div>

            <div className="bg-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-700">
                <div className="px-8 py-6 flex items-center justify-between bg-slate-900/80">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30"><ShieldCheck size={24}/></div>
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Liderança</h2>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">Gerência / Supervisão / Líder</p>
                      </div>
                    </div>
                    {canManagePersonnel && (
                      <button onClick={() => { setSelectedSlot({ sector: 'Liderança', machine: 'Geral', shift: 'Integral', role: 'Gerente' }); setIsEmployeeModalOpen(true); }} className="bg-blue-500 text-white p-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/20">
                        <Plus size={20} />
                      </button>
                    )}
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 bg-slate-800/50">
                    {employees.filter(e => normalize(e.sector) === 'lideranca' && isEmployed(e.status)).sort((a, b) => {
                        const roles = ['Gerente', 'Supervisor', 'Líder'];
                        return roles.indexOf(a.role) - roles.indexOf(b.role);
                    }).map(emp => (
                        <div key={emp.id} className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-700/50 shadow-sm animate-in zoom-in-95 duration-200">
                             <div className="flex justify-between items-center mb-4 px-1">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{emp.role}</h3>
                                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{emp.shift}</p>
                             </div>
                             {renderSlot('Liderança', 'Geral', emp.shift, emp.role, emp.role.substring(0,3).toUpperCase(), emp)}
                        </div>
                    ))}
                    {employees.filter(e => normalize(e.sector) === 'lideranca' && isEmployed(e.status)).length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500/50 border-2 border-dashed border-slate-700/50 rounded-[2.5rem]">
                            <Users size={32} className="mb-2 opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma liderança cadastrada</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-[#242d3c] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-700">
                <div className="px-8 py-6 flex items-center gap-5 bg-[#1e293b]">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30"><Factory size={24}/></div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Setor: Extrusão</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Escala de Turnos</p>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-100/10">
                    {['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'].map(sh => (
                        <div key={sh} className={`p-6 rounded-[2rem] border shadow-sm ${sh.includes('Noturno') ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-6">
                              <Clock size={16} className={sh.includes('Noturno') ? 'text-indigo-400' : 'text-blue-400'}/>
                              <h3 className={`text-[12px] font-black uppercase tracking-widest ${sh.includes('Noturno') ? 'text-slate-300' : 'text-slate-500'}`}>{sh}</h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {['Cast 1', 'Cast 2'].map(ma => (
                                    <div key={ma} className="space-y-3">
                                        <div className="flex justify-between items-center px-1 mb-2">
                                          <p className={`text-[10px] font-black uppercase tracking-widest ${sh.includes('Noturno') ? 'text-slate-400' : 'text-slate-300'}`}>{ma}</p>
                                          {canManagePersonnel && (
                                            <button className="text-blue-400 hover:bg-blue-500/10 p-1 rounded-md transition-colors" onClick={() => { setSelectedSlot({ sector: 'Extrusão', machine: ma, shift: sh, role: 'Novo Slot' }); setIsEmployeeModalOpen(true); }}><Plus size={14}/></button>
                                          )}
                                        </div>
                                        {renderMachineGroup('Extrusão', ma, sh, 3)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[#064e3b] rounded-[2.5rem] overflow-hidden shadow-2xl border border-emerald-900">
                <div className="px-8 py-6 flex items-center gap-5 bg-emerald-900/80">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30"><RotateCcw size={24}/></div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Setor: Reciclagem</h2>
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em]">Erema</p>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/30">
                    {['Diurno 1', 'Diurno 2'].map(sh => (
                        <div key={sh} className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
                            <p className="text-[11px] font-black text-emerald-800 uppercase text-center mb-4 tracking-widest">{sh}</p>
                            {renderMachineGroup('Reciclagem', 'Erema 1', sh, 1)}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[#78350f] rounded-[2.5rem] overflow-hidden shadow-2xl border border-orange-900">
                <div className="px-8 py-6 flex items-center justify-between bg-orange-950/80">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400 border border-orange-500/30"><Briefcase size={24}/></div>
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Setor: Fita Adesiva</h2>
                        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.2em]">Ghezzi / Lintech / Wutec</p>
                      </div>
                    </div>
                    {canManagePersonnel && (
                      <button onClick={() => { setSelectedSlot({ sector: 'Fita', machine: 'Ghezzi', shift: 'Diurno 1', role: 'Novo Slot' }); setIsEmployeeModalOpen(true); }} className="bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-900/20">
                        <Plus size={20} />
                      </button>
                    )}
                </div>
                <div className="p-6 space-y-6 bg-orange-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500"/>
                                <h3 className="text-[12px] font-black uppercase text-orange-900 tracking-widest">Ghezzi</h3>
                              </div>
                              {canManagePersonnel && (
                                <button className="text-blue-400 hover:bg-blue-500/10 p-1 rounded-md transition-colors" onClick={() => { setSelectedSlot({ sector: 'Fita', machine: 'Ghezzi', shift: 'Diurno 1', role: 'Novo Slot' }); setIsEmployeeModalOpen(true); }}><Plus size={14}/></button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {['Diurno 1', 'Diurno 2'].map(sh => (
                                    <div key={sh} className="space-y-3">
                                        <div className="flex justify-between items-center mb-1">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase">{sh}</p>
                                          {canManagePersonnel && (
                                            <button className="text-blue-400 hover:bg-blue-500/10 p-1 rounded-md transition-colors" onClick={() => { setSelectedSlot({ sector: 'Fita', machine: 'Ghezzi', shift: sh, role: 'Novo Slot' }); setIsEmployeeModalOpen(true); }}><Plus size={12}/></button>
                                          )}
                                        </div>
                                        {renderMachineGroup('Fita', 'Ghezzi', sh, 2)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500"/>
                                <h3 className="text-[12px] font-black uppercase text-orange-900 tracking-widest">Lintech</h3>
                              </div>
                              {canManagePersonnel && (
                                <button className="text-blue-400 hover:bg-blue-500/10 p-1 rounded-md transition-colors" onClick={() => { setSelectedSlot({ sector: 'Fita', machine: 'Lintech', shift: 'Diurno 1', role: 'Novo Slot' }); setIsEmployeeModalOpen(true); }}><Plus size={14}/></button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {['Diurno 1', 'Diurno 2'].map(sh => (
                                    <div key={sh} className="space-y-3">
                                        <div className="flex justify-between items-center mb-1">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase">{sh}</p>
                                          {canManagePersonnel && (
                                            <button className="text-blue-400 hover:bg-blue-500/10 p-1 rounded-md transition-colors" onClick={() => { setSelectedSlot({ sector: 'Fita', machine: 'Lintech', shift: sh, role: 'Novo Slot' }); setIsEmployeeModalOpen(true); }}><Plus size={12}/></button>
                                          )}
                                        </div>
                                        {renderMachineGroup('Fita', 'Lintech', sh, 2)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"/>
                            <h3 className="text-[12px] font-black uppercase text-orange-900 tracking-widest">Wutec</h3>
                          </div>
                          {canManagePersonnel && (
                            <button className="text-blue-400 hover:bg-blue-500/10 p-1 rounded-md transition-colors" onClick={() => { setSelectedSlot({ sector: 'Fita', machine: 'Wutec', shift: 'Diurno 1', role: 'Novo Slot' }); setIsEmployeeModalOpen(true); }}><Plus size={14}/></button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {['Diurno 1', 'Diurno 2'].map(sh => (
                                <div key={sh} className="space-y-3">
                                    <div className="flex justify-between items-center mb-1">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">{sh}</p>
                                      {canManagePersonnel && (
                                        <button className="text-blue-400 hover:bg-blue-500/10 p-1 rounded-md transition-colors" onClick={() => { setSelectedSlot({ sector: 'Fita', machine: 'Wutec', shift: sh, role: 'Novo Slot' }); setIsEmployeeModalOpen(true); }}><Plus size={12}/></button>
                                      )}
                                    </div>
                                    {renderMachineGroup('Fita', 'Wutec', sh, 2)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Detalhes do Colaborador (Popup Informativo) */}
      {isDetailModalOpen && employeeDetailData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsDetailModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-600 p-8 text-white">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Users size={32} />
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">{employeeDetailData.name}</h3>
              <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">{employeeDetailData.role} • {employeeDetailData.sector}</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Turno</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">{employeeDetailData.shift}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Máquina</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">{employeeDetailData.machine}</p>
                </div>
              </div>

              {canManagePersonnel && (
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedEmployee(employeeDetailData);
                    setIsEmployeeModalOpen(true);
                  }}
                  className="w-full py-4 bg-slate-100 text-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  Editar Colaborador
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showEremaChart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowEremaChart(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowEremaChart(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors"><X size={28} /></button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100"><RotateCcw size={24}/></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Produção Erema por Operador</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referência: {filterDay || dashboardMonth}</p>
              </div>
            </div>
            <div className="h-[400px]">
              {eremaOperatorStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={eremaOperatorStats} cx="50%" cy="32%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" label={renderCustomizedLabel}>
                      {eremaOperatorStats.map((_, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: any) => v.toLocaleString('pt-BR') + ' kg'} />
                    <Legend verticalAlign="bottom" content={(props) => renderTwoColumnLegend(props)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                  <Activity size={48} className="opacity-20" />
                  <p className="font-bold uppercase text-[11px] tracking-widest">Nenhum dado para este filtro</p>
                </div>
              )}
            </div>
            <button onClick={() => setShowEremaChart(false)} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all">Fechar Análise</button>
          </div>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        activeTab={activeSettingsTab}
        setActiveTab={setActiveSettingsTab}
        filterOperator={filterOperator}
        setFilterOperator={setFilterOperator}
        filterDay={filterDay}
        setFilterDay={setFilterDay}
        dashboardMonth={dashboardMonth}
        setDashboardMonth={setDashboardMonth}
        operators={operators}
        goals={goals}
        setGoals={setGoals}
        setIsUserManagementOpen={setIsUserManagementOpen}
        setIsOperatorModalOpen={setIsOperatorModalOpen}
        setIsRoleModalOpen={setIsRoleModalOpen}
        setIsShiftModalOpen={setIsShiftModalOpen}
        downloadBackup={downloadBackup}
        handleRestoreData={handleRestoreData}
        isInitializing={isInitializing}
        fileInputRef={fileInputRef}
        systemName={systemName}
        setSystemName={setSystemName}
        loginSystemName={loginSystemName}
        setLoginSystemName={setLoginSystemName}
        loginSystemSubtitle={loginSystemSubtitle}
        setLoginSystemSubtitle={setLoginSystemSubtitle}
        systemLogo={systemLogo}
        setSystemLogo={setSystemLogo}
        isAdminUser={loggedUser.registration === '1010'}
      />

      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target?.result as string);
                    
                    if (data.operators) setOperators(data.operators);
                    if (data.availableRoles) setAvailableRoles(data.availableRoles);
                    if (data.goals) setGoals(data.goals);
                    if (data.dashboardMonth) setDashboardMonth(data.dashboardMonth);

                    // Restore to LocalStorage
                    if (data.productionData) setProductionData(data.productionData);
                    if (data.employees) setEmployees(data.employees);
                    if (data.availableShifts) setAvailableShifts(data.availableShifts);
                    if (data.personnelLogs) setPersonnelLogs(data.personnelLogs);

                    alert('Backup restaurado com sucesso!');
                } catch (err) {
                    alert('Erro ao processar arquivo de backup.');
                }
            };
            reader.readAsText(file);
        }
      }} accept=".json" className="hidden" />

      <LaunchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={async (e) => {
        try {
          const isNew = !editingEntry;
          const id = editingEntry ? editingEntry.id : Math.random().toString(36).substr(2, 9);
          const entry = { ...e, id, userId: currentUser.uid, updatedAt: new Date().toISOString() };
          await setDoc(doc(db, 'productionEntries', id), entry);
          
          if (isNew) {
            addNotification(`Novo lançamento realizado por ${entry.operator} na ${entry.machine}`);
          }
        } catch (error) {
          console.error("Erro ao salvar:", error);
          alert("Ocorreu um erro ao salvar o lançamento.");
        }
        setEditingEntry(null);
      }} collaborators={collaborators} activeMachines={activeMachines} availableShifts={availableShifts} initialData={editingEntry} />
      
      <EmployeeModal isOpen={isEmployeeModalOpen} onClose={() => { setIsEmployeeModalOpen(false); setSelectedEmployee(null); setSelectedSlot(null); }} onSave={async (data, action, details) => {
          try {
            const now = new Date().toISOString();
            const empId = data.id || Math.random().toString(36).substr(2, 9);
            
            if (action === 'Contratação') {
              // Quando salva um colaborador, garante que ele existe na base central se for adicionado por nome manualmente (embora agora use seleção)
              // Mas aqui o EmployeeModal já retorna o collaboratorId se selecionado.
              await setDoc(doc(db, 'employees', empId), { ...data, id: empId, updatedAt: now, userId: currentUser.uid });
            } else if (action === 'Exclusão') {
              await deleteDoc(doc(db, 'employees', empId));
            } else if (action === 'Desligamento') {
              await setDoc(doc(db, 'employees', empId), { 
                ...data, 
                status: 'Em Contratação', 
                name: 'Em Contratação',
                updatedAt: now, 
                userId: currentUser.uid 
              }, { merge: true });
            } else {
              await setDoc(doc(db, 'employees', empId), { ...data, updatedAt: now, userId: currentUser.uid }, { merge: true });
            }
            
            const logId = Math.random().toString(36).substr(2, 9);
            await setDoc(doc(db, 'personnelLogs', logId), {
              id: logId,
              date: now,
              employeeName: data.name || 'Vaga',
              action: action as any,
              details: details || '',
              user: currentUser.displayName || currentUser.email || 'Admin',
              userId: currentUser.uid
            });
          } catch(error) {
            console.error(error);
          }
      }} availableShifts={availableShifts} availableMachines={activeMachines} availableRoles={availableRoles} collaborators={collaborators} initialData={selectedEmployee} slotInfo={selectedSlot} />
      
      <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} onSave={async (s) => {
        try {
          const shiftId = Math.random().toString(36).substr(2, 9);
          await setDoc(doc(db, 'shifts', shiftId), { ...s, id: shiftId, userId: currentUser.uid });
        } catch (error) {
          console.error(error);
        }
      }} />
      <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} logs={personnelLogs} />
      <TrainingModal 
        isOpen={isTrainingModalOpen} 
        onClose={() => setIsTrainingModalOpen(false)} 
        collaborators={collaborators} 
        employees={employees} 
        records={trainingRecords}
        onSave={handleSaveTraining} 
        onDelete={(id) => {
          openConfirm(
            'Excluir Ficha',
            'Tem certeza que deseja excluir esta ficha de treinamento permanentemente?',
            () => handleDeleteTraining(id)
          );
        }}
        onEditTemplate={() => setIsTemplateModalOpen(true)}
      />
      
      <TrainingTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        template={trainingTemplate}
        onSave={handleSaveTrainingTemplate}
      />
      
      <UserManagementModal 
        isOpen={isUserManagementOpen} 
        onClose={() => setIsUserManagementOpen(false)} 
        users={systemUsers} 
        onUpdateUsers={setSystemUsers}
        availableRoles={availableRoles} 
        collaborators={collaborators}
      />
      {isDatabaseModalOpen && (
        <DatabaseModal 
          isOpen={isDatabaseModalOpen}
          onClose={() => setIsDatabaseModalOpen(false)}
          employees={employees}
          collaborators={collaborators}
          onEditCollaborator={(col) => {
            console.log('Editing collaborator:', col);
            setSelectedCollaborator(col);
            setIsCollaboratorModalOpen(true);
          }}
          availableRoles={availableRoles}
          availableShifts={availableShifts.map(s => s.name)}
          machines={activeMachines}
          onAdd={async (newEmp) => {
            try {
              const id = Math.random().toString(36).substring(2, 15);
              const now = new Date().toISOString();
              const empData = {
                ...newEmp,
                id,
                userId: currentUser.uid,
                updatedAt: now
              };
              await setDoc(doc(db, 'employees', id), empData);
              
              const logId = Math.random().toString(36).substring(2, 15);
              await setDoc(doc(db, 'personnelLogs', logId), {
                id: logId,
                userId: currentUser.uid,
                date: now,
                employeeName: newEmp.name,
                action: 'Contratação' as any,
                details: `Inclusão direta via Banco de Dados (${newEmp.sector} - ${newEmp.machine})`,
                user: loggedUser?.name || 'Sistema'
              });
            } catch (err) {
              console.error(err);
            }
          }}
          onDelete={(id, name) => {
            openConfirm(
              'Excluir Slot',
              `Tem certeza que deseja EXCLUIR o slot de ${name}? Isso removerá o registro e o slot do quadro caso seja um extra.`,
              async () => {
                try {
                  await deleteDoc(doc(db, 'employees', id));
                  
                  const now = new Date().toISOString();
                  const logId = Math.random().toString(36).substring(2, 15);
                  await setDoc(doc(db, 'personnelLogs', logId), {
                    id: logId,
                    userId: currentUser.uid,
                    date: now,
                    employeeName: name,
                    action: 'Exclusão' as any,
                    details: `Exclusão permanente via Banco de Dados`,
                    user: loggedUser?.name || 'Sistema'
                  });
                } catch (err) {
                  console.error(err);
                }
              }
            );
          }}
          onTerminate={(id, name) => {
            openConfirm(
              'Confirmar Desligamento',
              `Deseja DESLIGAR ${name}? Isso abrirá uma vaga disponível no quadro.`,
              async () => {
                try {
                  const now = new Date().toISOString();
                  await setDoc(doc(db, 'employees', id), { 
                    status: 'Em Contratação', 
                    name: 'Em Contratação',
                    updatedAt: now, 
                    userId: currentUser.uid 
                  }, { merge: true });
                  
                  const logId = Math.random().toString(36).substring(2, 15);
                  await setDoc(doc(db, 'personnelLogs', logId), {
                    id: logId,
                    userId: currentUser.uid,
                    date: now,
                    employeeName: name,
                    action: 'Desligamento' as any,
                    details: `Desligamento via Banco de Dados (vaga aberta)`,
                    user: loggedUser?.name || 'Sistema'
                  });
                } catch (err) {
                  console.error(err);
                }
              },
              'warning'
            );
          }}
        />
      )}
      {isCollaboratorModalOpen && (
        <div className="fixed inset-0 z-[300]">
          <CollaboratorModal
            isOpen={isCollaboratorModalOpen}
            onClose={() => { setIsCollaboratorModalOpen(false); setSelectedCollaborator(null); }}
            onSave={handleSaveCollaborator}
            initialData={selectedCollaborator}
            availableRoles={availableRoles}
          />
        </div>
      )}

      {/* Real-time Notifications Portal */}
      <div className="fixed top-6 right-6 z-[250] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-blue-100 p-5 rounded-[2rem] shadow-2xl shadow-blue-900/10 flex items-start gap-4 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <Bell size={24} className="animate-bounce" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity size={12} /> Novo Lançamento
                  </p>
                  <button 
                    onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                    className="text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs font-black text-slate-800 leading-tight uppercase tracking-tight">
                  {n.message}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users size={8} className="text-slate-400" />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    Resp: {n.operator}
                  </p>
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 h-1 bg-blue-600/10 w-full">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="h-full bg-blue-600"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type}
      />
    </div>
  );
};

const UserManagementModal: React.FC<{ isOpen: boolean; onClose: () => void; users: SystemUser[]; onUpdateUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>; availableRoles: string[]; collaborators: Collaborator[] }> = ({ isOpen, onClose, users, onUpdateUsers, availableRoles, collaborators }) => {
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [role, setRole] = useState(availableRoles[0] || '');
  const [permissions, setPermissions] = useState<UserPermissions>({
    canViewDashboard: true,
    canViewReports: true,
    canViewPersonnel: true,
    canManageSettings: false,
    canEditProduction: true,
    canManagePersonnel: false,
    isReadOnly: false
  });
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  const handleCreate = async () => {
    if (!name || !registration || !role) {
      alert('Preencha todos os campos.');
      return;
    }
    if (users.find(u => u.registration === registration)) {
      alert('Esta matrícula já está cadastrada.');
      return;
    }
    const id = Math.random().toString(36).substr(2, 9);
    const newUser: SystemUser = {
      id,
      name,
      registration,
      role,
      isFirstAccess: true,
      permissions
    };
    try {
      await setDoc(doc(db, 'system_users', id), newUser);
      setName('');
      setRegistration('');
      alert('Usuário cadastrado com sucesso! A senha será solicitada no primeiro acesso.');
    } catch (err) {
      alert('Erro ao cadastrar usuário.');
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'system_users', userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      alert('Erro ao excluir usuário');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cadastro de Usuários</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors">
              <div className="p-2 hover:bg-slate-100 rounded-xl"><X size={24}/></div>
            </button>
         </div>

         {/* Confirmação de Exclusão */}
         {userToDelete && (
           <div className="absolute inset-0 z-[120] bg-white/95 backdrop-blur-md flex items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="max-w-xs">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Confirmar Exclusão</h4>
                <p className="text-xs text-slate-500 font-bold mb-8 uppercase tracking-wide">
                  Tem certeza que deseja excluir o usuário <span className="text-red-600 underline">{userToDelete.name}</span>? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setUserToDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100">Confirmar</button>
                </div>
              </div>
           </div>
         )}

         <div className="space-y-4 mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Nome Completo</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all" placeholder="Nome do usuário" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Matrícula</label>
                <div className="relative group">
                  <input 
                    value={registration} 
                    onChange={e => {
                      setRegistration(e.target.value);
                      const col = (collaborators || []).find(c => c.registration === e.target.value);
                      if (col) {
                        setName(col.name);
                        setRole(col.role || role);
                      }
                    }} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono" 
                    placeholder="Ex: 0001" 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Search size={16} className="text-slate-300" />
                  </div>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 ml-1 tracking-tighter">Digite a matrícula para buscar no banco central</p>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Função</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all">
                <option value="" disabled>Selecione uma função</option>
                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Permissões de Acesso</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'canViewDashboard', label: 'Ver Dashboard' },
                  { key: 'canViewReports', label: 'Ver Relatórios' },
                  { key: 'canViewPersonnel', label: 'Ver RH' },
                  { key: 'canEditProduction', label: 'Lançar Produção' },
                  { key: 'canManageSettings', label: 'Configurações' },
                  { key: 'canManagePersonnel', label: 'Gerir RH' },
                  { key: 'isReadOnly', label: 'Somente Leitura' }
                ].map((perm) => (
                  <button 
                    key={perm.key}
                    onClick={() => setPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key as keyof UserPermissions] }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${permissions[perm.key as keyof UserPermissions] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${permissions[perm.key as keyof UserPermissions] ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                      {permissions[perm.key as keyof UserPermissions] && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight">{perm.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleCreate} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 mt-2">
              <Plus size={18}/> Cadastrar Novo Usuário
            </button>
         </div>

         <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuários Registrados ({users.length})</p>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {users.length === 0 ? (
                <div className="text-center py-10 text-slate-300">
                  <Users size={32} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum usuário cadastrado</p>
                </div>
              ) : (
                [...users].sort((a,b) => (a.registration || '').localeCompare(b.registration || '')).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200 font-black text-[10px]">{u.registration}</div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{u.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">{u.role}</p>
                      </div>
                    </div>
                    {u.registration !== '1010' && (
                      <button onClick={() => setUserToDelete(u)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={18}/>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
         </div>
      </div>
    </div>
  )
};

const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  activeTab: 'filters' | 'goals' | 'config' | 'system';
  setActiveTab: (tab: 'filters' | 'goals' | 'config' | 'system') => void;
  filterOperator: string;
  setFilterOperator: (op: string) => void;
  filterDay: string;
  setFilterDay: (day: string) => void;
  dashboardMonth: string;
  setDashboardMonth: (month: string) => void;
  operators: string[];
  goals: Record<string, number>;
  setGoals: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setIsUserManagementOpen: (open: boolean) => void;
  setIsOperatorModalOpen: (open: boolean) => void;
  setIsRoleModalOpen: (open: boolean) => void;
  setIsShiftModalOpen: (open: boolean) => void;
  downloadBackup: () => void;
  handleRestoreData: () => Promise<void>;
  isInitializing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  systemName: string;
  setSystemName: (name: string) => void;
  loginSystemName: string;
  setLoginSystemName: (name: string) => void;
  loginSystemSubtitle: string;
  setLoginSystemSubtitle: (text: string) => void;
  systemLogo: string | null;
  setSystemLogo: (logo: string | null) => void;
  isAdminUser: boolean;
}> = ({
  isOpen, onClose, onSave, activeTab, setActiveTab,
  filterOperator, setFilterOperator, filterDay, setFilterDay, dashboardMonth, setDashboardMonth,
  operators, goals, setGoals,
  setIsUserManagementOpen, setIsOperatorModalOpen, setIsRoleModalOpen, setIsShiftModalOpen,
  downloadBackup, handleRestoreData, isInitializing, fileInputRef,
  systemName, setSystemName, loginSystemName, setLoginSystemName, loginSystemSubtitle, setLoginSystemSubtitle, systemLogo, setSystemLogo, isAdminUser
}) => {
  if (!isOpen) return null;

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  const tabs = [
    { id: 'filters', label: 'Filtros', icon: Search },
    { id: 'goals', label: 'Metas', icon: Target, hidden: !isAdminUser },
    { id: 'config', label: 'Cadastro', icon: Settings, hidden: !isAdminUser },
    { id: 'system', label: 'Sistema', icon: Cpu, hidden: !isAdminUser },
  ].filter(t => !t.hidden);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Configurações</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gerencie as preferências do sistema</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all">
            <X size={28} />
          </button>
        </div>

        <div className="flex bg-slate-50 border-b border-slate-100 p-2 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'filters' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 mb-2 block uppercase tracking-widest ml-1">Filtrar por Operador</label>
                    <select 
                      value={filterOperator} 
                      onChange={e => setFilterOperator(e.target.value)} 
                      className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none"
                    >
                      <option value="Todos">Todos os Operadores</option>
                      {operators.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 mb-2 block uppercase tracking-widest ml-1">Dia Específico</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={filterDay} 
                        onChange={e => setFilterDay(e.target.value)} 
                        className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                      />
                      {filterDay && (
                        <button 
                          onClick={() => setFilterDay('')} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          title="Limpar filtro"
                        >
                          <X size={14}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-8 space-y-2">
                  <label className="text-[10px] font-black text-blue-600 mb-2 block uppercase tracking-widest ml-1">Mês/Ano de Referência</label>
                  <input 
                    type="month" 
                    value={dashboardMonth} 
                    onChange={e => setDashboardMonth(e.target.value)} 
                    className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-center py-4">
              <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-[2rem] flex items-center justify-center border border-orange-100 mx-auto mb-2">
                <Target size={40} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Meta de Produção</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Defina o objetivo mensal em quilos (kg)</p>
              </div>
              <div className="max-w-xs mx-auto space-y-4">
                <div className="relative">
                  <input 
                    type="number" 
                    value={goals[dashboardMonth] || GOAL_VALUE} 
                    onChange={e => setGoals(prev => ({...prev, [dashboardMonth]: Number(e.target.value)}))} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-8 py-6 text-2xl font-black text-center text-slate-800 outline-none focus:ring-8 focus:ring-orange-50 tracking-tighter"
                  />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-lg">KG</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed px-4">
                  Esta meta é aplicada ao mês selecionado ({dashboardMonth.split('-').reverse().join('/')}) para o cálculo dos indicadores.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {isAdminUser && (
                 <button onClick={() => { onClose(); setIsUserManagementOpen(true); }} className="w-full group px-8 py-6 bg-slate-50 text-slate-700 rounded-[2rem] font-black text-xs uppercase flex items-center justify-between border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-white/20 group-hover:text-white transition-all"><UserPlus size={24}/></div>
                      <div className="text-left">
                        <p className="tracking-widest">Cadastro de Usuários</p>
                        <p className="text-[9px] font-bold opacity-60 tracking-normal mt-1">Gerencie quem pode acessar o sistema</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                 </button>
               )}

               <button onClick={() => { onClose(); setIsShiftModalOpen(true); }} className="w-full group px-8 py-6 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-between hover:border-orange-400 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center"><Clock size={24}/></div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase text-slate-800 tracking-widest">Gerenciar Turnos</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Horários e escalas de trabalho</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
               </button>

               <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100 text-center space-y-2">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Gestão de Pessoal</p>
                 <p className="text-xs font-bold text-slate-500">As configurações de operadores e funções foram unificadas no <span className="text-blue-700">Cadastro de Colaboradores</span> disponível no Menu Extra da tela de Pessoal.</p>
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm relative group">
                    {systemLogo ? (
                      <img src={systemLogo} alt="Logo Prev" className="w-full h-full object-cover" />
                    ) : (
                      <Cpu size={32} className="text-slate-300" />
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest text-center px-2">Alterar Logo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setSystemLogo(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Personalização Visual</p>
                    <div className="space-y-3">
                      <input 
                        type="url" 
                        value={systemLogo?.startsWith('data:') ? '' : (systemLogo || '')} 
                        onChange={e => setSystemLogo(e.target.value)}
                        placeholder="Link da imagem (URL)..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                      />
                      <div className="flex gap-2">
                         <button onClick={() => setSystemLogo(null)} className="px-4 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase text-red-500 rounded-xl hover:bg-red-50 transition-all">Remover</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center justify-between">
                      Nome (Cabeçalho)
                      {!isAdminUser && <span className="text-amber-500 flex items-center gap-1"><ShieldCheck size={10}/> ADM</span>}
                    </label>
                    <input 
                      value={systemName} 
                      onChange={e => setSystemName(e.target.value)} 
                      disabled={!isAdminUser}
                      className={`w-full border rounded-2xl px-6 py-4 font-black text-slate-800 outline-none transition-all ${isAdminUser ? 'bg-white border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500' : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'}`}
                      placeholder="Cabeçalho..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center justify-between">
                      Nome (Login)
                      {!isAdminUser && <span className="text-amber-500 flex items-center gap-1"><ShieldCheck size={10}/> ADM</span>}
                    </label>
                    <input 
                      value={loginSystemName} 
                      onChange={e => setLoginSystemName(e.target.value)} 
                      disabled={!isAdminUser}
                      className={`w-full border rounded-2xl px-6 py-4 font-black text-slate-800 outline-none transition-all ${isAdminUser ? 'bg-white border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500' : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'}`}
                      placeholder="Tela de Login..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center justify-between">
                    Subtítulo (Tela de Login)
                    {!isAdminUser && <span className="text-amber-500 flex items-center gap-1"><ShieldCheck size={10}/> ADM</span>}
                  </label>
                  <input 
                    value={loginSystemSubtitle} 
                    onChange={e => setLoginSystemSubtitle(e.target.value)} 
                    disabled={!isAdminUser}
                    className={`w-full border rounded-2xl px-6 py-4 font-black text-slate-800 outline-none transition-all ${isAdminUser ? 'bg-white border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500' : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'}`}
                    placeholder="Texto abaixo do nome principal no login..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <button onClick={downloadBackup} className="group p-6 bg-emerald-50 text-emerald-700 rounded-[2rem] border border-emerald-100 flex flex-col items-center text-center gap-3 hover:bg-emerald-600 hover:text-white hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><FileDown size={28}/></div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest italic">Baixar Backup</p>
                    <p className="text-[9px] font-bold opacity-70">Salvar dados em JSON</p>
                  </div>
                </button>
                <button onClick={() => { onClose(); fileInputRef.current?.click(); }} className="group p-6 bg-blue-50 text-blue-700 rounded-[2rem] border border-blue-100 flex flex-col items-center text-center gap-3 hover:bg-blue-600 hover:text-white hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-white text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><Upload size={28}/></div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest italic">Restaurar Backup</p>
                    <p className="text-[9px] font-bold opacity-70">Carregar base salva</p>
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={handleRestoreData}
                  disabled={isInitializing}
                  className="w-full group p-6 bg-red-50 text-red-700 rounded-[2rem] border border-red-100 flex flex-col items-center text-center gap-3 hover:bg-red-600 hover:text-white hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <div className="w-14 h-14 bg-white text-red-600 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm"><RotateCcw size={28}/></div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest italic">Restaurar Dados Iniciais</p>
                    <p className="text-[9px] font-bold opacity-70">CUIDADO: Apaga tudo e volta ao padrão</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {activeTab !== 'filters' && isAdminUser && (
          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className={`px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
};

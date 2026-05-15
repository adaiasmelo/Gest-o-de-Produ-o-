import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, getDocs, deleteDoc,
  persistentLocalCache, persistentMultipleTabManager, getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Inicialização robusta do Firestore com cache persistente e pooling longo para melhor conectividade
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Testar conexão inicial (silencioso no console se ok, erro se falha crítica)
const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
    console.log('PWA: Firestore conectado com sucesso');
  } catch (error) {
    console.warn('PWA: Firestore operando em modo offline ou conexão pendente');
  }
};
testConnection();

export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const seedInitialData = async (data: {
    productionEntries: any[],
    employees: any[],
    logs: any[],
    operators: string[],
    roles: string[],
    goals: any
}) => {
    try {
        // Clear or just add
        const currentUid = auth.currentUser?.uid || 'system';
        
        for (const entry of data.productionEntries) {
            await setDoc(doc(db, 'productionEntries', entry.id), { ...entry, userId: currentUid });
        }
        for (const emp of data.employees) {
            await setDoc(doc(db, 'employees', emp.id), { ...emp, userId: currentUid });
        }
        for (const log of data.logs) {
            await setDoc(doc(db, 'personnelLogs', log.id), { ...log, userId: currentUid });
        }
        
        await setDoc(doc(db, 'settings', 'global'), {
            operators: data.operators,
            availableRoles: data.roles,
            goals: data.goals,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'seed');
    }
}

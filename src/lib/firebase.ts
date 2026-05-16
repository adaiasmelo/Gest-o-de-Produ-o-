import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging, Messaging } from 'firebase/messaging';
import { 
  initializeFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, getDocs, deleteDoc,
  persistentLocalCache, persistentMultipleTabManager, getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Inicialização do Messaging (Client-Side) - Apenas se suportado pelo navegador
export let messaging: Messaging | null = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn("Firebase Messaging não é suportado neste navegador.");
}

// Inicialização robusta do Firestore com cache persistente e long polling para melhor conectividade
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true // Re-habilitado para garantir conectividade em ambientes com proxy/firewall restrito
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
  const isOffline = error instanceof Error && (
    error.message.includes('the client is offline') || 
    error.message.includes('network-error') ||
    error.message.includes('Failed to get document because the client is offline')
  );

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
  
  if (isOffline) {
    console.warn('PWA Offline:', operationType, path);
    // Não lança erro se for apenas offline, permite que o Firestore use o cache silenciosamente
    return;
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

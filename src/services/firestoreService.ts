import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';
import {
  FamilyMember,
  Vehicle,
  CarReservation,
  CalendarEvent,
  TaskTemplate,
  TaskInstance,
  FamilySettings,
  MemberWeeklyPointsRecord,
} from '../types';

export const FAMILY_ID = 'totland';

// Helper to attach familyId
function withFamily<T extends object>(data: T): T & { familyId: string } {
  return {
    ...data,
    familyId: FAMILY_ID,
  };
}

// 1. Members
export function subscribeMembers(
  onUpdate: (members: FamilyMember[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'members';
  const q = query(collection(db, path), where('familyId', '==', FAMILY_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FamilyMember[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as FamilyMember);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore subscription warning (members):', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveMemberToFirestore(member: FamilyMember) {
  const path = `members/${member.id}`;
  try {
    await setDoc(doc(db, 'members', member.id), withFamily(member), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMemberFromFirestore(memberId: string) {
  const path = `members/${memberId}`;
  try {
    await deleteDoc(doc(db, 'members', memberId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 2. Vehicles
export function subscribeVehicles(
  onUpdate: (vehicles: Vehicle[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'vehicles';
  const q = query(collection(db, path), where('familyId', '==', FAMILY_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Vehicle[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Vehicle);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore subscription warning (vehicles):', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveVehicleToFirestore(vehicle: Vehicle) {
  const path = `vehicles/${vehicle.id}`;
  try {
    await setDoc(doc(db, 'vehicles', vehicle.id), withFamily(vehicle), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteVehicleFromFirestore(vehicleId: string) {
  const path = `vehicles/${vehicleId}`;
  try {
    await deleteDoc(doc(db, 'vehicles', vehicleId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 3. Reservations
export function subscribeReservations(
  onUpdate: (reservations: CarReservation[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'reservations';
  const q = query(collection(db, path), where('familyId', '==', FAMILY_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CarReservation[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CarReservation);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore subscription warning (reservations):', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveReservationToFirestore(reservation: CarReservation) {
  const path = `reservations/${reservation.id}`;
  try {
    await setDoc(doc(db, 'reservations', reservation.id), withFamily(reservation), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteReservationFromFirestore(reservationId: string) {
  const path = `reservations/${reservationId}`;
  try {
    await deleteDoc(doc(db, 'reservations', reservationId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 4. Calendar Events
export function subscribeCalendarEvents(
  onUpdate: (events: CalendarEvent[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'calendarEvents';
  const q = query(collection(db, path), where('familyId', '==', FAMILY_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CalendarEvent[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CalendarEvent);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore subscription warning (calendarEvents):', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveCalendarEventToFirestore(event: CalendarEvent) {
  const path = `calendarEvents/${event.id}`;
  try {
    await setDoc(doc(db, 'calendarEvents', event.id), withFamily(event), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCalendarEventFromFirestore(eventId: string) {
  const path = `calendarEvents/${eventId}`;
  try {
    await deleteDoc(doc(db, 'calendarEvents', eventId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 5. Task Templates
export function subscribeTaskTemplates(
  onUpdate: (templates: TaskTemplate[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'taskTemplates';
  const q = query(collection(db, path), where('familyId', '==', FAMILY_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: TaskTemplate[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TaskTemplate);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore subscription warning (taskTemplates):', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveTaskTemplateToFirestore(template: TaskTemplate) {
  const path = `taskTemplates/${template.id}`;
  try {
    await setDoc(doc(db, 'taskTemplates', template.id), withFamily(template), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteTaskTemplateFromFirestore(templateId: string) {
  const path = `taskTemplates/${templateId}`;
  try {
    await deleteDoc(doc(db, 'taskTemplates', templateId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 6. Task Instances
export function subscribeTaskInstances(
  onUpdate: (instances: TaskInstance[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'taskInstances';
  const q = query(collection(db, path), where('familyId', '==', FAMILY_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: TaskInstance[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TaskInstance);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore subscription warning (taskInstances):', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveTaskInstanceToFirestore(instance: TaskInstance) {
  const path = `taskInstances/${instance.id}`;
  try {
    await setDoc(doc(db, 'taskInstances', instance.id), withFamily(instance), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteTaskInstanceFromFirestore(instanceId: string) {
  const path = `taskInstances/${instanceId}`;
  try {
    await deleteDoc(doc(db, 'taskInstances', instanceId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 7. Settings
export function subscribeSettings(
  onUpdate: (settings: FamilySettings) => void,
  onError?: (err: unknown) => void
) {
  const path = 'settings/main';
  return onSnapshot(
    doc(db, 'settings', 'main'),
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as FamilySettings);
      }
    },
    (error) => {
      console.warn('Firestore subscription warning (settings):', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveSettingsToFirestore(settings: FamilySettings) {
  const path = 'settings/main';
  try {
    await setDoc(doc(db, 'settings', 'main'), withFamily(settings), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// 8. Weekly Points History
export function subscribeWeeklyPoints(
  onUpdate: (records: MemberWeeklyPointsRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'weeklyPoints';
  const q = query(collection(db, path), where('familyId', '==', FAMILY_ID));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MemberWeeklyPointsRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as MemberWeeklyPointsRecord);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore subscription warning (weeklyPoints):', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveWeeklyPointsRecordToFirestore(record: MemberWeeklyPointsRecord) {
  const path = `weeklyPoints/${record.id}`;
  try {
    await setDoc(doc(db, 'weeklyPoints', record.id), withFamily(record), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Seed initial family data to Firestore if collection is empty
export async function seedInitialDataIfEmpty(initialData: {
  members: FamilyMember[];
  vehicles: Vehicle[];
  reservations: CarReservation[];
  calendarEvents: CalendarEvent[];
  taskTemplates: TaskTemplate[];
  taskInstances: TaskInstance[];
  settings: FamilySettings;
}) {
  try {
    const membersSnap = await getDocs(
      query(collection(db, 'members'), where('familyId', '==', FAMILY_ID))
    );
    if (membersSnap.empty) {
      console.log('Seeding initial data into Firestore...');
      const batch = writeBatch(db);

      // Members
      initialData.members.forEach((m) => {
        batch.set(doc(db, 'members', m.id), withFamily(m));
      });

      // Vehicles
      initialData.vehicles.forEach((v) => {
        batch.set(doc(db, 'vehicles', v.id), withFamily(v));
      });

      // Settings
      batch.set(doc(db, 'settings', 'main'), withFamily(initialData.settings));

      // Templates
      initialData.taskTemplates.forEach((t) => {
        batch.set(doc(db, 'taskTemplates', t.id), withFamily(t));
      });

      // Task instances
      initialData.taskInstances.forEach((inst) => {
        batch.set(doc(db, 'taskInstances', inst.id), withFamily(inst));
      });

      // Calendar Events
      initialData.calendarEvents.forEach((ev) => {
        batch.set(doc(db, 'calendarEvents', ev.id), withFamily(ev));
      });

      // Reservations
      initialData.reservations.forEach((res) => {
        batch.set(doc(db, 'reservations', res.id), withFamily(res));
      });

      await batch.commit();
      console.log('✅ Initial family data successfully seeded to Firestore!');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Could not seed Firestore initial data:', err);
    return false;
  }
}

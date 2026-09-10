/**
 * Shared SOS / emergency contact definitions.
 * The selected number defaults to the Indian Coast Guard (marine) and can be
 * changed from the Profile screen. The SOS modal and emergency SMS both use
 * the currently selected entry.
 */

export interface SosContact {
  id: string;
  label: string;
  number: string;
  description?: string;
}

export const SOS_CONTACTS: SosContact[] = [
  {
    id: 'icg',
    label: 'Indian Coast Guard',
    number: '1554',
    description: 'National SAR toll-free',
  },
  {
    id: 'national-emergency',
    label: 'National Emergency',
    number: '112',
    description: 'Police / Ambulance / Fire',
  },
  {
    id: 'disaster',
    label: 'Disaster Management',
    number: '108',
    description: 'NDMA emergency response',
  },
  {
    id: 'coastal-security',
    label: 'Coastal Security Police',
    number: '1093',
    description: 'Coastal & port police help',
  },
  {
    id: 'fisheries',
    label: 'Fisheries Department',
    number: '155220',
    description: 'Fisher welfare helpline',
  },
];

export const DEFAULT_SOS_ID = 'icg';

export function getSosContact(id: string | null | undefined): SosContact {
  const found = SOS_CONTACTS.find((c) => c.id === id);
  return found ?? SOS_CONTACTS[0];
}

const STORAGE_KEY = 'orca_sos_contact';

export function readSosContact(): SosContact {
  if (typeof window === 'undefined') return SOS_CONTACTS[0];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return getSosContact(saved);
}

export function writeSosContact(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
}
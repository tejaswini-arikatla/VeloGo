/**
 * Starter content for new VeloGo planning workflows.
 * Templates are copied into a user's draft; they are never persisted automatically.
 */
export interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  categories: Array<{
    name: string;
    items: Array<{ title: string; required: boolean }>;
  }>;
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'daily-commute',
    title: 'Daily commute',
    description: 'A short list for a regular work or college journey.',
    categories: [
      { name: 'Before leaving', items: [
        { title: 'Phone charged', required: true },
        { title: 'Wallet and keys', required: true },
        { title: 'Pickup location confirmed', required: true },
        { title: 'Weather checked', required: false },
      ] },
      { name: 'At pickup', items: [
        { title: 'Vehicle details checked', required: true },
        { title: 'Number plate matched', required: true },
        { title: 'Helmet or seat belt ready', required: true },
      ] },
    ],
  },
  {
    id: 'airport',
    title: 'Airport transfer',
    description: 'Keep flight and luggage preparation in one place.',
    categories: [
      { name: 'Documents', items: [
        { title: 'Photo identification', required: true },
        { title: 'Boarding pass or ticket', required: true },
        { title: 'Visa or travel documents if required', required: false },
      ] },
      { name: 'Transfer', items: [
        { title: 'Airport terminal confirmed', required: true },
        { title: 'Pickup time checked', required: true },
        { title: 'Luggage count checked', required: false },
        { title: 'Trusted contact informed', required: false },
      ] },
    ],
  },
  {
    id: 'late-evening',
    title: 'Late-evening journey',
    description: 'A personal checklist for planning an evening trip.',
    categories: [
      { name: 'Preparation', items: [
        { title: 'Phone battery sufficient', required: true },
        { title: 'Pickup point is well lit', required: false },
        { title: 'Trusted contact details available', required: false },
      ] },
      { name: 'Before starting', items: [
        { title: 'Vehicle and captain details reviewed', required: true },
        { title: 'Destination address confirmed', required: true },
        { title: 'Emergency contact accessible', required: false },
      ] },
    ],
  },
  {
    id: 'weekend-trip',
    title: 'Weekend trip',
    description: 'A reusable packing and coordination list.',
    categories: [
      { name: 'Essentials', items: [
        { title: 'Identification and payment method', required: true },
        { title: 'Phone charger', required: true },
        { title: 'Medication or personal essentials', required: false },
      ] },
      { name: 'Coordination', items: [
        { title: 'Group departure time confirmed', required: false },
        { title: 'Accommodation details saved', required: false },
        { title: 'Return journey planned', required: false },
      ] },
    ],
  },
];

export function getChecklistTemplate(id: string): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES.find((template) => template.id === id);
}

export function flattenChecklistTemplate(template: ChecklistTemplate): Array<{
  title: string;
  category: string;
  required: boolean;
}> {
  return template.categories.flatMap((category) => category.items.map((item) => ({
    title: item.title,
    category: category.name,
    required: item.required,
  })));
}

export function cloneChecklistTemplate(template: ChecklistTemplate, makeId: () => string) {
  return flattenChecklistTemplate(template).map((item) => ({
    ...item,
    id: makeId(),
    completed: false,
  }));
}

export interface CommuteTemplate {
  id: string;
  title: string;
  defaultWeekdays: number[];
  defaultDeparture: string;
  suggestedBudget: number;
  suggestedVehicle: 'BIKE' | 'AUTO' | 'CAB' | 'PUBLIC';
}

export const COMMUTE_TEMPLATES: CommuteTemplate[] = [
  { id: 'weekday-office', title: 'Weekday office commute', defaultWeekdays: [1, 2, 3, 4, 5], defaultDeparture: '09:00', suggestedBudget: 80, suggestedVehicle: 'PUBLIC' },
  { id: 'college-week', title: 'College timetable', defaultWeekdays: [1, 2, 3, 4, 5, 6], defaultDeparture: '08:00', suggestedBudget: 60, suggestedVehicle: 'BIKE' },
  { id: 'weekend-shift', title: 'Weekend shift', defaultWeekdays: [0, 6], defaultDeparture: '10:00', suggestedBudget: 100, suggestedVehicle: 'AUTO' },
];

export function getCommuteTemplate(id: string): CommuteTemplate | undefined {
  return COMMUTE_TEMPLATES.find((template) => template.id === id);
}

export function getTemplateSummary(template: ChecklistTemplate): string {
  const items = flattenChecklistTemplate(template);
  const required = items.filter((item) => item.required).length;
  return `${items.length} items · ${required} required`;
}

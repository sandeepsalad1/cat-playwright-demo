/** Equipment families and one sub-category each, used for data-driven navigation. */
export const equipmentJourneys = [
  { slug: 'excavators', title: /Excavators/i, subcategory: 'mini-excavators' },
  { slug: 'dozers', title: /Dozers/i },
  { slug: 'off-highway-trucks', title: /Off-Highway Trucks/i },
  { slug: 'motor-graders', title: /Motor Graders/i },
] as const;

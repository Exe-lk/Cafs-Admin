export type ServiceCategoryColorVariant =
  | "individual_online"
  | "individual_in_person"
  | "couple_individual"
  | "couple_online"
  | "default";

export type ServiceCategoryCalendarStyles = {
  container: string;
  title: string;
  subtitle: string;
};

function modalityFromServiceName(
  label: string,
  appointmentType?: "online" | "in_person",
): { isOnline: boolean; isInPerson: boolean } {
  const t = label.toLowerCase();
  const nameSaysInPerson =
    t.includes("in-person") || t.includes("in person") || t.includes("in_person");
  const nameSaysOnline = t.includes("online");

  if (nameSaysInPerson) {
    return { isOnline: false, isInPerson: true };
  }
  if (nameSaysOnline) {
    return { isOnline: true, isInPerson: false };
  }
  if (appointmentType === "online") {
    return { isOnline: true, isInPerson: false };
  }
  if (appointmentType === "in_person") {
    return { isOnline: false, isInPerson: true };
  }
  return { isOnline: false, isInPerson: false };
}

/** Whether a calendar appointment should be treated as online (icon, display). */
export function isOnlineAppointment(
  serviceName: string,
  appointmentType?: "online" | "in_person",
): boolean {
  return modalityFromServiceName(serviceName, appointmentType).isOnline;
}

/** Classify service/appointment label into a color variant. */
export function resolveServiceCategoryColorVariant(
  label: string,
  appointmentType?: "online" | "in_person",
): ServiceCategoryColorVariant {
  const t = label.toLowerCase();
  const isCouple = t.includes("couple");
  const isIndividual = t.includes("individual");
  const { isOnline, isInPerson } = modalityFromServiceName(label, appointmentType);

  if (isCouple && isOnline) return "couple_online";
  if (isCouple && (isIndividual || isInPerson)) return "couple_individual";
  if (isCouple) return "couple_individual";
  if (isIndividual && isOnline) return "individual_online";
  if (isIndividual && isInPerson) return "individual_in_person";
  if (isIndividual) return isOnline ? "individual_online" : "individual_in_person";

  return "default";
}

const ACCENT_BORDER: Record<ServiceCategoryColorVariant, string> = {
  individual_online: "bg-red-300",
  individual_in_person: "bg-yellow-300",
  couple_individual: "bg-stone-300",
  couple_online: "bg-green-300",
  default: "bg-mgmt-outline-variant/50",
};

const CALENDAR_STYLES: Record<ServiceCategoryColorVariant, ServiceCategoryCalendarStyles> = {
  individual_online: {
    container: "border-l-4 border-red-300 bg-red-50 shadow-sm hover:bg-red-100/80",
    title: "text-red-950",
    subtitle: "text-red-950",
  },
  individual_in_person: {
    container: "border-l-4 border-yellow-300 bg-yellow-50 shadow-sm hover:bg-yellow-100/80",
    title: "text-yellow-950",
    subtitle: "text-yellow-950",
  },
  couple_individual: {
    container: "border-l-4 border-stone-300 bg-stone-100 shadow-sm hover:bg-stone-200/70",
    title: "text-stone-800",
    subtitle: "text-stone-800",
  },
  couple_online: {
    container: "border-l-4 border-green-300 bg-green-50 shadow-sm hover:bg-green-100/80",
    title: "text-green-950",
    subtitle: "text-green-950",
  },
  default: {
    container:
      "border-l-4 border-mgmt-outline-variant bg-mgmt-surface-container-low shadow-sm hover:brightness-[0.98]",
    title: "text-mgmt-on-surface",
    subtitle: "text-mgmt-on-surface",
  },
};

export function serviceCategoryAccentBorderClass(label: string): string {
  return ACCENT_BORDER[resolveServiceCategoryColorVariant(label)];
}

export function serviceCategoryCalendarStyles(
  label: string,
  appointmentType?: "online" | "in_person",
): ServiceCategoryCalendarStyles {
  return CALENDAR_STYLES[resolveServiceCategoryColorVariant(label, appointmentType)];
}

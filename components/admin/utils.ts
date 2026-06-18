export function resolveName(value: any) {
  if (!value) return "â€”";
  if (typeof value === "string") return value;
  return value.name || value.email || value.title || "â€”";
}

export function activeLabel(active: boolean) {
  return active ? "Ativo" : "Inativo";
}

export function resolveClientName(item: Record<string, any>) {
  return resolveName(item.clientId || item.patientId);
}

export function resolveBarberName(item: Record<string, any>) {
  return resolveName(item.barberId || item.doctorId);
}

export function resolveServiceName(item: Record<string, any>) {
  return resolveName(item.serviceId || item.specialtyId);
}

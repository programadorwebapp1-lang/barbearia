export type FinancialPaymentMethod = "pix" | "cash" | "card" | "external_pix";

export type FinancialPaymentStatus = "pending" | "approved" | "paid" | "failed" | "rejected" | "cancelled" | "expired" | "refunded";

export type FinancialAppointmentStatus = "AGENDADA" | "CONFIRMADA" | "EM_ATENDIMENTO" | "FINALIZADA" | "CANCELADA" | "NAO_COMPARECEU";

export type FinancialFilters = {
  date: string;
  barberId: string;
  serviceId: string;
  paymentStatus: string;
  appointmentStatus: string;
};

export type FinancialSummary = {
  totalSoldToday: number;
  totalReceivedToday: number;
  totalPending: number;
  paidCount: number;
  pendingCount: number;
  cancelledCount: number;
};

export type FinancialAppointment = {
  id: string;
  date: string;
  time: string;
  clientId: string;
  clientName: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  appointmentStatus: FinancialAppointmentStatus;
  paymentStatus: FinancialPaymentStatus;
  paymentMethod: FinancialPaymentMethod | "";
  paymentProvider: string;
  paymentCode: string;
  paymentId: string;
  paymentAt: string | null;
  paymentError: string;
  notes: string;
};

export type FinancialData = {
  filters: FinancialFilters;
  summary: FinancialSummary;
  appointments: FinancialAppointment[];
  barbers: Array<{ _id: string; name: string }>;
  services: Array<{ _id: string; name: string; price: number }>;
};

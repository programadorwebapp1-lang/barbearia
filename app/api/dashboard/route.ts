import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import User from "@/models/User";
import Barber from "@/models/Doctor";
import Client from "@/models/Patient";
import Service from "@/models/Specialty";
import Schedule from "@/models/Schedule";
import Booking from "@/models/Appointment";
import Payment from "@/models/Payment";
import Barbershop from "@/models/Barbershop";
import Product from "@/models/Product";
import ProductOrder from "@/models/ProductOrder";
import { purgeLegacyDoctorPhotoUrls } from "@/lib/doctor-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parsePage(value: string | null, fallback = 1) {
  const page = Number(value || fallback);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : fallback;
}

function parseLimit(value: string | null, fallback = 10) {
  const limit = Number(value || fallback);
  return Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : fallback;
}

function getMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();
  const params = req.nextUrl.searchParams;
  const usePagination = session.role === "ADMIN" && params.get("paginate") === "1";

  if (session.role === "ADMIN") {
    await purgeLegacyDoctorPhotoUrls();

    const pages = {
      users: parsePage(params.get("usersPage")),
      barbers: parsePage(params.get("barbersPage")),
      clients: parsePage(params.get("clientsPage")),
      services: parsePage(params.get("servicesPage")),
      schedules: parsePage(params.get("schedulesPage")),
      bookings: parsePage(params.get("bookingsPage")),
      payments: parsePage(params.get("paymentsPage")),
      products: parsePage(params.get("productsPage")),
      productOrders: parsePage(params.get("productOrdersPage")),
    };

    const limits = {
      users: parseLimit(params.get("usersLimit"), 10),
      barbers: parseLimit(params.get("barbersLimit"), 10),
      clients: parseLimit(params.get("clientsLimit"), 10),
      services: parseLimit(params.get("servicesLimit"), 10),
      schedules: parseLimit(params.get("schedulesLimit"), 10),
      bookings: parseLimit(params.get("bookingsLimit"), 10),
      payments: parseLimit(params.get("paymentsLimit"), 10),
      products: parseLimit(params.get("productsLimit"), 10),
      productOrders: parseLimit(params.get("productOrdersLimit"), 10),
    };

    const [userCount, activeUserCount, barberCount, activeBarberCount, clientCount, activeClientCount, serviceCount, activeServiceCount, scheduleCount, bookingCount, paymentCount, productCount, productOrderCount, barbershop] =
      await Promise.all([
        User.countDocuments({ role: { $in: ["ADMIN", "BARBEIRO", "CLIENTE"] } }),
        User.countDocuments({ role: { $in: ["ADMIN", "BARBEIRO", "CLIENTE"] }, active: true }),
        Barber.countDocuments(),
        Barber.countDocuments({ active: true, status: { $ne: "INATIVO" } }),
        Client.countDocuments(),
        Client.countDocuments({ active: true }),
        Service.countDocuments(),
        Service.countDocuments({ active: true }),
        Schedule.countDocuments(),
        Booking.countDocuments(),
        Payment.countDocuments(),
        Product.countDocuments(),
        ProductOrder.countDocuments(),
        Barbershop.findOne().select("name email phone address logoUrl active createdAt").lean(),
      ]);

    const [users, barbers, clients, services, schedules, bookings, payments, products, productOrders] = await Promise.all([
      usePagination
        ? User.find({ role: { $in: ["ADMIN", "BARBEIRO", "CLIENTE"] } })
            .select("name email role active barberId clientId createdAt")
            .sort({ role: 1, name: 1 })
            .skip((pages.users - 1) * limits.users)
            .limit(limits.users)
            .lean()
        : User.find({ role: { $in: ["ADMIN", "BARBEIRO", "CLIENTE"] } })
            .select("name email role active barberId clientId createdAt")
            .sort({ role: 1, name: 1 })
            .lean(),
      usePagination
        ? Barber.find()
            .select("name email phone servicesIds photoUrl bio status active createdAt")
            .sort({ name: 1 })
            .skip((pages.barbers - 1) * limits.barbers)
            .limit(limits.barbers)
            .lean()
        : Barber.find().select("name email phone servicesIds photoUrl bio status active createdAt").sort({ name: 1 }).lean(),
      usePagination
        ? Client.find()
            .select("name email phone address birthDate active createdAt")
            .sort({ name: 1 })
            .skip((pages.clients - 1) * limits.clients)
            .limit(limits.clients)
            .lean()
        : Client.find().select("name email phone address birthDate active createdAt").sort({ name: 1 }).lean(),
      usePagination
        ? Service.find()
            .select("name description price durationMinutes active createdAt")
            .sort({ name: 1 })
            .skip((pages.services - 1) * limits.services)
            .limit(limits.services)
            .lean()
        : Service.find().select("name description price durationMinutes active createdAt").sort({ name: 1 }).lean(),
      usePagination
        ? Schedule.find()
            .select("barberId availableDays startTime endTime slotDuration lunchStart lunchEnd blockedDates vacationDates blockedSlots createdAt")
            .sort({ createdAt: -1 })
            .skip((pages.schedules - 1) * limits.schedules)
            .limit(limits.schedules)
            .lean()
        : Schedule.find().select("barberId availableDays startTime endTime slotDuration lunchStart lunchEnd blockedDates vacationDates blockedSlots createdAt").lean(),
      usePagination
        ? Booking.find()
            .select("barberId clientId serviceId barbershopId date time status paymentStatus paymentId notes rescheduledFrom reminderSentAt reminderLastError reminderPayloadSent createdAt")
            .sort({ date: -1, time: -1, createdAt: -1 })
            .skip((pages.bookings - 1) * limits.bookings)
            .limit(limits.bookings)
            .populate("barberId", "name email phone photoUrl servicesIds status active")
            .populate("clientId", "name email phone active")
            .populate("serviceId", "name price durationMinutes active")
            .populate("paymentId", "status method provider providerPaymentId qrCode qrCodeBase64 pixCopyPaste paidAt confirmedAt")
            .lean()
        : Booking.find()
            .select("barberId clientId serviceId barbershopId date time status paymentStatus paymentId notes rescheduledFrom reminderSentAt reminderLastError reminderPayloadSent createdAt")
            .sort({ date: -1, time: -1, createdAt: -1 })
            .populate("barberId", "name email phone photoUrl servicesIds status active")
            .populate("clientId", "name email phone active")
            .populate("serviceId", "name price durationMinutes active")
            .populate("paymentId", "status method provider providerPaymentId qrCode qrCodeBase64 pixCopyPaste paidAt confirmedAt")
            .lean(),
      usePagination
        ? Payment.find()
            .select("type bookingId orderId clientId barbershopId serviceId productId amount method provider providerPaymentId status paidAt confirmedAt createdAt")
            .sort({ createdAt: -1 })
            .skip((pages.payments - 1) * limits.payments)
            .limit(limits.payments)
            .lean()
        : Payment.find().select("type bookingId orderId clientId barbershopId serviceId productId amount method provider providerPaymentId status paidAt confirmedAt createdAt").lean(),
      usePagination
        ? Product.find()
            .select("name description photoUrl price stock category status createdAt")
            .sort({ name: 1 })
            .skip((pages.products - 1) * limits.products)
            .limit(limits.products)
            .lean()
        : Product.find().select("name description photoUrl price stock category status createdAt").lean(),
      usePagination
        ? ProductOrder.find()
            .select("clientId barbershopId items totalAmount paymentStatus status paymentId createdAt")
            .sort({ createdAt: -1 })
            .skip((pages.productOrders - 1) * limits.productOrders)
            .limit(limits.productOrders)
            .populate("clientId", "name email phone")
            .populate("items.productId", "name price photoUrl status")
            .lean()
        : ProductOrder.find()
            .select("clientId barbershopId items totalAmount paymentStatus status paymentId createdAt")
            .populate("clientId", "name email phone")
            .populate("items.productId", "name price photoUrl status")
            .lean(),
    ]);

    return NextResponse.json({
      user: session,
      users,
      barbers,
      doctors: barbers,
      clients,
      patients: clients,
      services,
      specialties: services,
      schedules,
      bookings,
      appointments: bookings,
      payments,
      products,
      productOrders,
      barbershop,
      counts: {
        users: userCount,
        barbers: barberCount,
        clients: clientCount,
        services: serviceCount,
        schedules: scheduleCount,
        bookings: bookingCount,
        payments: paymentCount,
        products: productCount,
        productOrders: productOrderCount,
      },
      summaryCounts: {
        users: activeUserCount,
        barbers: activeBarberCount,
        clients: activeClientCount,
        services: activeServiceCount,
        bookings: bookingCount,
      },
      meta: {
        users: getMeta(pages.users, limits.users, userCount),
        barbers: getMeta(pages.barbers, limits.barbers, barberCount),
        clients: getMeta(pages.clients, limits.clients, clientCount),
        services: getMeta(pages.services, limits.services, serviceCount),
        schedules: getMeta(pages.schedules, limits.schedules, scheduleCount),
        bookings: getMeta(pages.bookings, limits.bookings, bookingCount),
        payments: getMeta(pages.payments, limits.payments, paymentCount),
        products: getMeta(pages.products, limits.products, productCount),
        productOrders: getMeta(pages.productOrders, limits.productOrders, productOrderCount),
      },
      paginationEnabled: usePagination,
      doctor: null,
      patient: null,
    });
  }

  if (session.role === "BARBEIRO") {
    await purgeLegacyDoctorPhotoUrls();
    const barber = await Barber.findById(session.barberId).select("name email phone servicesIds photoUrl bio status active createdAt").lean();
    const schedule = barber ? await Schedule.findOne({ barberId: barber._id }).select("barberId availableDays startTime endTime slotDuration lunchStart lunchEnd blockedDates vacationDates blockedSlots createdAt").lean() : null;
    const today = new Date().toISOString().split("T")[0];
    const [totalBookings, todayBookings, previewBookings] = barber
      ? await Promise.all([
          Booking.countDocuments({ barberId: barber._id }),
          Booking.countDocuments({ barberId: barber._id, date: today }),
          Booking.find({ barberId: barber._id, date: today })
            .select("barberId clientId serviceId barbershopId date time status paymentStatus paymentId notes rescheduledFrom reminderSentAt reminderLastError reminderPayloadSent createdAt")
            .sort({ time: 1, createdAt: -1 })
            .limit(20)
            .populate("clientId", "name email phone active")
            .populate("serviceId", "name price durationMinutes active")
            .populate("paymentId", "status method provider providerPaymentId qrCode qrCodeBase64 pixCopyPaste paidAt confirmedAt")
            .lean(),
        ])
      : [0, 0, []];

    return NextResponse.json({
      user: session,
      barber,
      doctor: barber,
      schedule,
      bookings: previewBookings,
      appointments: previewBookings,
      counts: {
        bookings: totalBookings,
      },
      summaryCounts: {
        bookings: totalBookings,
        todayBookings,
      },
    });
  }

  const client = await Client.findById(session.clientId).lean();
  const services = await Service.find({ active: true }).select("name description price durationMinutes active createdAt").lean();
  await purgeLegacyDoctorPhotoUrls();
  const [upcomingBookingsCount, pastBookingsCount, upcomingBookings] = client
    ? await Promise.all([
        Booking.countDocuments({
          clientId: client._id,
          status: { $ne: "CANCELADA" },
          date: { $gte: new Date().toISOString().split("T")[0] },
        }),
        Booking.countDocuments({
          clientId: client._id,
          $or: [
            { status: "CANCELADA" },
            { status: "FINALIZADA" },
            { date: { $lt: new Date().toISOString().split("T")[0] } },
          ],
        }),
        Booking.find({
          clientId: client._id,
          status: { $ne: "CANCELADA" },
          date: { $gte: new Date().toISOString().split("T")[0] },
        })
          .select("barberId clientId serviceId barbershopId date time status paymentStatus paymentId notes rescheduledFrom reminderSentAt reminderLastError reminderPayloadSent createdAt")
          .sort({ date: 1, time: 1, createdAt: -1 })
          .limit(5)
          .populate("barberId", "name email phone photoUrl servicesIds status active")
          .populate("serviceId", "name price durationMinutes active")
          .populate("paymentId", "status method provider providerPaymentId qrCode qrCodeBase64 pixCopyPaste paidAt confirmedAt")
          .lean(),
      ])
    : [0, 0, []];

  return NextResponse.json({
    user: session,
    client,
    patient: client,
    services,
    specialties: services,
    bookings: upcomingBookings,
    appointments: upcomingBookings,
    counts: {
      services: services.length,
      bookings: upcomingBookingsCount + pastBookingsCount,
    },
    summaryCounts: {
      services: services.length,
      bookings: upcomingBookingsCount + pastBookingsCount,
      upcomingBookings: upcomingBookingsCount,
      pastBookings: pastBookingsCount,
    },
  });
}

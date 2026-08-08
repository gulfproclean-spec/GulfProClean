const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function upsertPersonWithPassword({ name, email, password, role }) {
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, password: hashed, role },
    create: { name, email, password: hashed, role },
  });
}

async function main() {
  console.log("Seeding Gulf Coast ProClean demo data...");

  // --- Admin account ---
  await upsertPersonWithPassword({
    name: "Founder Admin",
    email: "admin@gulfcoastproclean.com",
    password: "admin123",
    role: "ADMIN",
  });

  // --- Cleaner crew (Phase 1: two-person crew per the business plan,
  //     plus one extra so the matching demo has more to show) ---
  const cleanersData = [
    {
      name: "Maria Alvarez",
      email: "maria@gulfcoastproclean.com",
      password: "cleaner123",
      bio: "Lead cleaner covering the Fort Walton Beach – Destin core route.",
      rating: 4.9,
      yearsExperience: 6,
      vehicle: "Cargo Van #1",
      zipsServed: "32547,32548,32541,32578",
      available: true,
    },
    {
      name: "James Whitfield",
      email: "james@gulfcoastproclean.com",
      password: "cleaner123",
      bio: "Handles Crestview, Navarre, and overflow FWB jobs.",
      rating: 4.8,
      yearsExperience: 4,
      vehicle: "Cargo Van #1",
      zipsServed: "32547,32548,32536,32566",
      available: true,
    },
    {
      name: "Priya Natarajan",
      email: "priya@gulfcoastproclean.com",
      password: "cleaner123",
      bio: "Panama City Beach vacation-rental turnover specialist.",
      rating: 5.0,
      yearsExperience: 3,
      vehicle: "Cargo Van #2 (Phase 3)",
      zipsServed: "32407,32408,32413",
      available: true,
    },
  ];

  const cleaners = [];
  for (const c of cleanersData) {
    const user = await upsertPersonWithPassword({
      name: c.name,
      email: c.email,
      password: c.password,
      role: "CLEANER",
    });
    const cleaner = await prisma.cleaner.upsert({
      where: { userId: user.id },
      update: {
        bio: c.bio,
        rating: c.rating,
        yearsExperience: c.yearsExperience,
        vehicle: c.vehicle,
        zipsServed: c.zipsServed,
        available: c.available,
      },
      create: {
        userId: user.id,
        bio: c.bio,
        rating: c.rating,
        yearsExperience: c.yearsExperience,
        vehicle: c.vehicle,
        zipsServed: c.zipsServed,
        available: c.available,
      },
    });
    cleaners.push(cleaner);
  }

  // --- A couple of sample customers + bookings so dashboards aren't empty ---
  const sampleCustomer = await prisma.user.upsert({
    where: { email: "demo.customer@example.com" },
    update: {},
    create: {
      name: "Alex Rivera",
      email: "demo.customer@example.com",
      phone: "850-555-0142",
      role: "CUSTOMER",
    },
  });

  const existingBookings = await prisma.booking.count();
  if (existingBookings === 0) {
    await prisma.booking.create({
      data: {
        customerId: sampleCustomer.id,
        serviceType: "PROFESSIONAL",
        frequency: "Biweekly",
        address: "214 Beal Pkwy NW",
        city: "Fort Walton Beach",
        zip: "32547",
        requestedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        timeWindow: "10:00 AM – 12:00 PM",
        notes: "Gate code is 4521. Please use side entrance.",
        estimatedPrice: 179,
        status: "MATCHED",
        cleanerId: cleaners[0].id,
        matchedAt: new Date(),
      },
    });

    await prisma.booking.create({
      data: {
        customerId: sampleCustomer.id,
        serviceType: "VACATION_RENTAL",
        frequency: "As needed",
        address: "88 Poinciana Blvd",
        city: "Destin",
        zip: "32541",
        requestedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        timeWindow: "Flexible / Anytime",
        notes: "Checkout at 10am, next guest checks in at 4pm.",
        estimatedPrice: 130,
        status: "COMPLETED",
        cleanerId: cleaners[0].id,
        matchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const existingLeads = await prisma.lead.count();
  if (existingLeads === 0) {
    await prisma.lead.create({
      data: {
        name: "Coastal Realty Group",
        email: "info@coastalrealtygroup-demo.com",
        phone: "850-555-0199",
        message:
          "We manage 40+ rental listings in Destin and are interested in a recurring turnover-cleaning partnership.",
      },
    });
  }

  console.log("Seed complete.");
  console.log("  Admin login:   admin@gulfcoastproclean.com / admin123");
  console.log("  Cleaner login: maria@gulfcoastproclean.com / cleaner123");
  console.log("  (james@ and priya@ also work with cleaner123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

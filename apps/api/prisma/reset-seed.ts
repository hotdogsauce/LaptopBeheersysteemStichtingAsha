/**
 * reset-seed.ts
 *
 * Wist alle laptops, reserveringen, activiteiten, issues, checklists,
 * audit-logs, notificaties en decommission-logs — maar houdt gebruikersaccounts.
 * Vult daarna de database opnieuw met realistische testdata.
 *
 * Uitvoeren:
 *   npx tsx prisma/reset-seed.ts
 */

import { PrismaClient, LaptopStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Data wissen (accounts blijven)...')

  // Verwijder in volgorde van foreign-key afhankelijkheden
  await prisma.softwareRequest.deleteMany()
  await prisma.checklistReport.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.issue.deleteMany()
  await prisma.decommissionLog.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.drive.deleteMany()
  await prisma.laptop.deleteMany()
  await prisma.activity.deleteMany()

  console.log('✅ Alle data gewist.')

  // ── Activiteiten ────────────────────────────────────────────────────────────
  console.log('🎉 Activiteiten aanmaken...')

  const now = new Date()
  function daysFromNow(d: number, hour = 9) {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + d)
    dt.setHours(hour, 0, 0, 0)
    return dt
  }

  const activities = await Promise.all([
    prisma.activity.create({ data: {
      title: 'Karaoke Avond',
      start_datum_tijd: daysFromNow(5, 19),
      eind_datum_tijd:  daysFromNow(5, 22),
      omschrijving: 'Gezellige karaoke-avond voor alle leden van het buurtcentrum. Iedereen is welkom!',
      locatie: 'Grote Zaal',
      software_benodigdheden: 'KaraFun, YouTube, Bluetooth-speaker app',
    }}),
    prisma.activity.create({ data: {
      title: 'Dansles Salsa',
      start_datum_tijd: daysFromNow(7, 18),
      eind_datum_tijd:  daysFromNow(7, 20),
      omschrijving: 'Beginners- en gevorderdenklas salsa met professionele dansdocent.',
      locatie: 'Danszaal',
    }}),
    prisma.activity.create({ data: {
      title: 'Bestuursvergadering April',
      start_datum_tijd: daysFromNow(10, 10),
      eind_datum_tijd:  daysFromNow(10, 12),
      omschrijving: 'Maandelijkse vergadering van het bestuur van Stichting Asha.',
      locatie: 'Vergaderruimte 1',
      software_benodigdheden: 'Microsoft Teams, Word',
    }}),
    prisma.activity.create({ data: {
      title: 'Yogales voor Senioren',
      start_datum_tijd: daysFromNow(3, 10),
      eind_datum_tijd:  daysFromNow(3, 11),
      omschrijving: 'Rustige yogales speciaal voor senioren, geschikt voor beginners.',
      locatie: 'Zaal B',
    }}),
    prisma.activity.create({ data: {
      title: 'Kookworkshop Surinaamse Keuken',
      start_datum_tijd: daysFromNow(14, 13),
      eind_datum_tijd:  daysFromNow(14, 17),
      omschrijving: 'Leer traditionele Surinaamse gerechten koken: roti, pom, bruine bonen soep.',
      locatie: 'Keuken',
    }}),
    prisma.activity.create({ data: {
      title: 'Schilderworkshop Aquarel',
      start_datum_tijd: daysFromNow(12, 14),
      eind_datum_tijd:  daysFromNow(12, 17),
      omschrijving: 'Aquarelschilderen voor beginners en gevorderden. Materialen worden verstrekt.',
      locatie: 'Atelier',
    }}),
    prisma.activity.create({ data: {
      title: 'Gitaarlessen Beginners',
      start_datum_tijd: daysFromNow(6, 16),
      eind_datum_tijd:  daysFromNow(6, 18),
      omschrijving: 'Introductie gitaarles voor absolute beginners. Gitaren zijn beschikbaar.',
      locatie: 'Muziekkamer',
    }}),
    prisma.activity.create({ data: {
      title: 'Taallessen Nederlands',
      start_datum_tijd: daysFromNow(2, 9),
      eind_datum_tijd:  daysFromNow(2, 11),
      omschrijving: 'NT2-lessen voor mensen die Nederlands als tweede taal leren.',
      locatie: 'Klaslokaal 1',
      software_benodigdheden: 'Duolingo, NT2 oefensite',
    }}),
    prisma.activity.create({ data: {
      title: 'Computercursus Senioren',
      start_datum_tijd: daysFromNow(4, 10),
      eind_datum_tijd:  daysFromNow(4, 12),
      omschrijving: 'Basiscomputervaardigheden voor senioren: e-mail, internet, DigiD, zorgportalen.',
      locatie: 'Computerlokaal',
      software_benodigdheden: 'Chrome, Gmail, DigiD-app instructie',
    }}),
    prisma.activity.create({ data: {
      title: 'Kinderdisco',
      start_datum_tijd: daysFromNow(9, 15),
      eind_datum_tijd:  daysFromNow(9, 18),
      omschrijving: 'Feestelijke kinderdisco met spelletjes, dans en muziek voor kinderen van 4–12 jaar.',
      locatie: 'Grote Zaal',
    }}),
    prisma.activity.create({ data: {
      title: 'Bingo Middag',
      start_datum_tijd: daysFromNow(11, 14),
      eind_datum_tijd:  daysFromNow(11, 16),
      omschrijving: 'Gezellige bingomiddag met mooie prijzen voor alle leeftijden.',
      locatie: 'Grote Zaal',
      software_benodigdheden: 'Online bingo-generator',
    }}),
    prisma.activity.create({ data: {
      title: 'Workshop CV Schrijven',
      start_datum_tijd: daysFromNow(16, 10),
      eind_datum_tijd:  daysFromNow(16, 13),
      omschrijving: 'Praktische workshop: hoe schrijf je een sterk CV en sollicitatiebrief?',
      locatie: 'Vergaderruimte 2',
      software_benodigdheden: 'Microsoft Word, LinkedIn',
    }}),
  ])

  console.log(`✅ ${activities.length} activiteiten aangemaakt.`)

  // ── Laptops ─────────────────────────────────────────────────────────────────
  console.log('💻 Laptops aanmaken...')

  const laptopData: Array<{
    merk_type: string
    specificaties: string
    heeft_vga: boolean
    heeft_hdmi: boolean
    ram_gb: number
    heeft_wifi: boolean
    wifi_verbonden: boolean
    alle_toetsen_werken: boolean
    camera_werkt: boolean
    microfoon_werkt: boolean
    status: LaptopStatus
    drives: Array<{ letter: string; type: string; size_gb: number; free_gb: number }>
  }> = [
    {
      merk_type: 'Dell Latitude 5520',
      specificaties: 'Intel Core i5-1135G7, 16 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 16,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 180 }],
    },
    {
      merk_type: 'Dell Latitude 5520',
      specificaties: 'Intel Core i5-1135G7, 16 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 16,
      heeft_wifi: true, wifi_verbonden: false, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 195 }],
    },
    {
      merk_type: 'HP EliteBook 840 G8',
      specificaties: 'Intel Core i5-1145G7, 8 GB RAM, 256 GB SSD',
      heeft_vga: true, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: false,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 120 }],
    },
    {
      merk_type: 'HP EliteBook 840 G8',
      specificaties: 'Intel Core i5-1145G7, 8 GB RAM, 256 GB SSD',
      heeft_vga: true, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 140 }],
    },
    {
      merk_type: 'HP EliteBook 840 G8',
      specificaties: 'Intel Core i5-1145G7, 8 GB RAM, 256 GB SSD',
      heeft_vga: true, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: false, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.DEFECT,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 88 }],
    },
    {
      merk_type: 'Lenovo ThinkPad L14 Gen 2',
      specificaties: 'AMD Ryzen 5 5600U, 16 GB RAM, 512 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 16,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 512, free_gb: 350 }],
    },
    {
      merk_type: 'Lenovo ThinkPad L14 Gen 2',
      specificaties: 'AMD Ryzen 5 5600U, 16 GB RAM, 512 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 16,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: false, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 512, free_gb: 300 }],
    },
    {
      merk_type: 'Lenovo ThinkPad E15 Gen 3',
      specificaties: 'AMD Ryzen 7 5700U, 16 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 16,
      heeft_wifi: true, wifi_verbonden: false, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 200 }],
    },
    {
      merk_type: 'Asus VivoBook 15',
      specificaties: 'Intel Core i3-1115G4, 8 GB RAM, 128 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 128, free_gb: 55 }],
    },
    {
      merk_type: 'Asus VivoBook 15',
      specificaties: 'Intel Core i3-1115G4, 8 GB RAM, 128 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 128, free_gb: 70 }],
    },
    {
      merk_type: 'Asus VivoBook 15',
      specificaties: 'Intel Core i3-1115G4, 8 GB RAM, 128 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: false, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: false,
      status: LaptopStatus.IN_CONTROL,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 128, free_gb: 40 }],
    },
    {
      merk_type: 'Acer Aspire 5',
      specificaties: 'Intel Core i5-1135G7, 8 GB RAM, 256 GB SSD + 1 TB HDD',
      heeft_vga: true, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [
        { letter: 'C', type: 'SSD', size_gb: 256, free_gb: 160 },
        { letter: 'D', type: 'HDD', size_gb: 1000, free_gb: 700 },
      ],
    },
    {
      merk_type: 'Acer Aspire 5',
      specificaties: 'Intel Core i5-1135G7, 8 GB RAM, 256 GB SSD',
      heeft_vga: true, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 180 }],
    },
    {
      merk_type: 'Samsung Galaxy Book3',
      specificaties: 'Intel Core i7-1355U, 16 GB RAM, 512 GB SSD',
      heeft_vga: false, heeft_hdmi: false, ram_gb: 16,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 512, free_gb: 400 }],
    },
    {
      merk_type: 'Samsung Galaxy Book3',
      specificaties: 'Intel Core i7-1355U, 16 GB RAM, 512 GB SSD',
      heeft_vga: false, heeft_hdmi: false, ram_gb: 16,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 512, free_gb: 380 }],
    },
    {
      merk_type: 'Microsoft Surface Laptop 4',
      specificaties: 'AMD Ryzen 5 4680U, 8 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: false, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 190 }],
    },
    {
      merk_type: 'Microsoft Surface Laptop 4',
      specificaties: 'AMD Ryzen 5 4680U, 8 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: false, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: false, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 210 }],
    },
    {
      merk_type: 'Toshiba Satellite Pro L50',
      specificaties: 'Intel Core i5-8250U, 8 GB RAM, 256 GB HDD',
      heeft_vga: true, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: false, alle_toetsen_werken: true, camera_werkt: false, microfoon_werkt: false,
      status: LaptopStatus.OUT_OF_SERVICE,
      drives: [{ letter: 'C', type: 'HDD', size_gb: 256, free_gb: 30 }],
    },
    {
      merk_type: 'HP ProBook 450 G9',
      specificaties: 'Intel Core i5-1235U, 8 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 170 }],
    },
    {
      merk_type: 'HP ProBook 450 G9',
      specificaties: 'Intel Core i5-1235U, 8 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 155 }],
    },
    {
      merk_type: 'Dell Inspiron 15 3000',
      specificaties: 'Intel Core i3-1215U, 4 GB RAM, 128 GB HDD',
      heeft_vga: true, heeft_hdmi: true, ram_gb: 4,
      heeft_wifi: true, wifi_verbonden: false, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'HDD', size_gb: 128, free_gb: 50 }],
    },
    {
      merk_type: 'Dell Inspiron 15 3000',
      specificaties: 'Intel Core i3-1215U, 4 GB RAM, 128 GB HDD',
      heeft_vga: true, heeft_hdmi: true, ram_gb: 4,
      heeft_wifi: true, wifi_verbonden: false, alle_toetsen_werken: false, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.DEFECT,
      drives: [{ letter: 'C', type: 'HDD', size_gb: 128, free_gb: 45 }],
    },
    {
      merk_type: 'Lenovo IdeaPad 3',
      specificaties: 'Intel Core i5-1035G1, 8 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 175 }],
    },
    {
      merk_type: 'Lenovo IdeaPad 3',
      specificaties: 'Intel Core i5-1035G1, 8 GB RAM, 256 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 8,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 256, free_gb: 200 }],
    },
    {
      merk_type: 'Acer TravelMate P215',
      specificaties: 'Intel Core i7-1165G7, 16 GB RAM, 512 GB SSD',
      heeft_vga: false, heeft_hdmi: true, ram_gb: 16,
      heeft_wifi: true, wifi_verbonden: true, alle_toetsen_werken: true, camera_werkt: true, microfoon_werkt: true,
      status: LaptopStatus.AVAILABLE,
      drives: [{ letter: 'C', type: 'SSD', size_gb: 512, free_gb: 430 }],
    },
  ]

  for (const { drives, ...laptop } of laptopData) {
    const created = await prisma.laptop.create({ data: laptop })
    if (drives.length > 0) {
      await prisma.drive.createMany({
        data: drives.map(d => ({ ...d, laptopId: created.id })),
      })
    }
  }

  console.log(`✅ ${laptopData.length} laptops aangemaakt.`)
  console.log('\n🎊 Reset voltooid! De database bevat nu realistische testdata.')
  console.log('   Gebruikersaccounts zijn ongewijzigd.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

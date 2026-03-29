import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

const USERS = [
  { name: 'Admin Gebruiker',    username: 'admin',    email: 'admin@asha.nl',    role: UserRole.ADMIN,    password: 'admin123' },
  { name: 'Eigenaar Gebruiker', username: 'eigenaar', email: 'eigenaar@asha.nl', role: UserRole.OWNER,    password: 'eigenaar123' },
  { name: 'Helpdesk Gebruiker', username: 'helpdesk', email: 'helpdesk@asha.nl', role: UserRole.HELPDESK, password: 'helpdesk123' },
]

async function main() {
  // Gebruikers altijd upserten zodat wachtwoorden en usernames correct zijn na elke deploy
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { password: u.password, email: u.email },
      create: u,
    })
  }
  console.log('✅ Gebruikers gesynchroniseerd.')

  // Overige seed data alleen aanmaken als de DB leeg is
  const laptopCount = await prisma.laptop.count()
  if (laptopCount > 0) {
    console.log('✅ Seed data al aanwezig, overgeslagen.')
    return
  }

  // Laptops aanmaken
  await prisma.laptop.createMany({
    data: [
      { merk_type: 'Dell Latitude 5520',  specificaties: '16GB RAM, i5', heeft_vga: false, heeft_hdmi: true },
      { merk_type: 'HP EliteBook 840',    specificaties: '8GB RAM, i5',  heeft_vga: true,  heeft_hdmi: true },
      { merk_type: 'Lenovo ThinkPad X1',  specificaties: '16GB RAM, i7', heeft_vga: false, heeft_hdmi: true },
      { merk_type: 'Apple MacBook Pro',   specificaties: '16GB RAM, M1', heeft_vga: false, heeft_hdmi: false },
      { merk_type: 'Asus ZenBook 14',     specificaties: '8GB RAM, i5',  heeft_vga: true,  heeft_hdmi: true },
    ]
  })

  // Activiteit aanmaken
  await prisma.activity.create({
    data: {
      title: 'Workshop Programmeren',
      start_datum_tijd: new Date('2026-04-10T09:00:00'),
      eind_datum_tijd:  new Date('2026-04-10T17:00:00'),
      omschrijving: 'Introductie workshop programmeren voor beginners',
      locatie: 'Zaal A',
    }
  })

  console.log('✅ Seed data aangemaakt!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

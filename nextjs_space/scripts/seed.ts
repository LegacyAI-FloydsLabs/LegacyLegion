import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPwd = await bcrypt.hash('johndoe123', 10);
  const ryanPwd = await bcrypt.hash('LegacyLegion2026!', 10);

  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: { password: adminPwd, role: 'admin', name: 'Admin' },
    create: { email: 'john@doe.com', password: adminPwd, role: 'admin', name: 'Admin' },
  });
  const ryan = await prisma.user.upsert({
    where: { email: 'ryan@legacyai.space' },
    update: { password: ryanPwd, role: 'admin', name: 'Ryan' },
    create: { email: 'ryan@legacyai.space', password: ryanPwd, role: 'admin', name: 'Ryan' },
  });

  const partnerPwd = await bcrypt.hash('partner123', 10);
  const partner1User = await prisma.user.upsert({
    where: { email: 'mike@indyaccountants.com' },
    update: { password: partnerPwd, role: 'partner', name: 'Mike Patel' },
    create: { email: 'mike@indyaccountants.com', password: partnerPwd, role: 'partner', name: 'Mike Patel' },
  });
  const p1 = await prisma.referralPartner.upsert({
    where: { partnerCode: 'INDY-MIKE' },
    update: {},
    create: { userId: partner1User.id, name: 'Mike Patel', email: 'mike@indyaccountants.com', category: 'ACCOUNTANT', tier: 'SILVER', partnerCode: 'INDY-MIKE', company: 'Indy Accountants' },
  });
  const partner2User = await prisma.user.upsert({
    where: { email: 'sara@circlecitydev.com' },
    update: { password: partnerPwd, role: 'partner', name: 'Sara Lee' },
    create: { email: 'sara@circlecitydev.com', password: partnerPwd, role: 'partner', name: 'Sara Lee' },
  });
  const p2 = await prisma.referralPartner.upsert({
    where: { partnerCode: 'CIRCLE-SARA' },
    update: {},
    create: { userId: partner2User.id, name: 'Sara Lee', email: 'sara@circlecitydev.com', category: 'CONSULTANT', tier: 'BRONZE', partnerCode: 'CIRCLE-SARA', company: 'Circle City Dev' },
  });

  // Sample leads matching the schema shape (businessName, ownerName, industry required)
  const samples = [
    { businessName: 'Acme Tools', ownerName: 'Maya Patel', email: 'maya@acmetools.com', industry: 'OTHER', revenueRange: '5M-20M', currentMarketingSpend: '5000-10000', employeeCount: '16-50', city: 'Indianapolis', state: 'IN', source: 'WEB_FORM', status: 'DISCOVERY', score: 78, qualification: 'SQL', proposedTier: 'GROWTH_ENGINE', estimatedMRR: 2000 },
    { businessName: 'Blue River Auto', ownerName: 'Sam Cole', email: 'sam@blueriverauto.com', industry: 'OTHER', revenueRange: '1M-5M', currentMarketingSpend: '2000-5000', employeeCount: '16-50', city: 'Carmel', state: 'IN', source: 'REFERRAL', status: 'CONTACTED', referralPartnerId: p1.id, score: 65, qualification: 'MQL', proposedTier: 'GROWTH_ENGINE', estimatedMRR: 2000 },
    { businessName: 'Smith Dental', ownerName: 'Dr Smith', email: 'dr@smithdental.com', industry: 'DENTAL', revenueRange: '1M-5M', currentMarketingSpend: '2000-5000', employeeCount: '5-15', city: 'Fishers', state: 'IN', source: 'WEB_FORM', status: 'NEW', score: 58, qualification: 'MQL', proposedTier: 'LAUNCH_PAD', estimatedMRR: 750 },
    { businessName: 'Northside Law', ownerName: 'Pat Nguyen', email: 'partners@northsidelaw.com', industry: 'LEGAL', revenueRange: '1M-5M', currentMarketingSpend: '5000-10000', employeeCount: '16-50', city: 'Indianapolis', state: 'IN', source: 'CHAT_WIDGET', status: 'PROPOSAL', score: 72, qualification: 'SQL', proposedTier: 'GROWTH_ENGINE', estimatedMRR: 2000 },
    { businessName: 'IndyHomes Pro', ownerName: 'Lex Brooks', email: 'gm@indyhomespro.com', industry: 'PLUMBING', revenueRange: '1M-5M', currentMarketingSpend: '5000-10000', employeeCount: '16-50', city: 'Greenwood', state: 'IN', source: 'CSV_IMPORT', status: 'NEGOTIATION', score: 81, qualification: 'SQL', proposedTier: 'MARKET_DOMINATOR', estimatedMRR: 4000 },
    { businessName: 'Geist Wellness', ownerName: 'Ana Ruiz', email: 'owner@geistwellness.com', industry: 'OTHER', revenueRange: '500K-1M', currentMarketingSpend: '500-2000', employeeCount: '5-15', city: 'Fishers', state: 'IN', source: 'WEB_FORM', status: 'WON', score: 64, qualification: 'MQL', proposedTier: 'LAUNCH_PAD', estimatedMRR: 750, signedTier: 'LAUNCH_PAD', signedMRR: 750, wonAt: new Date() },
    { businessName: 'Rook Tech Parts', ownerName: 'Sandeep Rao', email: 'ops@rooktechparts.com', industry: 'OTHER', revenueRange: '5M-20M', currentMarketingSpend: '10000+', employeeCount: '51-150', city: 'Indianapolis', state: 'IN', source: 'REFERRAL', status: 'CONTACTED', referralPartnerId: p2.id, score: 88, qualification: 'SQL', proposedTier: 'MARKET_DOMINATOR', estimatedMRR: 4000 },
    { businessName: 'Hoosier Roofing', ownerName: 'Drew Cole', email: 'drew@hoosierroofing.com', industry: 'ROOFING', revenueRange: '1M-5M', currentMarketingSpend: '2000-5000', employeeCount: '16-50', city: 'Indianapolis', state: 'IN', source: 'WEB_FORM', status: 'NEW', score: 60, qualification: 'MQL', proposedTier: 'LAUNCH_PAD', estimatedMRR: 750 },
  ];

  for (const s of samples) {
    const exists = await prisma.lead.findFirst({ where: { email: s.email } });
    if (exists) continue;
    await prisma.lead.create({ data: { ...s, assignedToId: ryan.id } as any });
  }

  console.log('Seed complete');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

/**
 * Seed script — remplit la base avec des données réalistes pour le dev.
 *
 * Usage : bun db:seed
 *
 * Purge tout puis insère : refuges, chats, users, signalements (avec matchs
 * automatiquement calculés), favoris, candidatures.
 *
 * Mot de passe de tous les comptes de démo : motdepasse12
 */
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { adminDb as db } from "@infra/db";
import {
  users,
  accounts,
  sessions,
  verifications,
  shelters,
  pets,
  petPhotos,
  pensions,
  pensionPhotos,
  reports,
  reportPhotos,
  reportMatches,
  favorites,
  applications,
  notifications,
} from "@/server/db/schema";
import { refreshMatchesForReport } from "@lost-found/public";

// ─── Données réelles ────────────────────────────────────────────────────────

const CITIES = {
  paris: { lat: 48.8566, lng: 2.3522, label: "Paris" },
  lyon: { lat: 45.764, lng: 4.8357, label: "Lyon" },
  marseille: { lat: 43.2965, lng: 5.3698, label: "Marseille" },
  toulouse: { lat: 43.6045, lng: 1.4442, label: "Toulouse" },
  bordeaux: { lat: 44.8378, lng: -0.5792, label: "Bordeaux" },
} as const;

const CAT_IMG = {
  blackWhite: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80",
  greyKitten: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800&q=80",
  tabby: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80",
  grey: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&q=80",
  calico: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=800&q=80",
  sleeping: "https://images.unsplash.com/photo-1511044568932-338cba0ad803?w=800&q=80",
  black: "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&q=80",
  ginger: "https://images.unsplash.com/photo-1520315342629-6ea920342047?w=800&q=80",
  tabbyGrey: "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=800&q=80",
  orange: "https://images.unsplash.com/photo-1513245543132-31f507417b26?w=800&q=80",
  white: "https://images.unsplash.com/photo-1511275539165-cc46b1ee89bf?w=800&q=80",
  black2: "https://images.unsplash.com/photo-1491485880348-85d48a9e5312?w=800&q=80",
} as const;

const DOG_IMG = {
  golden: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80",
  berger: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
  labrador: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&q=80",
  puppy: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80",
  border: "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=800&q=80",
} as const;

// Visuels refuges (cover = bannière large ; logo = vignette carrée)
const SHELTER_IMG = {
  parisCover: "https://images.unsplash.com/photo-1568572933382-74d440642117?w=1200&q=80",
  parisLogo: "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400&q=80",
  lyonCover: "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=1200&q=80",
  lyonLogo: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400&q=80",
  marseilleCover: "https://images.unsplash.com/photo-1494256997604-768d1f608cac?w=1200&q=80",
  marseilleLogo: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&q=80",
  toulouseCover: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&q=80",
  toulouseLogo: "https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=400&q=80",
  bordeauxCover: "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=1200&q=80",
  bordeauxLogo: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=400&q=80",
} as const;

// Visuels pensions (insérés dans pension_photos)
const PENSION_IMG = {
  luberon1: "https://images.unsplash.com/photo-1611003229186-80e40cd54966?w=1200&q=80",
  luberon2: "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=1200&q=80",
  grandesFoulees1: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&q=80",
  grandesFoulees2: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=80",
  arche1: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&q=80",
  arche2: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1200&q=80",
} as const;

// Petit offset aléatoire en degrés (± ~2 km) autour d'un point
function jitter(coord: number, radiusDeg = 0.02): number {
  return coord + (Math.random() - 0.5) * 2 * radiusDeg;
}

function point(lng: number, lat: number) {
  return sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)` as never;
}

// ─── Création des users via les tables auth ─────────────────────────────────

async function createUser({
  email,
  name,
  phone,
}: {
  email: string;
  name: string;
  phone?: string;
}): Promise<{ id: string }> {
  const [u] = await db
    .insert(users)
    .values({ email, name, phone, emailVerified: true })
    .returning({ id: users.id });
  const userId = u!.id;
  const hash = await hashPassword("motdepasse12");
  await db.insert(accounts).values({
    userId,
    accountId: userId,
    providerId: "credential",
    password: hash,
  });
  return { id: userId };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧹 Nettoyage de la base...");
  await db.delete(notifications);
  await db.delete(reportMatches);
  await db.delete(applications);
  await db.delete(favorites);
  await db.delete(reportPhotos);
  await db.delete(reports);
  await db.delete(petPhotos);
  await db.delete(pets);
  await db.delete(pensionPhotos);
  await db.delete(pensions);
  // users.shelter_id et users.pension_id → onDelete: set null, donc on peut
  // supprimer shelters et pensions après les users.
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(verifications);
  await db.delete(users);
  await db.delete(shelters);

  // ─── Refuges ─────────────────────────────────────────────────────────────
  console.log("🏠 Refuges...");
  const [shelterParis] = await db
    .insert(shelters)
    .values({
      name: "Chats Libres de Paris",
      slug: "chats-libres-paris",
      description:
        "Association qui recueille les chats errants parisiens depuis 2012. Stérilisation, soins et placement en famille.",
      missionLong:
        "Tout a commencé en 2012 avec une colonie de chats rue des Vinaigriers. Depuis, nos bénévoles identifient, stérilisent et placent les chats errants du 10e arrondissement. Nous travaillons main dans la main avec les vétérinaires du quartier et une vingtaine de familles d'accueil. Chaque chat que nous confions à l'adoption a été stérilisé, identifié, vacciné et testé FIV/FeLV. Nous accompagnons les adoptants sur le long terme : conseils, suivi, et reprise en cas de problème.",
      foundedYear: 2012,
      visitHours:
        "Du mardi au samedi, 14h–18h\nDimanche : uniquement sur rendez-vous\nFermé le lundi",
      donationUrl: "https://www.helloasso.com/associations/chats-libres-paris",
      address: "15 rue des Vinaigriers, 75010 Paris",
      location: point(CITIES.paris.lng, CITIES.paris.lat),
      phone: "01 42 00 00 00",
      email: "contact@chatslibres-paris.fr",
      website: "https://chatslibres-paris.fr",
      logoUrl: SHELTER_IMG.parisLogo,
      coverUrl: SHELTER_IMG.parisCover,
      isVerified: true,
    })
    .returning();

  const [shelterLyon] = await db
    .insert(shelters)
    .values({
      name: "Refuge du Rhône",
      slug: "refuge-du-rhone",
      description:
        "Notre refuge accueille chats et chatons en attente d'une nouvelle famille aimante.",
      missionLong:
        "Fondé en 1998 par une poignée de bénévoles lyonnais, le Refuge du Rhône accueille aujourd'hui une centaine de chats en permanence. Notre approche : remettre les chats en confiance avant tout placement. Beaucoup arrivent traumatisés, craintifs, parfois blessés. Nos familles d'accueil prennent le temps qu'il faut. Les adoptions se font après une visite du refuge et un entretien. Nous ne faisons pas de placement sur dossier en ligne uniquement.",
      foundedYear: 1998,
      visitHours:
        "Mercredi, samedi et dimanche : 10h–17h\nEn semaine : sur rendez-vous",
      donationUrl: "https://refuge-rhone.fr/soutenir",
      address: "42 chemin de la Croix-Rousse, 69004 Lyon",
      location: point(CITIES.lyon.lng, CITIES.lyon.lat),
      phone: "04 78 00 00 00",
      email: "adoption@refuge-rhone.fr",
      logoUrl: SHELTER_IMG.lyonLogo,
      coverUrl: SHELTER_IMG.lyonCover,
      isVerified: true,
    })
    .returning();

  const [shelterMarseille] = await db
    .insert(shelters)
    .values({
      name: "Les 9 Vies",
      slug: "les-9-vies",
      description:
        "Association marseillaise dédiée au sauvetage et à l'adoption de chats abandonnés.",
      missionLong:
        "Les 9 Vies, c'est une équipe de 15 bénévoles qui sillonne les calanques et les quartiers de Marseille pour repérer les chats errants. Chaque mois, nous stérilisons une quarantaine de chats grâce à nos partenaires vétérinaires. Les plus jeunes ou les plus socialisables sont proposés à l'adoption. Les autres repartent sur leur territoire, identifiés et pris en charge par notre réseau de nourrisseurs.",
      foundedYear: 2016,
      visitHours:
        "Samedi : 14h–18h\nSur rendez-vous en semaine",
      donationUrl: "https://www.helloasso.com/associations/les-9-vies",
      address: "7 rue de la Canebière, 13001 Marseille",
      location: point(CITIES.marseille.lng, CITIES.marseille.lat),
      phone: "04 91 00 00 00",
      email: "contact@les9vies.org",
      logoUrl: SHELTER_IMG.marseilleLogo,
      coverUrl: SHELTER_IMG.marseilleCover,
      isVerified: false,
    })
    .returning();

  const [shelterToulouse] = await db
    .insert(shelters)
    .values({
      name: "La Patounerie",
      slug: "la-patounerie",
      description:
        "Petit refuge familial toulousain. Chaque chat recueilli passe en famille d'accueil avant adoption.",
      missionLong:
        "La Patounerie, c'est avant tout une maison : la nôtre, agrandie année après année pour accueillir les chats. Nous ne sommes que trois bénévoles à temps plein, mais nous comptons sur une douzaine de familles d'accueil pour couvrir Toulouse et sa banlieue. Notre spécialité : les chats difficiles à placer — seniors, chats avec antécédents médicaux, duos inséparables. Pour eux, la famille d'accueil est souvent la vraie solution.",
      foundedYear: 2020,
      visitHours:
        "Sur rendez-vous uniquement\nLes chats vivent en famille d'accueil, nous organisons les rencontres au cas par cas",
      donationUrl: "https://www.lapatounerie.fr/dons",
      address: "12 avenue des Minimes, 31200 Toulouse",
      location: point(CITIES.toulouse.lng, CITIES.toulouse.lat),
      phone: "05 61 00 00 00",
      logoUrl: SHELTER_IMG.toulouseLogo,
      coverUrl: SHELTER_IMG.toulouseCover,
      isVerified: true,
    })
    .returning();

  const [shelterBordeaux] = await db
    .insert(shelters)
    .values({
      name: "Association Matou",
      slug: "association-matou",
      description:
        "Bénévoles bordelais au service des chats sans domicile. Soins vétérinaires, identification, stérilisation.",
      missionLong:
        "Association Matou intervient sur toute la Gironde depuis 2009. Nous gérons une quarantaine de colonies de chats libres, stérilisés et identifiés au nom de l'association. Nous plaçons uniquement les chatons et les adultes sociables qui ne peuvent retourner sur leur territoire. Notre ligne : la stérilisation avant tout — c'est la seule façon de ne plus voir des portées entières arriver dans les refuges chaque printemps.",
      foundedYear: 2009,
      visitHours:
        "Vendredi : 16h–19h\nSamedi : 10h–17h\nDimanche : 14h–17h",
      donationUrl: "https://www.helloasso.com/associations/association-matou",
      address: "3 cours Victor Hugo, 33000 Bordeaux",
      location: point(CITIES.bordeaux.lng, CITIES.bordeaux.lat),
      phone: "05 56 00 00 00",
      email: "adoption@matou-bordeaux.fr",
      logoUrl: SHELTER_IMG.bordeauxLogo,
      coverUrl: SHELTER_IMG.bordeauxCover,
      isVerified: true,
    })
    .returning();

  console.log("   5 refuges créés");

  // ─── Users ───────────────────────────────────────────────────────────────
  console.log("👤 Utilisateurs...");
  const adminParis = await createUser({
    email: "admin-paris@dorloter.fr",
    name: "Claire Martin",
    phone: "06 10 00 00 01",
  });
  const adminLyon = await createUser({
    email: "admin-lyon@dorloter.fr",
    name: "Thomas Dubois",
    phone: "06 10 00 00 02",
  });
  const adminToulouse = await createUser({
    email: "admin-toulouse@dorloter.fr",
    name: "Sophie Laurent",
    phone: "06 10 00 00 03",
  });

  // Promotion des admins refuge
  await db.execute(sql`
    UPDATE users SET role = 'shelter_admin', shelter_id = ${shelterParis!.id}
    WHERE id = ${adminParis.id}
  `);
  await db.execute(sql`
    UPDATE users SET role = 'shelter_admin', shelter_id = ${shelterLyon!.id}
    WHERE id = ${adminLyon.id}
  `);
  await db.execute(sql`
    UPDATE users SET role = 'shelter_admin', shelter_id = ${shelterToulouse!.id}
    WHERE id = ${adminToulouse.id}
  `);

  // Adoptants / signaleurs
  const alice = await createUser({
    email: "alice@dorloter.fr",
    name: "Alice Durand",
    phone: "06 20 00 00 01",
  });
  const bob = await createUser({
    email: "bob@dorloter.fr",
    name: "Bob Leroy",
    phone: "06 20 00 00 02",
  });
  const camille = await createUser({
    email: "camille@dorloter.fr",
    name: "Camille Petit",
    phone: "06 20 00 00 03",
  });
  const david = await createUser({
    email: "david@dorloter.fr",
    name: "David Moreau",
    phone: "06 20 00 00 04",
  });
  const emma = await createUser({
    email: "emma@dorloter.fr",
    name: "Emma Garcia",
    phone: "06 20 00 00 05",
  });

  // Platform admin — modération + vérification refuges
  const platformAdmin = await createUser({
    email: "admin@dorloter.fr",
    name: "Admin Dorloter",
  });
  await db.execute(sql`
    UPDATE users SET role = 'platform_admin'
    WHERE id = ${platformAdmin.id}
  `);

  console.log(
    "   9 utilisateurs créés (1 platform_admin + 3 shelter_admin + 5 adoptants)"
  );

  // ─── Chats à adopter ─────────────────────────────────────────────────────
  console.log("🐈 Chats à adopter...");
  const catSeedData = [
    // Paris
    {
      shelterId: shelterParis!.id,
      name: "Mistigri",
      description:
        "Chat câlin et pot de colle, adore les siestes sur les genoux. Parfait pour un appartement.",
      breed: "Européen",
      color: "Noir et blanc",
      sex: "male" as const,
      ageCategory: "adulte" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "inconnu" as const,
      okWithChildren: "oui" as const,
      indoorOnly: true,
      adoptionFee: "100.00",
      photo: CAT_IMG.blackWhite,
    },
    {
      shelterId: shelterParis!.id,
      name: "Caramel",
      description:
        "Chaton joueur et curieux, né en novembre 2025. Cherche une famille active.",
      breed: "Européen",
      color: "Roux",
      sex: "male" as const,
      ageCategory: "chaton" as const,
      isSterilized: false,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "oui" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "80.00",
      photo: CAT_IMG.ginger,
    },
    {
      shelterId: shelterParis!.id,
      name: "Pixel",
      description:
        "Chatte timide au début, très attachante quand elle prend confiance. Idéale pour un foyer calme.",
      breed: "Européen",
      color: "Grise tabby",
      sex: "femelle" as const,
      ageCategory: "jeune" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "non" as const,
      okWithChildren: "inconnu" as const,
      adoptionFee: "90.00",
      photo: CAT_IMG.tabbyGrey,
    },
    {
      shelterId: shelterParis!.id,
      name: "Princesse",
      description:
        "Senior adorable qui cherche un foyer paisible pour ses vieux jours. A vécu en famille.",
      breed: "Européen",
      color: "Calico",
      sex: "femelle" as const,
      ageCategory: "senior" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "inconnu" as const,
      okWithDogs: "inconnu" as const,
      okWithChildren: "oui" as const,
      indoorOnly: true,
      specialNeeds: "Régime alimentaire spécial senior (rein).",
      adoptionFee: "50.00",
      photo: CAT_IMG.calico,
    },
    // Lyon
    {
      shelterId: shelterLyon!.id,
      name: "Nougat",
      description:
        "Beau matou tout gris, très affectueux et bavard. Cherche une famille qui l'écoute.",
      breed: "Chartreux",
      color: "Gris",
      sex: "male" as const,
      ageCategory: "adulte" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "inconnu" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "120.00",
      photo: CAT_IMG.grey,
    },
    {
      shelterId: shelterLyon!.id,
      name: "Tigrou",
      description:
        "Jeune mâle plein d'énergie, adore les jeux. Besoin d'espace et de stimulation.",
      breed: "Européen",
      color: "Tigré brun",
      sex: "male" as const,
      ageCategory: "jeune" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "oui" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "100.00",
      photo: CAT_IMG.tabby,
    },
    {
      shelterId: shelterLyon!.id,
      name: "Lune",
      description:
        "Petite chatte noire au caractère doux. Ronronne à la moindre caresse.",
      breed: "Européen",
      color: "Noire",
      sex: "femelle" as const,
      ageCategory: "jeune" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "inconnu" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "90.00",
      photo: CAT_IMG.black,
    },
    // Marseille
    {
      shelterId: shelterMarseille!.id,
      name: "Bambou",
      description:
        "Chaton de 4 mois trouvé dans un carton. Sociable avec tout le monde.",
      breed: "Européen",
      color: "Gris",
      sex: "male" as const,
      ageCategory: "chaton" as const,
      isSterilized: false,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "inconnu" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "80.00",
      photo: CAT_IMG.greyKitten,
    },
    {
      shelterId: shelterMarseille!.id,
      name: "Zélie",
      description:
        "Chatte toute blanche, un peu sauvage mais très intelligente. Apprivoisement en cours.",
      breed: "Européen",
      color: "Blanche",
      sex: "femelle" as const,
      ageCategory: "adulte" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "non" as const,
      okWithChildren: "non" as const,
      adoptionFee: "70.00",
      photo: CAT_IMG.white,
    },
    // Toulouse
    {
      shelterId: shelterToulouse!.id,
      name: "Plume",
      description:
        "Chatte câline et posée, aime les longues siestes au soleil. Parfaite pour un foyer tranquille.",
      breed: "Européen",
      color: "Calico",
      sex: "femelle" as const,
      ageCategory: "adulte" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "inconnu" as const,
      okWithDogs: "inconnu" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "110.00",
      photo: CAT_IMG.sleeping,
    },
    {
      shelterId: shelterToulouse!.id,
      name: "Oscar",
      description:
        "Mâle roux magnifique, 3 ans, très dégourdi. Adore observer les oiseaux à la fenêtre.",
      breed: "Européen",
      color: "Roux",
      sex: "male" as const,
      ageCategory: "adulte" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "oui" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "110.00",
      photo: CAT_IMG.orange,
    },
    // Bordeaux
    {
      shelterId: shelterBordeaux!.id,
      name: "Félix",
      description:
        "Europoéen noir classique, très affectueux, suit son humain partout.",
      breed: "Européen",
      color: "Noir",
      sex: "male" as const,
      ageCategory: "adulte" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "oui" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "100.00",
      photo: CAT_IMG.black2,
    },
    {
      shelterId: shelterBordeaux!.id,
      name: "Neige",
      description:
        "Chatonne blanche de 3 mois, pleine de vie. Cherche un foyer patient pour apprendre.",
      breed: "Européen",
      color: "Blanche",
      sex: "femelle" as const,
      ageCategory: "chaton" as const,
      isSterilized: false,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "inconnu" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "80.00",
      photo: CAT_IMG.white,
    },
  ];

  const insertedCats: { id: string; photo: string }[] = [];
  for (const pet of catSeedData) {
    const { photo, ...values } = pet;
    const [c] = await db
      .insert(pets)
      .values({ ...values, species: "chat" as const })
      .returning({ id: pets.id });
    insertedCats.push({ id: c!.id, photo });
  }

  // ─── Chiens ──────────────────────────────────────────────────────────────
  const dogSeedData = [
    {
      shelterId: shelterParis!.id,
      name: "Nala",
      description:
        "Golden retriever de 4 ans, douce et patiente. Parfaite en appartement, adore les balades en forêt.",
      breed: "Golden retriever",
      color: "Fauve",
      sex: "femelle" as const,
      ageCategory: "adulte" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "oui" as const,
      okWithDogs: "oui" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "200.00",
      photo: DOG_IMG.golden,
    },
    {
      shelterId: shelterLyon!.id,
      name: "Max",
      description:
        "Berger croisé, 6 ans. Arrivé après un abandon. Très loyal, a besoin d'une famille présente.",
      breed: "Berger croisé",
      color: "Noir et feu",
      sex: "male" as const,
      ageCategory: "adulte" as const,
      isSterilized: true,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "inconnu" as const,
      okWithDogs: "oui" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "150.00",
      photo: DOG_IMG.berger,
    },
    {
      shelterId: shelterMarseille!.id,
      name: "Luna",
      description:
        "Labrador chocolat, 3 ans. Énergique, sportive, adore l'eau. Cherche des maîtres actifs.",
      breed: "Labrador",
      color: "Chocolat",
      sex: "femelle" as const,
      ageCategory: "jeune" as const,
      isSterilized: false,
      isChipped: true,
      isVaccinated: true,
      okWithCats: "non" as const,
      okWithDogs: "oui" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "180.00",
      photo: DOG_IMG.labrador,
    },
    {
      shelterId: shelterToulouse!.id,
      name: "Pompon",
      description:
        "Chiot croisé de 5 mois, découvre le monde. Devra être éduqué et sociabilisé progressivement.",
      breed: "Croisé",
      color: "Tricolore",
      sex: "male" as const,
      ageCategory: "chaton" as const,
      isSterilized: false,
      isChipped: true,
      isVaccinated: false,
      okWithCats: "inconnu" as const,
      okWithDogs: "oui" as const,
      okWithChildren: "oui" as const,
      adoptionFee: "120.00",
      photo: DOG_IMG.puppy,
    },
  ];

  const insertedDogs: { id: string; photo: string }[] = [];
  for (const pet of dogSeedData) {
    const { photo, ...values } = pet;
    const [d] = await db
      .insert(pets)
      .values({ ...values, species: "chien" as const })
      .returning({ id: pets.id });
    insertedDogs.push({ id: d!.id, photo });
  }

  await db.insert(petPhotos).values(
    [...insertedCats, ...insertedDogs].map((p) => ({
      petId: p.id,
      url: p.photo,
      isPrimary: true,
      order: 0,
    }))
  );
  console.log(
    `   ${insertedCats.length} chats + ${insertedDogs.length} chiens créés avec photos`
  );

  // ─── Favoris ─────────────────────────────────────────────────────────────
  console.log("❤️  Favoris...");
  await db.insert(favorites).values([
    { userId: alice.id, petId: insertedCats[0]!.id },
    { userId: alice.id, petId: insertedCats[4]!.id },
    { userId: bob.id, petId: insertedCats[1]!.id },
    { userId: camille.id, petId: insertedCats[2]!.id },
    { userId: camille.id, petId: insertedCats[8]!.id },
    { userId: david.id, petId: insertedCats[9]!.id },
  ]);

  // ─── Candidatures ────────────────────────────────────────────────────────
  console.log("📋 Candidatures...");
  await db.insert(applications).values([
    {
      petId: insertedCats[0]!.id,
      userId: alice.id,
      housingType: "appartement",
      hasOutdoorAccess: false,
      hasChildren: false,
      experience: "J'ai eu deux chats dans mon enfance.",
      motivation:
        "Je cherche un compagnon calme pour mon appartement parisien. Mistigri a l'air parfait pour moi.",
      availability: "Disponible pour une rencontre le week-end.",
      status: "en_cours",
    },
    {
      petId: insertedCats[1]!.id,
      userId: bob.id,
      housingType: "maison",
      hasOutdoorAccess: true,
      hasChildren: true,
      childrenAges: "6 et 9 ans",
      experience: "Nous avons toujours eu des animaux à la maison.",
      motivation: "Nos enfants rêvent d'un chaton, Caramel serait un choix magnifique.",
      availability: "Soirs et week-ends.",
      status: "envoyee",
    },
    {
      petId: insertedCats[4]!.id,
      userId: alice.id,
      housingType: "appartement",
      hasOutdoorAccess: false,
      hasChildren: false,
      motivation:
        "Nougat m'a tapé dans l'œil, j'adore son caractère bavard d'après la description.",
      status: "envoyee",
    },
  ]);

  // ─── Signalements perdus/trouvés ─────────────────────────────────────────
  console.log("🔎 Signalements perdus/trouvés...");
  const now = new Date();
  const d = (daysAgo: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split("T")[0]!;
  };

  // Pair 1 : Paris — perdu proche d'un trouvé (doit matcher fortement)
  const [perduParis] = await db
    .insert(reports)
    .values({
      userId: alice.id,
      type: "perdu",
      species: "chat",
      petName: "Minette",
      description:
        "Chatte noire et blanche, pucée, très craintive. Disparue du 10e arrondissement.",
      breed: "Européen",
      color: "Noir et blanc",
      sex: "femelle",
      isChipped: true,
      chipNumber: "250269802457892",
      distinctiveSigns: "Petite tache blanche en forme de cœur sur le flanc droit.",
      location: point(
        jitter(CITIES.paris.lng, 0.005),
        jitter(CITIES.paris.lat, 0.005)
      ),
      address: "Rue des Vinaigriers, 75010 Paris",
      dateEvent: d(3),
      contactPhone: "06 20 00 00 01",
      contactEmail: "alice@dorloter.fr",
    })
    .returning();

  const [trouveParis] = await db
    .insert(reports)
    .values({
      userId: bob.id,
      type: "trouve",
      species: "chat",
      description:
        "Chatte noire et blanche trouvée près du canal Saint-Martin. Elle est craintive mais semble socialisée.",
      breed: "Européen",
      color: "Noir et blanc",
      sex: "inconnu",
      isChipped: false,
      distinctiveSigns: "Tache blanche sur le flanc.",
      location: point(
        jitter(CITIES.paris.lng + 0.003, 0.002),
        jitter(CITIES.paris.lat + 0.003, 0.002)
      ),
      address: "Quai de Valmy, 75010 Paris",
      dateEvent: d(1),
      contactPhone: "06 20 00 00 02",
      contactEmail: "bob@dorloter.fr",
    })
    .returning();

  // Pair 2 : Lyon — moins fort mais devrait quand même matcher
  const [perduLyon] = await db
    .insert(reports)
    .values({
      userId: camille.id,
      type: "perdu",
      species: "chat",
      petName: "Grisou",
      description: "Mâle gris, 4 ans, pucé. A fugué depuis le balcon.",
      breed: "Européen",
      color: "Gris",
      sex: "male",
      isChipped: true,
      location: point(
        jitter(CITIES.lyon.lng, 0.008),
        jitter(CITIES.lyon.lat, 0.008)
      ),
      address: "Croix-Rousse, 69004 Lyon",
      dateEvent: d(10),
      contactPhone: "06 20 00 00 03",
    })
    .returning();

  const [trouveLyon] = await db
    .insert(reports)
    .values({
      userId: david.id,
      type: "trouve",
      species: "chat",
      description:
        "Chat gris trouvé dans une cour intérieure, il miaule beaucoup. Semble habitué aux humains.",
      breed: "Européen",
      color: "Gris",
      sex: "male",
      isChipped: false,
      location: point(
        jitter(CITIES.lyon.lng - 0.01, 0.004),
        jitter(CITIES.lyon.lat - 0.01, 0.004)
      ),
      address: "Rue Masséna, 69006 Lyon",
      dateEvent: d(5),
      contactEmail: "david@dorloter.fr",
    })
    .returning();

  // Signalement isolé — pas de match attendu
  const [perduMarseille] = await db
    .insert(reports)
    .values({
      userId: emma.id,
      type: "perdu",
      species: "chat",
      petName: "Câline",
      description:
        "Femelle calico, très douce. Perdue lors d'un déménagement hier.",
      breed: "Européen",
      color: "Calico",
      sex: "femelle",
      isChipped: true,
      location: point(
        jitter(CITIES.marseille.lng, 0.02),
        jitter(CITIES.marseille.lat, 0.02)
      ),
      address: "Vieux-Port, 13002 Marseille",
      dateEvent: d(1),
      contactPhone: "06 20 00 00 05",
    })
    .returning();

  // Autres signalements pour peupler la map
  const [trouveToulouse] = await db
    .insert(reports)
    .values({
      userId: alice.id,
      type: "trouve",
      species: "chat",
      description:
        "Chaton roux trouvé au pied d'un arbre, très affectueux. Cherche son propriétaire.",
      breed: "Européen",
      color: "Roux",
      sex: "inconnu",
      isChipped: false,
      location: point(
        jitter(CITIES.toulouse.lng, 0.015),
        jitter(CITIES.toulouse.lat, 0.015)
      ),
      address: "Place du Capitole, 31000 Toulouse",
      dateEvent: d(2),
      contactEmail: "alice@dorloter.fr",
    })
    .returning();

  const [perduBordeaux] = await db
    .insert(reports)
    .values({
      userId: bob.id,
      type: "perdu",
      species: "chat",
      petName: "Mocha",
      description:
        "Chatte tigrée brune et blanche, 2 ans. Disparue depuis une sortie au jardin.",
      breed: "Européen",
      color: "Tigré brun",
      sex: "femelle",
      isChipped: true,
      location: point(
        jitter(CITIES.bordeaux.lng, 0.02),
        jitter(CITIES.bordeaux.lat, 0.02)
      ),
      address: "Chartrons, 33300 Bordeaux",
      dateEvent: d(7),
      contactPhone: "06 20 00 00 02",
    })
    .returning();

  // Photo pour chaque signalement
  const reportPhotoMap: Array<[string, string]> = [
    [perduParis!.id, CAT_IMG.blackWhite],
    [trouveParis!.id, CAT_IMG.blackWhite],
    [perduLyon!.id, CAT_IMG.grey],
    [trouveLyon!.id, CAT_IMG.grey],
    [perduMarseille!.id, CAT_IMG.calico],
    [trouveToulouse!.id, CAT_IMG.ginger],
    [perduBordeaux!.id, CAT_IMG.tabby],
  ];
  await db.insert(reportPhotos).values(
    reportPhotoMap.map(([reportId, url]) => ({
      reportId,
      url,
      isPrimary: true,
      order: 0,
    }))
  );
  console.log(`   ${reportPhotoMap.length} signalements créés avec photos`);

  // ─── Pensions ────────────────────────────────────────────────────────────
  console.log("🏡 Pensions...");
  const insertedPensions = await db.insert(pensions).values([
    {
      name: "Pension féline du Luberon",
      slug: "pension-feline-luberon",
      description:
        "Pension 100 % chats dans une bastide provençale. Chambres individuelles avec terrasse sécurisée côté jardin, personnel vétérinaire à demeure. On ne mélange jamais les familles entre elles — chaque chat reste dans son propre espace.",
      siret: "89012345600014",
      agrementNumber: "84-2021-CC-0042",
      address: "Chemin des Oliviers, 84400 Gargas",
      location: point(5.2667, 43.9167),
      phone: "04 90 00 10 10",
      email: "contact@pension-luberon.fr",
      website: "https://pension-luberon.fr",
      acceptsCats: true,
      acceptsDogs: false,
      capacityCats: 18,
      pricePerDayCat: "19.00",
      services: {
        medication: true,
        grooming: false,
        outdoorAccess: true,
        nightStaff: true,
        transport: false,
        senior: true,
      },
      openingHours: "Lun-Sam 9h-12h et 15h-18h\nDimanche sur rendez-vous",
      isVerified: true,
    },
    {
      name: "Les Grandes Foulées",
      slug: "les-grandes-foulees",
      description:
        "Pension canine à la campagne, 4 hectares clôturés. Promenades en forêt matin et soir, éducation positive, activités canines. Accueil adapté aux chiens actifs comme aux seniors tranquilles.",
      siret: "81234567800023",
      agrementNumber: "69-2019-CC-0117",
      address: "2345 route de Mornant, 69440 Saint-Laurent-d'Agny",
      location: point(4.6833, 45.6333),
      phone: "04 78 00 22 22",
      email: "accueil@grandesfoulees.fr",
      acceptsCats: false,
      acceptsDogs: true,
      capacityDogs: 30,
      pricePerDayDog: "26.00",
      services: {
        medication: true,
        grooming: true,
        outdoorAccess: true,
        nightStaff: true,
        transport: true,
        senior: true,
      },
      openingHours:
        "Lun-Ven 8h-11h et 16h-19h\nSam 9h-12h\nFermé le dimanche",
      isVerified: true,
    },
    {
      name: "L'Arche des Moustaches",
      slug: "arche-des-moustaches",
      description:
        "Structure familiale qui accueille chats et chiens de petite taille. Philosophie maison : peu de places, attention individualisée, sorties quotidiennes pour les chiens, salle de jeu chauffée pour les chats.",
      siret: "79876543200019",
      agrementNumber: "33-2022-CC-0088",
      address: "17 chemin du Pouyau, 33650 Cabanac-et-Villagrains",
      location: point(-0.5789, 44.6489),
      phone: "05 56 00 33 33",
      email: "hello@arche-moustaches.fr",
      acceptsCats: true,
      acceptsDogs: true,
      capacityCats: 8,
      capacityDogs: 6,
      pricePerDayCat: "17.00",
      pricePerDayDog: "24.00",
      services: {
        medication: true,
        grooming: false,
        outdoorAccess: true,
        nightStaff: false,
        transport: false,
        senior: true,
      },
      openingHours: "Tous les jours 8h-10h et 17h-19h",
      isVerified: true,
    },
  ]).returning({ id: pensions.id, slug: pensions.slug });

  // Galerie pour chaque pension (1 cover + 1 photo additionnelle)
  const pensionPhotosBySlug: Record<string, string[]> = {
    "pension-feline-luberon": [PENSION_IMG.luberon1, PENSION_IMG.luberon2],
    "les-grandes-foulees": [
      PENSION_IMG.grandesFoulees1,
      PENSION_IMG.grandesFoulees2,
    ],
    "arche-des-moustaches": [PENSION_IMG.arche1, PENSION_IMG.arche2],
  };
  for (const p of insertedPensions) {
    const urls = pensionPhotosBySlug[p.slug] ?? [];
    if (urls.length === 0) continue;
    await db.insert(pensionPhotos).values(
      urls.map((url, i) => ({
        pensionId: p.id,
        url,
        isPrimary: i === 0,
        order: i,
      }))
    );
  }
  console.log("   3 pensions créées (avec galerie)");

  // ─── Matching ────────────────────────────────────────────────────────────
  console.log("🧩 Calcul des correspondances...");
  const allReports = [
    perduParis!,
    trouveParis!,
    perduLyon!,
    trouveLyon!,
    perduMarseille!,
    trouveToulouse!,
    perduBordeaux!,
  ];
  let totalMatches = 0;
  for (const r of allReports) {
    totalMatches += (await refreshMatchesForReport(r)).length;
  }
  console.log(`   ${totalMatches} correspondances calculées`);

  // ─── Résumé ──────────────────────────────────────────────────────────────
  console.log("\n✅ Seed terminé !\n");
  console.log("Comptes de test (mot de passe : motdepasse12)");
  console.log("  Admin plateforme :");
  console.log("    • admin@dorloter.fr           (modération + vérification refuges)");
  console.log("  Admins refuge :");
  console.log("    • admin-paris@dorloter.fr     (Chats Libres de Paris)");
  console.log("    • admin-lyon@dorloter.fr      (Refuge du Rhône)");
  console.log("    • admin-toulouse@dorloter.fr  (La Patounerie)");
  console.log("  Adoptants / signaleurs :");
  console.log("    • alice@dorloter.fr");
  console.log("    • bob@dorloter.fr");
  console.log("    • camille@dorloter.fr");
  console.log("    • david@dorloter.fr");
  console.log("    • emma@dorloter.fr");
}

main()
  .then(() => {
    console.log("\n👋 Bye !");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Seed échoué :", err);
    process.exit(1);
  });

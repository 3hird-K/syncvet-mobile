export interface PhLocation {
  barangay: string;
  cityOrMunicipality: string;
  province: string;
  region: string;
  zipCode?: string;
  fullLocation: string;
}

export const PHILIPPINE_LOCATIONS: PhLocation[] = [
  // =========================================================================
  // REGION X - MISAMIS ORIENTAL: CAGAYAN DE ORO CITY (COMPLETE BARANGAYS)
  // =========================================================================
  { barangay: 'Carmen', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Carmen, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Nazareth', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Nazareth, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Lapasan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Lapasan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Macasandig', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Macasandig, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Bulua', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Bulua, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Kauswagan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Kauswagan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Balulang', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Balulang, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Lumbia', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Lumbia, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Gusa', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Gusa, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Patag', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Patag, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Iponan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Iponan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Canitoan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Canitoan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Cugman', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Cugman, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Tablon', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Tablon, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Bugo', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Bugo, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Puerto', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Puerto, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Agusan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Agusan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Bayabas', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Bayabas, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Bonbon', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Bonbon, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Macabalan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Macabalan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Puntod', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Puntod, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Consolacion', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Consolacion, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Camaman-an', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Camaman-an, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Pagatpat', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Pagatpat, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Indahag', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Indahag, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Dansolihon', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Dansolihon, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'San Simon', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'San Simon, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Balubal', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Balubal, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'F.S. Catanico', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'F.S. Catanico, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Baikingon', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Baikingon, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Bayanga', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Bayanga, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Mambuaya', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Mambuaya, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Taglimao', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Taglimao, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Tagpangi', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Tagpangi, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Tuburan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Tuburan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Tumpagon', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Tumpagon, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Pigsag-an', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Pigsag-an, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Tignapoloan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Tignapoloan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Besigan', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Besigan, Cagayan de Oro City, Misamis Oriental' },
  { barangay: 'Poblacion (Barangays 1-40)', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Poblacion, Cagayan de Oro City, Misamis Oriental' },

  // =========================================================================
  // REGION X - MISAMIS ORIENTAL: ALL 23 MUNICIPALITIES & 2 COMPONENT CITIES
  // =========================================================================
  // Opol
  { barangay: 'Barra', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Barra, Opol, Misamis Oriental' },
  { barangay: 'Igpit', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Igpit, Opol, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Poblacion, Opol, Misamis Oriental' },
  { barangay: 'Bonbon', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Bonbon, Opol, Misamis Oriental' },
  { barangay: 'Taboc', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Taboc, Opol, Misamis Oriental' },
  { barangay: 'Malanang', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Malanang, Opol, Misamis Oriental' },
  { barangay: 'Luyong Bonbon', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Luyong Bonbon, Opol, Misamis Oriental' },

  // El Salvador City
  { barangay: 'Poblacion', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Poblacion, El Salvador City, Misamis Oriental' },
  { barangay: 'Molugan', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Molugan, El Salvador City, Misamis Oriental' },
  { barangay: 'Cogon', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Cogon, El Salvador City, Misamis Oriental' },
  { barangay: 'Taytay', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Taytay, El Salvador City, Misamis Oriental' },
  { barangay: 'Amoros', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Amoros, El Salvador City, Misamis Oriental' },
  { barangay: 'Sinaloc', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Sinaloc, El Salvador City, Misamis Oriental' },
  { barangay: 'Kibonbon', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Kibonbon, El Salvador City, Misamis Oriental' },

  // Alubijid
  { barangay: 'Poblacion', cityOrMunicipality: 'Alubijid', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9018', fullLocation: 'Poblacion, Alubijid, Misamis Oriental' },
  { barangay: 'Baybay', cityOrMunicipality: 'Alubijid', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9018', fullLocation: 'Baybay, Alubijid, Misamis Oriental' },
  { barangay: 'Calatcat', cityOrMunicipality: 'Alubijid', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9018', fullLocation: 'Calatcat, Alubijid, Misamis Oriental' },
  { barangay: 'Loguilo', cityOrMunicipality: 'Alubijid', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9018', fullLocation: 'Loguilo, Alubijid, Misamis Oriental' },
  { barangay: 'Lourdes', cityOrMunicipality: 'Alubijid', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9018', fullLocation: 'Lourdes, Alubijid, Misamis Oriental' },

  // Laguindingan
  { barangay: 'Poblacion', cityOrMunicipality: 'Laguindingan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9019', fullLocation: 'Poblacion, Laguindingan, Misamis Oriental' },
  { barangay: 'Moog', cityOrMunicipality: 'Laguindingan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9019', fullLocation: 'Moog, Laguindingan, Misamis Oriental' },
  { barangay: 'Mauswagon', cityOrMunicipality: 'Laguindingan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9019', fullLocation: 'Mauswagon, Laguindingan, Misamis Oriental' },
  { barangay: 'Tubajon', cityOrMunicipality: 'Laguindingan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9019', fullLocation: 'Tubajon, Laguindingan, Misamis Oriental' },

  // Gitagum
  { barangay: 'Poblacion', cityOrMunicipality: 'Gitagum', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9020', fullLocation: 'Poblacion, Gitagum, Misamis Oriental' },
  { barangay: 'Matangad', cityOrMunicipality: 'Gitagum', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9020', fullLocation: 'Matangad, Gitagum, Misamis Oriental' },
  { barangay: 'Pangayawan', cityOrMunicipality: 'Gitagum', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9020', fullLocation: 'Pangayawan, Gitagum, Misamis Oriental' },

  // Libertad
  { barangay: 'Poblacion', cityOrMunicipality: 'Libertad', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9021', fullLocation: 'Poblacion, Libertad, Misamis Oriental' },
  { barangay: 'Gimaylan', cityOrMunicipality: 'Libertad', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9021', fullLocation: 'Gimaylan, Libertad, Misamis Oriental' },
  { barangay: 'Dulong', cityOrMunicipality: 'Libertad', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9021', fullLocation: 'Dulong, Libertad, Misamis Oriental' },

  // Initao
  { barangay: 'Poblacion', cityOrMunicipality: 'Initao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9022', fullLocation: 'Poblacion, Initao, Misamis Oriental' },
  { barangay: 'Jampason', cityOrMunicipality: 'Initao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9022', fullLocation: 'Jampason, Initao, Misamis Oriental' },
  { barangay: 'Tubigan', cityOrMunicipality: 'Initao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9022', fullLocation: 'Tubigan, Initao, Misamis Oriental' },
  { barangay: 'Pagahan', cityOrMunicipality: 'Initao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9022', fullLocation: 'Pagahan, Initao, Misamis Oriental' },

  // Naawan
  { barangay: 'Poblacion', cityOrMunicipality: 'Naawan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9023', fullLocation: 'Poblacion, Naawan, Misamis Oriental' },
  { barangay: 'Linangkayan', cityOrMunicipality: 'Naawan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9023', fullLocation: 'Linangkayan, Naawan, Misamis Oriental' },
  { barangay: 'Mat-i', cityOrMunicipality: 'Naawan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9023', fullLocation: 'Mat-i, Naawan, Misamis Oriental' },

  // Manticao
  { barangay: 'Poblacion', cityOrMunicipality: 'Manticao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9024', fullLocation: 'Poblacion, Manticao, Misamis Oriental' },
  { barangay: 'Tuod', cityOrMunicipality: 'Manticao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9024', fullLocation: 'Tuod, Manticao, Misamis Oriental' },
  { barangay: 'Punta Silum', cityOrMunicipality: 'Manticao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9024', fullLocation: 'Punta Silum, Manticao, Misamis Oriental' },

  // Lugait
  { barangay: 'Poblacion', cityOrMunicipality: 'Lugait', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9025', fullLocation: 'Poblacion, Lugait, Misamis Oriental' },
  { barangay: 'Biga', cityOrMunicipality: 'Lugait', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9025', fullLocation: 'Biga, Lugait, Misamis Oriental' },
  { barangay: 'Aya-Aya', cityOrMunicipality: 'Lugait', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9025', fullLocation: 'Aya-Aya, Lugait, Misamis Oriental' },

  // Tagoloan
  { barangay: 'Poblacion', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Poblacion, Tagoloan, Misamis Oriental' },
  { barangay: 'Baluarte', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Baluarte, Tagoloan, Misamis Oriental' },
  { barangay: 'Casinglot', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Casinglot, Tagoloan, Misamis Oriental' },
  { barangay: 'Santa Cruz', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Santa Cruz, Tagoloan, Misamis Oriental' },
  { barangay: 'Natumolan', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Natumolan, Tagoloan, Misamis Oriental' },
  { barangay: 'Santa Ana', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Santa Ana, Tagoloan, Misamis Oriental' },
  { barangay: 'Mohon', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Mohon, Tagoloan, Misamis Oriental' },

  // Villanueva
  { barangay: 'Poblacion', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Poblacion, Villanueva, Misamis Oriental' },
  { barangay: 'Katipunan', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Katipunan, Villanueva, Misamis Oriental' },
  { barangay: 'Balacanas', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Balacanas, Villanueva, Misamis Oriental' },
  { barangay: 'Dayawan', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Dayawan, Villanueva, Misamis Oriental' },
  { barangay: 'San Martin', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'San Martin, Villanueva, Misamis Oriental' },
  { barangay: 'Looc', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Looc, Villanueva, Misamis Oriental' },

  // Jasaan
  { barangay: 'Poblacion', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Poblacion, Jasaan, Misamis Oriental' },
  { barangay: 'Aplaya', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Aplaya, Jasaan, Misamis Oriental' },
  { barangay: 'Solana', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Solana, Jasaan, Misamis Oriental' },
  { barangay: 'Upper Jasaan', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Upper Jasaan, Jasaan, Misamis Oriental' },
  { barangay: 'Bobontugan', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Bobontugan, Jasaan, Misamis Oriental' },
  { barangay: 'Kimaya', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Kimaya, Jasaan, Misamis Oriental' },

  // Claveria
  { barangay: 'Poblacion', cityOrMunicipality: 'Claveria', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9004', fullLocation: 'Poblacion, Claveria, Misamis Oriental' },
  { barangay: 'Mat-I', cityOrMunicipality: 'Claveria', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9004', fullLocation: 'Mat-I, Claveria, Misamis Oriental' },
  { barangay: 'Ane-i', cityOrMunicipality: 'Claveria', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9004', fullLocation: 'Ane-i, Claveria, Misamis Oriental' },
  { barangay: 'Cabacungan', cityOrMunicipality: 'Claveria', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9004', fullLocation: 'Cabacungan, Claveria, Misamis Oriental' },
  { barangay: 'Luna', cityOrMunicipality: 'Claveria', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9004', fullLocation: 'Luna, Claveria, Misamis Oriental' },

  // Balingasag
  { barangay: 'Poblacion', cityOrMunicipality: 'Balingasag', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9005', fullLocation: 'Poblacion, Balingasag, Misamis Oriental' },
  { barangay: 'Baliwagan', cityOrMunicipality: 'Balingasag', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9005', fullLocation: 'Baliwagan, Balingasag, Misamis Oriental' },
  { barangay: 'Linggangao', cityOrMunicipality: 'Balingasag', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9005', fullLocation: 'Linggangao, Balingasag, Misamis Oriental' },
  { barangay: 'Hermano', cityOrMunicipality: 'Balingasag', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9005', fullLocation: 'Hermano, Balingasag, Misamis Oriental' },

  // Lagonglong
  { barangay: 'Poblacion', cityOrMunicipality: 'Lagonglong', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9006', fullLocation: 'Poblacion, Lagonglong, Misamis Oriental' },
  { barangay: 'Dampil', cityOrMunicipality: 'Lagonglong', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9006', fullLocation: 'Dampil, Lagonglong, Misamis Oriental' },
  { barangay: 'Gaston', cityOrMunicipality: 'Lagonglong', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9006', fullLocation: 'Gaston, Lagonglong, Misamis Oriental' },

  // Salay
  { barangay: 'Poblacion', cityOrMunicipality: 'Salay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9007', fullLocation: 'Poblacion, Salay, Misamis Oriental' },
  { barangay: 'Casulog', cityOrMunicipality: 'Salay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9007', fullLocation: 'Casulog, Salay, Misamis Oriental' },
  { barangay: 'Inobulan', cityOrMunicipality: 'Salay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9007', fullLocation: 'Inobulan, Salay, Misamis Oriental' },

  // Sugbongcogon
  { barangay: 'Poblacion', cityOrMunicipality: 'Sugbongcogon', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9008', fullLocation: 'Poblacion, Sugbongcogon, Misamis Oriental' },
  { barangay: 'Ampianga', cityOrMunicipality: 'Sugbongcogon', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9008', fullLocation: 'Ampianga, Sugbongcogon, Misamis Oriental' },

  // Kinoguitan
  { barangay: 'Poblacion', cityOrMunicipality: 'Kinoguitan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9009', fullLocation: 'Poblacion, Kinoguitan, Misamis Oriental' },
  { barangay: 'Binuangan', cityOrMunicipality: 'Kinoguitan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9009', fullLocation: 'Binuangan, Kinoguitan, Misamis Oriental' },
  { barangay: 'Esperanza', cityOrMunicipality: 'Kinoguitan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9009', fullLocation: 'Esperanza, Kinoguitan, Misamis Oriental' },

  // Balingoan
  { barangay: 'Poblacion', cityOrMunicipality: 'Balingoan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9011', fullLocation: 'Poblacion, Balingoan, Misamis Oriental' },
  { barangay: 'Mantangale', cityOrMunicipality: 'Balingoan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9011', fullLocation: 'Mantangale, Balingoan, Misamis Oriental' },
  { barangay: 'Lapinig', cityOrMunicipality: 'Balingoan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9011', fullLocation: 'Lapinig, Balingoan, Misamis Oriental' },

  // Talisayan
  { barangay: 'Poblacion', cityOrMunicipality: 'Talisayan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9012', fullLocation: 'Poblacion, Talisayan, Misamis Oriental' },
  { barangay: 'Bugdang', cityOrMunicipality: 'Talisayan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9012', fullLocation: 'Bugdang, Talisayan, Misamis Oriental' },
  { barangay: 'San Jose', cityOrMunicipality: 'Talisayan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9012', fullLocation: 'San Jose, Talisayan, Misamis Oriental' },

  // Medina
  { barangay: 'Poblacion', cityOrMunicipality: 'Medina', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9013', fullLocation: 'Poblacion, Medina, Misamis Oriental' },
  { barangay: 'Duka', cityOrMunicipality: 'Medina', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9013', fullLocation: 'Duka, Medina, Misamis Oriental' },
  { barangay: 'Portulin', cityOrMunicipality: 'Medina', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9013', fullLocation: 'Portulin, Medina, Misamis Oriental' },
  { barangay: 'Bangbang', cityOrMunicipality: 'Medina', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9013', fullLocation: 'Bangbang, Medina, Misamis Oriental' },

  // Gingoog City
  { barangay: 'Poblacion', cityOrMunicipality: 'Gingoog City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9014', fullLocation: 'Poblacion, Gingoog City, Misamis Oriental' },
  { barangay: 'Daan-Lungsod', cityOrMunicipality: 'Gingoog City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9014', fullLocation: 'Daan-Lungsod, Gingoog City, Misamis Oriental' },
  { barangay: 'Lunao', cityOrMunicipality: 'Gingoog City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9014', fullLocation: 'Lunao, Gingoog City, Misamis Oriental' },
  { barangay: 'Anakan', cityOrMunicipality: 'Gingoog City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9014', fullLocation: 'Anakan, Gingoog City, Misamis Oriental' },
  { barangay: 'Agay-ayan', cityOrMunicipality: 'Gingoog City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9014', fullLocation: 'Agay-ayan, Gingoog City, Misamis Oriental' },
  { barangay: 'San Juan', cityOrMunicipality: 'Gingoog City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9014', fullLocation: 'San Juan, Gingoog City, Misamis Oriental' },

  // Magsaysay
  { barangay: 'Poblacion', cityOrMunicipality: 'Magsaysay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9015', fullLocation: 'Poblacion, Magsaysay, Misamis Oriental' },
  { barangay: 'Artadi', cityOrMunicipality: 'Magsaysay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9015', fullLocation: 'Artadi, Magsaysay, Misamis Oriental' },
  { barangay: 'Consuelo', cityOrMunicipality: 'Magsaysay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9015', fullLocation: 'Consuelo, Magsaysay, Misamis Oriental' },
  { barangay: 'Kibungsod', cityOrMunicipality: 'Magsaysay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9015', fullLocation: 'Kibungsod, Magsaysay, Misamis Oriental' },

  // Binuangan
  { barangay: 'Poblacion', cityOrMunicipality: 'Binuangan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9010', fullLocation: 'Poblacion, Binuangan, Misamis Oriental' },
  { barangay: 'Mabini', cityOrMunicipality: 'Binuangan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9010', fullLocation: 'Mabini, Binuangan, Misamis Oriental' },
  { barangay: 'Valdeconcha', cityOrMunicipality: 'Binuangan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9010', fullLocation: 'Valdeconcha, Binuangan, Misamis Oriental' },

  // =========================================================================
  // REGION X - NORTHERN MINDANAO (BUKIDNON, LANAO DEL NORTE, MISAMIS OCCIDENTAL, CAMIGUIN)
  // =========================================================================
  // Bukidnon
  { barangay: 'Poblacion', cityOrMunicipality: 'Manolo Fortich', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8703', fullLocation: 'Poblacion, Manolo Fortich, Bukidnon' },
  { barangay: 'Alae', cityOrMunicipality: 'Manolo Fortich', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8703', fullLocation: 'Alae, Manolo Fortich, Bukidnon' },
  { barangay: 'Damilag', cityOrMunicipality: 'Manolo Fortich', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8703', fullLocation: 'Damilag, Manolo Fortich, Bukidnon' },
  { barangay: 'Tankulan', cityOrMunicipality: 'Manolo Fortich', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8703', fullLocation: 'Tankulan, Manolo Fortich, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Malaybalay City', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8700', fullLocation: 'Poblacion, Malaybalay City, Bukidnon' },
  { barangay: 'Casisang', cityOrMunicipality: 'Malaybalay City', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8700', fullLocation: 'Casisang, Malaybalay City, Bukidnon' },
  { barangay: 'Sumpong', cityOrMunicipality: 'Malaybalay City', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8700', fullLocation: 'Sumpong, Malaybalay City, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Valencia City', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8709', fullLocation: 'Poblacion, Valencia City, Bukidnon' },
  { barangay: 'Bagontaas', cityOrMunicipality: 'Valencia City', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8709', fullLocation: 'Bagontaas, Valencia City, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Maramag', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8714', fullLocation: 'Poblacion, Maramag, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Quezon', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8715', fullLocation: 'Poblacion, Quezon, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Libona', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8706', fullLocation: 'Poblacion, Libona, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Baungon', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8707', fullLocation: 'Poblacion, Baungon, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Talakag', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8708', fullLocation: 'Poblacion, Talakag, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Sumilao', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8701', fullLocation: 'Poblacion, Sumilao, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Impasug-ong', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8702', fullLocation: 'Poblacion, Impasug-ong, Bukidnon' },

  // Lanao del Norte & Iligan City
  { barangay: 'Poblacion', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Poblacion, Iligan City, Lanao del Norte' },
  { barangay: 'Tibanga', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Tibanga, Iligan City, Lanao del Norte' },
  { barangay: 'Tubod', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Tubod, Iligan City, Lanao del Norte' },
  { barangay: 'Suarez', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Suarez, Iligan City, Lanao del Norte' },
  { barangay: 'Pala-o', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Pala-o, Iligan City, Lanao del Norte' },
  { barangay: 'Del Carmen', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Del Carmen, Iligan City, Lanao del Norte' },
  { barangay: 'Hinaplanon', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Hinaplanon, Iligan City, Lanao del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tubod', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9209', fullLocation: 'Poblacion, Tubod, Lanao del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Kapatagan', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9214', fullLocation: 'Poblacion, Kapatagan, Lanao del Norte' },

  // Misamis Occidental
  { barangay: 'Poblacion', cityOrMunicipality: 'Ozamiz City', province: 'Misamis Occidental', region: 'Region X (Northern Mindanao)', zipCode: '7200', fullLocation: 'Poblacion, Ozamiz City, Misamis Occidental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Oroquieta City', province: 'Misamis Occidental', region: 'Region X (Northern Mindanao)', zipCode: '7207', fullLocation: 'Poblacion, Oroquieta City, Misamis Occidental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X (Northern Mindanao)', zipCode: '7214', fullLocation: 'Poblacion, Tangub City, Misamis Occidental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Clarin', province: 'Misamis Occidental', region: 'Region X (Northern Mindanao)', zipCode: '7201', fullLocation: 'Poblacion, Clarin, Misamis Occidental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Plaridel', province: 'Misamis Occidental', region: 'Region X (Northern Mindanao)', zipCode: '7209', fullLocation: 'Poblacion, Plaridel, Misamis Occidental' },

  // Camiguin
  { barangay: 'Poblacion', cityOrMunicipality: 'Mambajao', province: 'Camiguin', region: 'Region X (Northern Mindanao)', zipCode: '9100', fullLocation: 'Poblacion, Mambajao, Camiguin' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Catarman', province: 'Camiguin', region: 'Region X (Northern Mindanao)', zipCode: '9104', fullLocation: 'Poblacion, Catarman, Camiguin' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Mahinog', province: 'Camiguin', region: 'Region X (Northern Mindanao)', zipCode: '9101', fullLocation: 'Poblacion, Mahinog, Camiguin' },

  // =========================================================================
  // NATIONAL CAPITAL REGION (NCR / METRO MANILA)
  // =========================================================================
  { barangay: 'Batasan Hills', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1126', fullLocation: 'Batasan Hills, Quezon City, Metro Manila' },
  { barangay: 'Diliman', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1101', fullLocation: 'Diliman, Quezon City, Metro Manila' },
  { barangay: 'Commonwealth', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1121', fullLocation: 'Commonwealth, Quezon City, Metro Manila' },
  { barangay: 'Cubao', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1109', fullLocation: 'Cubao, Quezon City, Metro Manila' },
  { barangay: 'Fairview', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1118', fullLocation: 'Fairview, Quezon City, Metro Manila' },
  { barangay: 'Novaliches', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1123', fullLocation: 'Novaliches, Quezon City, Metro Manila' },
  { barangay: 'Tondo', cityOrMunicipality: 'City of Manila', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1012', fullLocation: 'Tondo, City of Manila, Metro Manila' },
  { barangay: 'Sampaloc', cityOrMunicipality: 'City of Manila', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1008', fullLocation: 'Sampaloc, City of Manila, Metro Manila' },
  { barangay: 'Malate', cityOrMunicipality: 'City of Manila', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1004', fullLocation: 'Malate, City of Manila, Metro Manila' },
  { barangay: 'Ermita', cityOrMunicipality: 'City of Manila', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1000', fullLocation: 'Ermita, City of Manila, Metro Manila' },
  { barangay: 'Santa Cruz', cityOrMunicipality: 'City of Manila', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1014', fullLocation: 'Santa Cruz, City of Manila, Metro Manila' },
  { barangay: 'Fort Bonifacio (BGC)', cityOrMunicipality: 'Taguig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1630', fullLocation: 'BGC, Taguig City, Metro Manila' },
  { barangay: 'Ususan', cityOrMunicipality: 'Taguig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1632', fullLocation: 'Ususan, Taguig City, Metro Manila' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Makati City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1210', fullLocation: 'Poblacion, Makati City, Metro Manila' },
  { barangay: 'Bel-Air', cityOrMunicipality: 'Makati City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1209', fullLocation: 'Bel-Air, Makati City, Metro Manila' },
  { barangay: 'San Lorenzo', cityOrMunicipality: 'Makati City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1223', fullLocation: 'San Lorenzo, Makati City, Metro Manila' },
  { barangay: 'Ortigas Center (San Antonio)', cityOrMunicipality: 'Pasig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1605', fullLocation: 'Ortigas Center, Pasig City, Metro Manila' },
  { barangay: 'Kapasigan', cityOrMunicipality: 'Pasig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1600', fullLocation: 'Kapasigan, Pasig City, Metro Manila' },
  { barangay: 'Highway Hills', cityOrMunicipality: 'Mandaluyong City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1550', fullLocation: 'Highway Hills, Mandaluyong City, Metro Manila' },
  { barangay: 'BF Homes', cityOrMunicipality: 'Parañaque City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1720', fullLocation: 'BF Homes, Parañaque City, Metro Manila' },
  { barangay: 'Baclaran', cityOrMunicipality: 'Parañaque City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1702', fullLocation: 'Baclaran, Parañaque City, Metro Manila' },
  { barangay: 'Alabang', cityOrMunicipality: 'Muntinlupa City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1780', fullLocation: 'Alabang, Muntinlupa City, Metro Manila' },
  { barangay: 'Ayala Alabang', cityOrMunicipality: 'Muntinlupa City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1780', fullLocation: 'Ayala Alabang, Muntinlupa City, Metro Manila' },
  { barangay: 'Pamplona', cityOrMunicipality: 'Las Piñas City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1740', fullLocation: 'Pamplona, Las Piñas City, Metro Manila' },
  { barangay: 'Concepcion', cityOrMunicipality: 'Marikina City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1807', fullLocation: 'Concepcion, Marikina City, Metro Manila' },
  { barangay: 'Greenhills', cityOrMunicipality: 'San Juan City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1502', fullLocation: 'Greenhills, San Juan City, Metro Manila' },
  { barangay: 'Monumento (Grace Park)', cityOrMunicipality: 'Caloocan City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1400', fullLocation: 'Grace Park, Caloocan City, Metro Manila' },
  { barangay: 'Malinta', cityOrMunicipality: 'Valenzuela City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1440', fullLocation: 'Malinta, Valenzuela City, Metro Manila' },

  // =========================================================================
  // REGION IV-A (CALABARZON) & REGION III (CENTRAL LUZON)
  // =========================================================================
  { barangay: 'Poblacion', cityOrMunicipality: 'Antipolo City', province: 'Rizal', region: 'Region IV-A (CALABARZON)', zipCode: '1870', fullLocation: 'Poblacion, Antipolo City, Rizal' },
  { barangay: 'San Roque', cityOrMunicipality: 'Antipolo City', province: 'Rizal', region: 'Region IV-A (CALABARZON)', zipCode: '1870', fullLocation: 'San Roque, Antipolo City, Rizal' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Imus City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4103', fullLocation: 'Poblacion, Imus City, Cavite' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Bacoor City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4102', fullLocation: 'Poblacion, Bacoor City, Cavite' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Dasmariñas City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4114', fullLocation: 'Poblacion, Dasmariñas City, Cavite' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tagaytay City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4120', fullLocation: 'Poblacion, Tagaytay City, Cavite' },
  { barangay: 'Balibago', cityOrMunicipality: 'Santa Rosa City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4026', fullLocation: 'Balibago, Santa Rosa City, Laguna' },
  { barangay: 'Crossing (Poblacion)', cityOrMunicipality: 'Calamba City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4027', fullLocation: 'Poblacion, Calamba City, Laguna' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Biñan City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4024', fullLocation: 'Poblacion, Biñan City, Laguna' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Batangas City', province: 'Batangas', region: 'Region IV-A (CALABARZON)', zipCode: '4200', fullLocation: 'Poblacion, Batangas City, Batangas' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Lipa City', province: 'Batangas', region: 'Region IV-A (CALABARZON)', zipCode: '4217', fullLocation: 'Poblacion, Lipa City, Batangas' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Lucena City', province: 'Quezon', region: 'Region IV-A (CALABARZON)', zipCode: '4301', fullLocation: 'Poblacion, Lucena City, Quezon' },
  { barangay: 'Balibago', cityOrMunicipality: 'Angeles City', province: 'Pampanga', region: 'Region III (Central Luzon)', zipCode: '2009', fullLocation: 'Balibago, Angeles City, Pampanga' },
  { barangay: 'Dolores', cityOrMunicipality: 'City of San Fernando', province: 'Pampanga', region: 'Region III (Central Luzon)', zipCode: '2000', fullLocation: 'Dolores, City of San Fernando, Pampanga' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Malolos City', province: 'Bulacan', region: 'Region III (Central Luzon)', zipCode: '3000', fullLocation: 'Poblacion, Malolos City, Bulacan' },
  { barangay: 'Poblacion', cityOrMunicipality: 'San Jose del Monte City', province: 'Bulacan', region: 'Region III (Central Luzon)', zipCode: '3023', fullLocation: 'Poblacion, San Jose del Monte City, Bulacan' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Cabanatuan City', province: 'Nueva Ecija', region: 'Region III (Central Luzon)', zipCode: '3100', fullLocation: 'Poblacion, Cabanatuan City, Nueva Ecija' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tarlac City', province: 'Tarlac', region: 'Region III (Central Luzon)', zipCode: '2300', fullLocation: 'Poblacion, Tarlac City, Tarlac' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Olongapo City', province: 'Zambales', region: 'Region III (Central Luzon)', zipCode: '2200', fullLocation: 'Poblacion, Olongapo City, Zambales' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Balanga City', province: 'Bataan', region: 'Region III (Central Luzon)', zipCode: '2100', fullLocation: 'Poblacion, Balanga City, Bataan' },

  // =========================================================================
  // REGION I, II, CAR, MIMAROPA, BICOL (OTHER LUZON HUBS)
  // =========================================================================
  { barangay: 'Session Road', cityOrMunicipality: 'Baguio City', province: 'Benguet', region: 'CAR (Cordillera)', zipCode: '2600', fullLocation: 'Session Road, Baguio City, Benguet' },
  { barangay: 'Burnham - Legarda', cityOrMunicipality: 'Baguio City', province: 'Benguet', region: 'CAR (Cordillera)', zipCode: '2600', fullLocation: 'Burnham, Baguio City, Benguet' },
  { barangay: 'Poblacion', cityOrMunicipality: 'La Trinidad', province: 'Benguet', region: 'CAR (Cordillera)', zipCode: '2601', fullLocation: 'Poblacion, La Trinidad, Benguet' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Laoag City', province: 'Ilocos Norte', region: 'Region I (Ilocos Region)', zipCode: '2900', fullLocation: 'Poblacion, Laoag City, Ilocos Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Vigan City', province: 'Ilocos Sur', region: 'Region I (Ilocos Region)', zipCode: '2700', fullLocation: 'Poblacion, Vigan City, Ilocos Sur' },
  { barangay: 'Poblacion', cityOrMunicipality: 'San Fernando City', province: 'La Union', region: 'Region I (Ilocos Region)', zipCode: '2500', fullLocation: 'Poblacion, San Fernando City, La Union' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Dagupan City', province: 'Pangasinan', region: 'Region I (Ilocos Region)', zipCode: '2400', fullLocation: 'Poblacion, Dagupan City, Pangasinan' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tuguegarao City', province: 'Cagayan', region: 'Region II (Cagayan Valley)', zipCode: '3500', fullLocation: 'Poblacion, Tuguegarao City, Cagayan' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Santiago City', province: 'Isabela', region: 'Region II (Cagayan Valley)', zipCode: '3311', fullLocation: 'Poblacion, Santiago City, Isabela' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Puerto Princesa City', province: 'Palawan', region: 'Region IV-B (MIMAROPA)', zipCode: '5300', fullLocation: 'Poblacion, Puerto Princesa City, Palawan' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Calapan City', province: 'Oriental Mindoro', region: 'Region IV-B (MIMAROPA)', zipCode: '5200', fullLocation: 'Poblacion, Calapan City, Oriental Mindoro' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Legazpi City', province: 'Albay', region: 'Region V (Bicol Region)', zipCode: '4500', fullLocation: 'Poblacion, Legazpi City, Albay' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Naga City', province: 'Camarines Sur', region: 'Region V (Bicol Region)', zipCode: '4400', fullLocation: 'Poblacion, Naga City, Camarines Sur' },

  // =========================================================================
  // REGION VII (CENTRAL VISAYAS) - CEBU, BOHOL, NEGROS ORIENTAL
  // =========================================================================
  { barangay: 'Lahug', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Lahug, Cebu City, Cebu' },
  { barangay: 'Mabolo', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Mabolo, Cebu City, Cebu' },
  { barangay: 'Guadalupe', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Guadalupe, Cebu City, Cebu' },
  { barangay: 'Banilad', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Banilad, Cebu City, Cebu' },
  { barangay: 'Kasambagan', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Kasambagan, Cebu City, Cebu' },
  { barangay: 'Capitol Site', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Capitol Site, Cebu City, Cebu' },
  { barangay: 'Subangdaku', cityOrMunicipality: 'Mandaue City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6014', fullLocation: 'Subangdaku, Mandaue City, Cebu' },
  { barangay: 'Tipolo', cityOrMunicipality: 'Mandaue City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6014', fullLocation: 'Tipolo, Mandaue City, Cebu' },
  { barangay: 'Basak', cityOrMunicipality: 'Lapu-Lapu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6015', fullLocation: 'Basak, Lapu-Lapu City, Cebu' },
  { barangay: 'Pusok', cityOrMunicipality: 'Lapu-Lapu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6015', fullLocation: 'Pusok, Lapu-Lapu City, Cebu' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Talisay City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6045', fullLocation: 'Poblacion, Talisay City, Cebu' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tagbilaran City', province: 'Bohol', region: 'Region VII (Central Visayas)', zipCode: '6300', fullLocation: 'Poblacion, Tagbilaran City, Bohol' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Dumaguete City', province: 'Negros Oriental', region: 'Region VII (Central Visayas)', zipCode: '6200', fullLocation: 'Poblacion, Dumaguete City, Negros Oriental' },

  // =========================================================================
  // REGION VI & VIII - WESTERN & EASTERN VISAYAS
  // =========================================================================
  { barangay: 'Mandurriao', cityOrMunicipality: 'Iloilo City', province: 'Iloilo', region: 'Region VI (Western Visayas)', zipCode: '5000', fullLocation: 'Mandurriao, Iloilo City, Iloilo' },
  { barangay: 'Jaro', cityOrMunicipality: 'Iloilo City', province: 'Iloilo', region: 'Region VI (Western Visayas)', zipCode: '5000', fullLocation: 'Jaro, Iloilo City, Iloilo' },
  { barangay: 'La Paz', cityOrMunicipality: 'Iloilo City', province: 'Iloilo', region: 'Region VI (Western Visayas)', zipCode: '5000', fullLocation: 'La Paz, Iloilo City, Iloilo' },
  { barangay: 'Mandalagan', cityOrMunicipality: 'Bacolod City', province: 'Negros Occidental', region: 'Region VI (Western Visayas)', zipCode: '6100', fullLocation: 'Mandalagan, Bacolod City, Negros Occidental' },
  { barangay: 'Villamonte', cityOrMunicipality: 'Bacolod City', province: 'Negros Occidental', region: 'Region VI (Western Visayas)', zipCode: '6100', fullLocation: 'Villamonte, Bacolod City, Negros Occidental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Roxas City', province: 'Capiz', region: 'Region VI (Western Visayas)', zipCode: '5800', fullLocation: 'Poblacion, Roxas City, Capiz' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Kalibo', province: 'Aklan', region: 'Region VI (Western Visayas)', zipCode: '5600', fullLocation: 'Poblacion, Kalibo, Aklan' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tacloban City', province: 'Leyte', region: 'Region VIII (Eastern Visayas)', zipCode: '6500', fullLocation: 'Poblacion, Tacloban City, Leyte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Ormoc City', province: 'Leyte', region: 'Region VIII (Eastern Visayas)', zipCode: '6541', fullLocation: 'Poblacion, Ormoc City, Leyte' },

  // =========================================================================
  // REGION XI, XII, IX, XIII & BARMM - MINDANAO REGIONS
  // =========================================================================
  { barangay: 'Poblacion', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Poblacion, Davao City, Davao del Sur' },
  { barangay: 'Buhangin', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Buhangin, Davao City, Davao del Sur' },
  { barangay: 'Matina', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Matina, Davao City, Davao del Sur' },
  { barangay: 'Talomo', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Talomo, Davao City, Davao del Sur' },
  { barangay: 'Bajada (J.P. Laurel)', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Bajada, Davao City, Davao del Sur' },
  { barangay: 'Lanang', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Lanang, Davao City, Davao del Sur' },
  { barangay: 'Toril', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Toril, Davao City, Davao del Sur' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tagum City', province: 'Davao del Norte', region: 'Region XI (Davao Region)', zipCode: '8100', fullLocation: 'Poblacion, Tagum City, Davao del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Digos City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8002', fullLocation: 'Poblacion, Digos City, Davao del Sur' },
  { barangay: 'Dadiangas (Poblacion)', cityOrMunicipality: 'General Santos City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)', zipCode: '9500', fullLocation: 'Dadiangas, General Santos City, South Cotabato' },
  { barangay: 'Lagao', cityOrMunicipality: 'General Santos City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)', zipCode: '9500', fullLocation: 'Lagao, General Santos City, South Cotabato' },
  { barangay: 'Calumpang', cityOrMunicipality: 'General Santos City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)', zipCode: '9500', fullLocation: 'Calumpang, General Santos City, South Cotabato' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Koronadal City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)', zipCode: '9506', fullLocation: 'Poblacion, Koronadal City, South Cotabato' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7000', fullLocation: 'Poblacion, Zamboanga City, Zamboanga del Sur' },
  { barangay: 'Tetuan', cityOrMunicipality: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7000', fullLocation: 'Tetuan, Zamboanga City, Zamboanga del Sur' },
  { barangay: 'Pasonanca', cityOrMunicipality: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7000', fullLocation: 'Pasonanca, Zamboanga City, Zamboanga del Sur' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Pagadian City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7016', fullLocation: 'Poblacion, Pagadian City, Zamboanga del Sur' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Dipolog City', province: 'Zamboanga del Norte', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7100', fullLocation: 'Poblacion, Dipolog City, Zamboanga del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Butuan City', province: 'Agusan del Norte', region: 'Region XIII (Caraga)', zipCode: '8600', fullLocation: 'Poblacion, Butuan City, Agusan del Norte' },
  { barangay: 'Libertad', cityOrMunicipality: 'Butuan City', province: 'Agusan del Norte', region: 'Region XIII (Caraga)', zipCode: '8600', fullLocation: 'Libertad, Butuan City, Agusan del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Surigao City', province: 'Surigao del Norte', region: 'Region XIII (Caraga)', zipCode: '8400', fullLocation: 'Poblacion, Surigao City, Surigao del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Cotabato City', province: 'Maguindanao del Norte', region: 'BARMM (Bangsamoro)', zipCode: '9600', fullLocation: 'Poblacion, Cotabato City, Maguindanao del Norte' },
];

export const MISAMIS_ORIENTAL_LOCATIONS = PHILIPPINE_LOCATIONS.filter(
  (loc) => loc.province === 'Misamis Oriental',
);

/** Fast, intelligent search with ranking for Philippine locations */
export function searchPhilippineLocations(query: string, maxResults = 25): PhLocation[] {
  const clean = query.toLowerCase().trim();
  if (!clean) {
    // Default: Top Misamis Oriental & CDO locations
    return PHILIPPINE_LOCATIONS.slice(0, maxResults);
  }

  const terms = clean.split(/[\s,]+/).filter(Boolean);

  const scored = PHILIPPINE_LOCATIONS.map((loc) => {
    let score = 0;
    const bar = loc.barangay.toLowerCase();
    const city = loc.cityOrMunicipality.toLowerCase();
    const prov = loc.province.toLowerCase();
    const full = loc.fullLocation.toLowerCase();

    for (const term of terms) {
      if (bar === term) score += 60;
      else if (bar.startsWith(term)) score += 35;
      else if (bar.includes(term)) score += 20;

      if (city.startsWith(term)) score += 30;
      else if (city.includes(term)) score += 18;

      if (prov.startsWith(term)) score += 25;
      else if (prov.includes(term)) score += 12;

      if (full.includes(term)) score += 10;
    }

    // Boost exact phrase match
    if (full.includes(clean)) {
      score += 50;
    }

    // Priority boost for Misamis Oriental & Region X
    if (loc.province === 'Misamis Oriental') {
      score += 15;
    }

    return { loc, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.loc);
}

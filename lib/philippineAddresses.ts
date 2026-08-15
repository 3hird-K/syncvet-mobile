export interface PhLocation {
  barangay: string;
  cityOrMunicipality: string;
  province: string;
  region: string;
  zipCode?: string;
  fullLocation: string;
}

export const PHILIPPINE_LOCATIONS: PhLocation[] = [
  // ==========================================
  // REGION X - MISAMIS ORIENTAL (CAGAYAN DE ORO & MUNICIPALITIES)
  // ==========================================
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
  { barangay: 'Poblacion (Barangays 1-40)', cityOrMunicipality: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9000', fullLocation: 'Poblacion, Cagayan de Oro City, Misamis Oriental' },

  // Misamis Oriental Municipalities & Cities
  { barangay: 'Barra', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Barra, Opol, Misamis Oriental' },
  { barangay: 'Igpit', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Igpit, Opol, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Poblacion, Opol, Misamis Oriental' },
  { barangay: 'Bonbon', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Bonbon, Opol, Misamis Oriental' },
  { barangay: 'Taboc', cityOrMunicipality: 'Opol', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9016', fullLocation: 'Taboc, Opol, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Poblacion, El Salvador City, Misamis Oriental' },
  { barangay: 'Molugan', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Molugan, El Salvador City, Misamis Oriental' },
  { barangay: 'Cogon', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Cogon, El Salvador City, Misamis Oriental' },
  { barangay: 'Taytay', cityOrMunicipality: 'El Salvador City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9017', fullLocation: 'Taytay, El Salvador City, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Alubijid', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9018', fullLocation: 'Poblacion, Alubijid, Misamis Oriental' },
  { barangay: 'Baybay', cityOrMunicipality: 'Alubijid', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9018', fullLocation: 'Baybay, Alubijid, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Laguindingan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9019', fullLocation: 'Poblacion, Laguindingan, Misamis Oriental' },
  { barangay: 'Moog', cityOrMunicipality: 'Laguindingan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9019', fullLocation: 'Moog, Laguindingan, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Gitagum', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9020', fullLocation: 'Poblacion, Gitagum, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Libertad', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9021', fullLocation: 'Poblacion, Libertad, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Initao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9022', fullLocation: 'Poblacion, Initao, Misamis Oriental' },
  { barangay: 'Jampason', cityOrMunicipality: 'Initao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9022', fullLocation: 'Jampason, Initao, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Naawan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9023', fullLocation: 'Poblacion, Naawan, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Manticao', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9024', fullLocation: 'Poblacion, Manticao, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Lugait', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9025', fullLocation: 'Poblacion, Lugait, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Poblacion, Tagoloan, Misamis Oriental' },
  { barangay: 'Baluarte', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Baluarte, Tagoloan, Misamis Oriental' },
  { barangay: 'Casinglot', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Casinglot, Tagoloan, Misamis Oriental' },
  { barangay: 'Santa Cruz', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Santa Cruz, Tagoloan, Misamis Oriental' },
  { barangay: 'Natumolan', cityOrMunicipality: 'Tagoloan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9001', fullLocation: 'Natumolan, Tagoloan, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Poblacion, Villanueva, Misamis Oriental' },
  { barangay: 'Katipunan', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Katipunan, Villanueva, Misamis Oriental' },
  { barangay: 'Balacanas', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Balacanas, Villanueva, Misamis Oriental' },
  { barangay: 'Dayawan', cityOrMunicipality: 'Villanueva', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9002', fullLocation: 'Dayawan, Villanueva, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Poblacion, Jasaan, Misamis Oriental' },
  { barangay: 'Aplaya', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Aplaya, Jasaan, Misamis Oriental' },
  { barangay: 'Solana', cityOrMunicipality: 'Jasaan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9003', fullLocation: 'Solana, Jasaan, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Claveria', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9004', fullLocation: 'Poblacion, Claveria, Misamis Oriental' },
  { barangay: 'Mat-I', cityOrMunicipality: 'Claveria', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9004', fullLocation: 'Mat-I, Claveria, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Balingasag', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9005', fullLocation: 'Poblacion, Balingasag, Misamis Oriental' },
  { barangay: 'Baliwagan', cityOrMunicipality: 'Balingasag', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9005', fullLocation: 'Baliwagan, Balingasag, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Lagonglong', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9006', fullLocation: 'Poblacion, Lagonglong, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Salay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9007', fullLocation: 'Poblacion, Salay, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Sugbongcogon', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9008', fullLocation: 'Poblacion, Sugbongcogon, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Kinoguitan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9009', fullLocation: 'Poblacion, Kinoguitan, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Balingoan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9011', fullLocation: 'Poblacion, Balingoan, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Talisayan', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9012', fullLocation: 'Poblacion, Talisayan, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Medina', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9013', fullLocation: 'Poblacion, Medina, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Gingoog City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9014', fullLocation: 'Poblacion, Gingoog City, Misamis Oriental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Magsaysay', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)', zipCode: '9015', fullLocation: 'Poblacion, Magsaysay, Misamis Oriental' },

  // ==========================================
  // NATIONAL CAPITAL REGION (NCR / METRO MANILA)
  // ==========================================
  { barangay: 'Batasan Hills', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1126', fullLocation: 'Batasan Hills, Quezon City, Metro Manila' },
  { barangay: 'Diliman', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1101', fullLocation: 'Diliman, Quezon City, Metro Manila' },
  { barangay: 'Commonwealth', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1121', fullLocation: 'Commonwealth, Quezon City, Metro Manila' },
  { barangay: 'Cubao', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1109', fullLocation: 'Cubao, Quezon City, Metro Manila' },
  { barangay: 'Fairview', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1118', fullLocation: 'Fairview, Quezon City, Metro Manila' },
  { barangay: 'Novaliches', cityOrMunicipality: 'Quezon City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1123', fullLocation: 'Novaliches, Quezon City, Metro Manila' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Makati City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1210', fullLocation: 'Poblacion, Makati City, Metro Manila' },
  { barangay: 'Bel-Air', cityOrMunicipality: 'Makati City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1209', fullLocation: 'Bel-Air, Makati City, Metro Manila' },
  { barangay: 'San Lorenzo', cityOrMunicipality: 'Makati City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1223', fullLocation: 'San Lorenzo, Makati City, Metro Manila' },
  { barangay: 'Legazpi Village', cityOrMunicipality: 'Makati City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1229', fullLocation: 'Legazpi Village, Makati City, Metro Manila' },
  { barangay: 'Salcedo Village', cityOrMunicipality: 'Makati City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1227', fullLocation: 'Salcedo Village, Makati City, Metro Manila' },
  { barangay: 'Fort Bonifacio (BGC)', cityOrMunicipality: 'Taguig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1634', fullLocation: 'Fort Bonifacio (BGC), Taguig City, Metro Manila' },
  { barangay: 'Ususan', cityOrMunicipality: 'Taguig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1632', fullLocation: 'Ususan, Taguig City, Metro Manila' },
  { barangay: 'Western Bicutan', cityOrMunicipality: 'Taguig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1630', fullLocation: 'Western Bicutan, Taguig City, Metro Manila' },
  { barangay: 'Kapitolyo', cityOrMunicipality: 'Pasig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1603', fullLocation: 'Kapitolyo, Pasig City, Metro Manila' },
  { barangay: 'Ortigas Center', cityOrMunicipality: 'Pasig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1605', fullLocation: 'Ortigas Center, Pasig City, Metro Manila' },
  { barangay: 'San Antonio', cityOrMunicipality: 'Pasig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1605', fullLocation: 'San Antonio, Pasig City, Metro Manila' },
  { barangay: 'Ugong', cityOrMunicipality: 'Pasig City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1604', fullLocation: 'Ugong, Pasig City, Metro Manila' },
  { barangay: 'Highway Hills', cityOrMunicipality: 'Mandaluyong City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1550', fullLocation: 'Highway Hills, Mandaluyong City, Metro Manila' },
  { barangay: 'Wack-Wack', cityOrMunicipality: 'Mandaluyong City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1555', fullLocation: 'Wack-Wack, Mandaluyong City, Metro Manila' },
  { barangay: 'Greenhills', cityOrMunicipality: 'San Juan City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1502', fullLocation: 'Greenhills, San Juan City, Metro Manila' },
  { barangay: 'BF Homes', cityOrMunicipality: 'Parañaque City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1720', fullLocation: 'BF Homes, Parañaque City, Metro Manila' },
  { barangay: 'San Antonio', cityOrMunicipality: 'Parañaque City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1700', fullLocation: 'San Antonio, Parañaque City, Metro Manila' },
  { barangay: 'Don Bosco', cityOrMunicipality: 'Parañaque City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1711', fullLocation: 'Don Bosco, Parañaque City, Metro Manila' },
  { barangay: 'Pamplona', cityOrMunicipality: 'Las Piñas City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1740', fullLocation: 'Pamplona, Las Piñas City, Metro Manila' },
  { barangay: 'Alabang', cityOrMunicipality: 'Muntinlupa City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1780', fullLocation: 'Alabang, Muntinlupa City, Metro Manila' },
  { barangay: 'Ayala Alabang', cityOrMunicipality: 'Muntinlupa City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1780', fullLocation: 'Ayala Alabang, Muntinlupa City, Metro Manila' },
  { barangay: 'Malate', cityOrMunicipality: 'Manila City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1004', fullLocation: 'Malate, Manila City, Metro Manila' },
  { barangay: 'Ermita', cityOrMunicipality: 'Manila City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1000', fullLocation: 'Ermita, Manila City, Metro Manila' },
  { barangay: 'Sampaloc', cityOrMunicipality: 'Manila City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1008', fullLocation: 'Sampaloc, Manila City, Metro Manila' },
  { barangay: 'Santa Cruz', cityOrMunicipality: 'Manila City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1014', fullLocation: 'Santa Cruz, Manila City, Metro Manila' },
  { barangay: 'Tondo', cityOrMunicipality: 'Manila City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1012', fullLocation: 'Tondo, Manila City, Metro Manila' },
  { barangay: 'Concepcion', cityOrMunicipality: 'Marikina City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1807', fullLocation: 'Concepcion, Marikina City, Metro Manila' },
  { barangay: 'Marikina Heights', cityOrMunicipality: 'Marikina City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1810', fullLocation: 'Marikina Heights, Marikina City, Metro Manila' },
  { barangay: 'Grace Park', cityOrMunicipality: 'Caloocan City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1400', fullLocation: 'Grace Park, Caloocan City, Metro Manila' },
  { barangay: 'Karuhatan', cityOrMunicipality: 'Valenzuela City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1441', fullLocation: 'Karuhatan, Valenzuela City, Metro Manila' },
  { barangay: 'Baclaran', cityOrMunicipality: 'Pasay City', province: 'Metro Manila', region: 'NCR (National Capital Region)', zipCode: '1302', fullLocation: 'Baclaran, Pasay City, Metro Manila' },

  // ==========================================
  // REGION IV-A (CALABARZON) & REGION III (CENTRAL LUZON)
  // ==========================================
  { barangay: 'Poblacion', cityOrMunicipality: 'Bacoor City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4102', fullLocation: 'Poblacion, Bacoor City, Cavite' },
  { barangay: 'Molino', cityOrMunicipality: 'Bacoor City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4102', fullLocation: 'Molino, Bacoor City, Cavite' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Imus City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4103', fullLocation: 'Poblacion, Imus City, Cavite' },
  { barangay: 'Anabu', cityOrMunicipality: 'Imus City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4103', fullLocation: 'Anabu, Imus City, Cavite' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Dasmariñas City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4114', fullLocation: 'Poblacion, Dasmariñas City, Cavite' },
  { barangay: 'Salitran', cityOrMunicipality: 'Dasmariñas City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4114', fullLocation: 'Salitran, Dasmariñas City, Cavite' },
  { barangay: 'Poblacion', cityOrMunicipality: 'General Trias City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4107', fullLocation: 'Poblacion, General Trias City, Cavite' },
  { barangay: 'Manggahan', cityOrMunicipality: 'General Trias City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4107', fullLocation: 'Manggahan, General Trias City, Cavite' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Silang', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4118', fullLocation: 'Poblacion, Silang, Cavite' },
  { barangay: 'Kaybagal', cityOrMunicipality: 'Tagaytay City', province: 'Cavite', region: 'Region IV-A (CALABARZON)', zipCode: '4120', fullLocation: 'Kaybagal, Tagaytay City, Cavite' },
  { barangay: 'Balibago', cityOrMunicipality: 'Santa Rosa City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4026', fullLocation: 'Balibago, Santa Rosa City, Laguna' },
  { barangay: 'Don Jose', cityOrMunicipality: 'Santa Rosa City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4026', fullLocation: 'Don Jose, Santa Rosa City, Laguna' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Calamba City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4027', fullLocation: 'Poblacion, Calamba City, Laguna' },
  { barangay: 'Canlubang', cityOrMunicipality: 'Calamba City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4028', fullLocation: 'Canlubang, Calamba City, Laguna' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Biñan City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4024', fullLocation: 'Poblacion, Biñan City, Laguna' },
  { barangay: 'Poblacion', cityOrMunicipality: 'San Pedro City', province: 'Laguna', region: 'Region IV-A (CALABARZON)', zipCode: '4023', fullLocation: 'Poblacion, San Pedro City, Laguna' },
  { barangay: 'Batangas City Proper', cityOrMunicipality: 'Batangas City', province: 'Batangas', region: 'Region IV-A (CALABARZON)', zipCode: '4200', fullLocation: 'Batangas City Proper, Batangas City, Batangas' },
  { barangay: 'Marawoy', cityOrMunicipality: 'Lipa City', province: 'Batangas', region: 'Region IV-A (CALABARZON)', zipCode: '4217', fullLocation: 'Marawoy, Lipa City, Batangas' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Lipa City', province: 'Batangas', region: 'Region IV-A (CALABARZON)', zipCode: '4217', fullLocation: 'Poblacion, Lipa City, Batangas' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tanauan City', province: 'Batangas', region: 'Region IV-A (CALABARZON)', zipCode: '4232', fullLocation: 'Poblacion, Tanauan City, Batangas' },
  { barangay: 'San Roque', cityOrMunicipality: 'Antipolo City', province: 'Rizal', region: 'Region IV-A (CALABARZON)', zipCode: '1870', fullLocation: 'San Roque, Antipolo City, Rizal' },
  { barangay: 'Mayamot', cityOrMunicipality: 'Antipolo City', province: 'Rizal', region: 'Region IV-A (CALABARZON)', zipCode: '1870', fullLocation: 'Mayamot, Antipolo City, Rizal' },
  { barangay: 'Santo Domingo', cityOrMunicipality: 'Cainta', province: 'Rizal', region: 'Region IV-A (CALABARZON)', zipCode: '1900', fullLocation: 'Santo Domingo, Cainta, Rizal' },
  { barangay: 'San Juan', cityOrMunicipality: 'Taytay', province: 'Rizal', region: 'Region IV-A (CALABARZON)', zipCode: '1920', fullLocation: 'San Juan, Taytay, Rizal' },
  { barangay: 'Dolores', cityOrMunicipality: 'City of San Fernando', province: 'Pampanga', region: 'Region III (Central Luzon)', zipCode: '2000', fullLocation: 'Dolores, City of San Fernando, Pampanga' },
  { barangay: 'Balibago', cityOrMunicipality: 'Angeles City', province: 'Pampanga', region: 'Region III (Central Luzon)', zipCode: '2009', fullLocation: 'Balibago, Angeles City, Pampanga' },
  { barangay: 'Malolos Proper', cityOrMunicipality: 'Malolos City', province: 'Bulacan', region: 'Region III (Central Luzon)', zipCode: '3000', fullLocation: 'Malolos Proper, Malolos City, Bulacan' },
  { barangay: 'Tungkong Mangga', cityOrMunicipality: 'San Jose del Monte City', province: 'Bulacan', region: 'Region III (Central Luzon)', zipCode: '3023', fullLocation: 'Tungkong Mangga, San Jose del Monte City, Bulacan' },

  // ==========================================
  // NORTHERN & SOUTHERN LUZON (CAR, REGION I, II, V)
  // ==========================================
  { barangay: 'Session Road', cityOrMunicipality: 'Baguio City', province: 'Benguet', region: 'CAR (Cordillera Administrative Region)', zipCode: '2600', fullLocation: 'Session Road, Baguio City, Benguet' },
  { barangay: 'Burnham - Legarda', cityOrMunicipality: 'Baguio City', province: 'Benguet', region: 'CAR (Cordillera Administrative Region)', zipCode: '2600', fullLocation: 'Burnham - Legarda, Baguio City, Benguet' },
  { barangay: 'Camp 7', cityOrMunicipality: 'Baguio City', province: 'Benguet', region: 'CAR (Cordillera Administrative Region)', zipCode: '2600', fullLocation: 'Camp 7, Baguio City, Benguet' },
  { barangay: 'Poblacion', cityOrMunicipality: 'La Trinidad', province: 'Benguet', region: 'CAR (Cordillera Administrative Region)', zipCode: '2601', fullLocation: 'Poblacion, La Trinidad, Benguet' },
  { barangay: 'Lucao', cityOrMunicipality: 'Dagupan City', province: 'Pangasinan', region: 'Region I (Ilocos Region)', zipCode: '2400', fullLocation: 'Lucao, Dagupan City, Pangasinan' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Laoag City', province: 'Ilocos Norte', region: 'Region I (Ilocos Region)', zipCode: '2900', fullLocation: 'Poblacion, Laoag City, Ilocos Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Vigan City', province: 'Ilocos Sur', region: 'Region I (Ilocos Region)', zipCode: '2700', fullLocation: 'Poblacion, Vigan City, Ilocos Sur' },
  { barangay: 'Poblacion', cityOrMunicipality: 'City of San Fernando', province: 'La Union', region: 'Region I (Ilocos Region)', zipCode: '2500', fullLocation: 'Poblacion, City of San Fernando, La Union' },
  { barangay: 'San Gabriel', cityOrMunicipality: 'Tuguegarao City', province: 'Cagayan', region: 'Region II (Cagayan Valley)', zipCode: '3500', fullLocation: 'San Gabriel, Tuguegarao City, Cagayan' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Santiago City', province: 'Isabela', region: 'Region II (Cagayan Valley)', zipCode: '3311', fullLocation: 'Poblacion, Santiago City, Isabela' },
  { barangay: 'Old Albay', cityOrMunicipality: 'Legazpi City', province: 'Albay', region: 'Region V (Bicol Region)', zipCode: '4500', fullLocation: 'Old Albay, Legazpi City, Albay' },
  { barangay: 'Concepcion Pequeña', cityOrMunicipality: 'Naga City', province: 'Camarines Sur', region: 'Region V (Bicol Region)', zipCode: '4400', fullLocation: 'Concepcion Pequeña, Naga City, Camarines Sur' },

  // ==========================================
  // REGION VII - CENTRAL VISAYAS (CEBU & BOHOL)
  // ==========================================
  { barangay: 'Lahug', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Lahug, Cebu City, Cebu' },
  { barangay: 'Mabolo', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Mabolo, Cebu City, Cebu' },
  { barangay: 'Banilad', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Banilad, Cebu City, Cebu' },
  { barangay: 'Guadalupe', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Guadalupe, Cebu City, Cebu' },
  { barangay: 'Kasambagan (IT Park)', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Kasambagan (IT Park), Cebu City, Cebu' },
  { barangay: 'Capitol Site', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Capitol Site, Cebu City, Cebu' },
  { barangay: 'Talamban', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Talamban, Cebu City, Cebu' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6000', fullLocation: 'Poblacion, Cebu City, Cebu' },
  { barangay: 'Subangdaku', cityOrMunicipality: 'Mandaue City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6014', fullLocation: 'Subangdaku, Mandaue City, Cebu' },
  { barangay: 'Tipolo', cityOrMunicipality: 'Mandaue City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6014', fullLocation: 'Tipolo, Mandaue City, Cebu' },
  { barangay: 'Basak', cityOrMunicipality: 'Lapu-Lapu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6015', fullLocation: 'Basak, Lapu-Lapu City, Cebu' },
  { barangay: 'Maribago (Mactan)', cityOrMunicipality: 'Lapu-Lapu City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6015', fullLocation: 'Maribago (Mactan), Lapu-Lapu City, Cebu' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Talisay City', province: 'Cebu', region: 'Region VII (Central Visayas)', zipCode: '6045', fullLocation: 'Poblacion, Talisay City, Cebu' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tagbilaran City', province: 'Bohol', region: 'Region VII (Central Visayas)', zipCode: '6300', fullLocation: 'Poblacion, Tagbilaran City, Bohol' },
  { barangay: 'Tawala (Alona)', cityOrMunicipality: 'Panglao', province: 'Bohol', region: 'Region VII (Central Visayas)', zipCode: '6340', fullLocation: 'Tawala (Alona), Panglao, Bohol' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Dumaguete City', province: 'Negros Oriental', region: 'Region VII (Central Visayas)', zipCode: '6200', fullLocation: 'Poblacion, Dumaguete City, Negros Oriental' },

  // ==========================================
  // REGION VI & VIII - WESTERN & EASTERN VISAYAS
  // ==========================================
  { barangay: 'Mandurriao', cityOrMunicipality: 'Iloilo City', province: 'Iloilo', region: 'Region VI (Western Visayas)', zipCode: '5000', fullLocation: 'Mandurriao, Iloilo City, Iloilo' },
  { barangay: 'Jaro', cityOrMunicipality: 'Iloilo City', province: 'Iloilo', region: 'Region VI (Western Visayas)', zipCode: '5000', fullLocation: 'Jaro, Iloilo City, Iloilo' },
  { barangay: 'La Paz', cityOrMunicipality: 'Iloilo City', province: 'Iloilo', region: 'Region VI (Western Visayas)', zipCode: '5000', fullLocation: 'La Paz, Iloilo City, Iloilo' },
  { barangay: 'Molo', cityOrMunicipality: 'Iloilo City', province: 'Iloilo', region: 'Region VI (Western Visayas)', zipCode: '5000', fullLocation: 'Molo, Iloilo City, Iloilo' },
  { barangay: 'Mandalagan', cityOrMunicipality: 'Bacolod City', province: 'Negros Occidental', region: 'Region VI (Western Visayas)', zipCode: '6100', fullLocation: 'Mandalagan, Bacolod City, Negros Occidental' },
  { barangay: 'Villamonte', cityOrMunicipality: 'Bacolod City', province: 'Negros Occidental', region: 'Region VI (Western Visayas)', zipCode: '6100', fullLocation: 'Villamonte, Bacolod City, Negros Occidental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Bacolod City', province: 'Negros Occidental', region: 'Region VI (Western Visayas)', zipCode: '6100', fullLocation: 'Poblacion, Bacolod City, Negros Occidental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tacloban City', province: 'Leyte', region: 'Region VIII (Eastern Visayas)', zipCode: '6500', fullLocation: 'Poblacion, Tacloban City, Leyte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Ormoc City', province: 'Leyte', region: 'Region VIII (Eastern Visayas)', zipCode: '6541', fullLocation: 'Poblacion, Ormoc City, Leyte' },

  // ==========================================
  // REGION XI - DAVAO REGION & REGION XII (SOCCSKSARGEN)
  // ==========================================
  { barangay: 'Poblacion', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Poblacion, Davao City, Davao del Sur' },
  { barangay: 'Buhangin', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Buhangin, Davao City, Davao del Sur' },
  { barangay: 'Matina', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Matina, Davao City, Davao del Sur' },
  { barangay: 'Talomo', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Talomo, Davao City, Davao del Sur' },
  { barangay: 'Toril', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Toril, Davao City, Davao del Sur' },
  { barangay: 'Bajada (J.P. Laurel)', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Bajada, Davao City, Davao del Sur' },
  { barangay: 'Lanang', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Lanang, Davao City, Davao del Sur' },
  { barangay: 'Calinan', cityOrMunicipality: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8000', fullLocation: 'Calinan, Davao City, Davao del Sur' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Tagum City', province: 'Davao del Norte', region: 'Region XI (Davao Region)', zipCode: '8100', fullLocation: 'Poblacion, Tagum City, Davao del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Digos City', province: 'Davao del Sur', region: 'Region XI (Davao Region)', zipCode: '8002', fullLocation: 'Poblacion, Digos City, Davao del Sur' },
  { barangay: 'Dadiangas (Poblacion)', cityOrMunicipality: 'General Santos City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)', zipCode: '9500', fullLocation: 'Dadiangas, General Santos City, South Cotabato' },
  { barangay: 'Lagao', cityOrMunicipality: 'General Santos City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)', zipCode: '9500', fullLocation: 'Lagao, General Santos City, South Cotabato' },
  { barangay: 'Calumpang', cityOrMunicipality: 'General Santos City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)', zipCode: '9500', fullLocation: 'Calumpang, General Santos City, South Cotabato' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Koronadal City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)', zipCode: '9506', fullLocation: 'Poblacion, Koronadal City, South Cotabato' },

  // ==========================================
  // REGION X, IX, XIII & BARMM (OTHER MINDANAO HUBS)
  // ==========================================
  { barangay: 'Poblacion', cityOrMunicipality: 'Malaybalay City', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8700', fullLocation: 'Poblacion, Malaybalay City, Bukidnon' },
  { barangay: 'Casisang', cityOrMunicipality: 'Malaybalay City', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8700', fullLocation: 'Casisang, Malaybalay City, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Valencia City', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8709', fullLocation: 'Poblacion, Valencia City, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Manolo Fortich', province: 'Bukidnon', region: 'Region X (Northern Mindanao)', zipCode: '8703', fullLocation: 'Poblacion, Manolo Fortich, Bukidnon' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Poblacion, Iligan City, Lanao del Norte' },
  { barangay: 'Tibanga', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Tibanga, Iligan City, Lanao del Norte' },
  { barangay: 'Tubod', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Tubod, Iligan City, Lanao del Norte' },
  { barangay: 'Suarez', cityOrMunicipality: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)', zipCode: '9200', fullLocation: 'Suarez, Iligan City, Lanao del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7000', fullLocation: 'Poblacion, Zamboanga City, Zamboanga del Sur' },
  { barangay: 'Tetuan', cityOrMunicipality: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7000', fullLocation: 'Tetuan, Zamboanga City, Zamboanga del Sur' },
  { barangay: 'Pasonanca', cityOrMunicipality: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7000', fullLocation: 'Pasonanca, Zamboanga City, Zamboanga del Sur' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Pagadian City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7016', fullLocation: 'Poblacion, Pagadian City, Zamboanga del Sur' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Dipolog City', province: 'Zamboanga del Norte', region: 'Region IX (Zamboanga Peninsula)', zipCode: '7100', fullLocation: 'Poblacion, Dipolog City, Zamboanga del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Butuan City', province: 'Agusan del Norte', region: 'Region XIII (Caraga)', zipCode: '8600', fullLocation: 'Poblacion, Butuan City, Agusan del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Surigao City', province: 'Surigao del Norte', region: 'Region XIII (Caraga)', zipCode: '8400', fullLocation: 'Poblacion, Surigao City, Surigao del Norte' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Ozamiz City', province: 'Misamis Occidental', region: 'Region X (Northern Mindanao)', zipCode: '7200', fullLocation: 'Poblacion, Ozamiz City, Misamis Occidental' },
  { barangay: 'Poblacion', cityOrMunicipality: 'Cotabato City', province: 'Maguindanao del Norte', region: 'BARMM (Bangsamoro)', zipCode: '9600', fullLocation: 'Poblacion, Cotabato City, Maguindanao del Norte' },
];

export const MISAMIS_ORIENTAL_LOCATIONS = PHILIPPINE_LOCATIONS.filter(
  (loc) => loc.province === 'Misamis Oriental',
);

/** Fast, intelligent search with ranking for Philippine locations */
export function searchPhilippineLocations(query: string, maxResults = 15): PhLocation[] {
  const clean = query.toLowerCase().trim();
  if (!clean) {
    // Return top popular hubs across regions with Misamis Oriental prioritized
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
      if (bar === term) score += 50;
      else if (bar.startsWith(term)) score += 30;
      else if (bar.includes(term)) score += 18;

      if (city.startsWith(term)) score += 25;
      else if (city.includes(term)) score += 15;

      if (prov.startsWith(term)) score += 20;
      else if (prov.includes(term)) score += 10;

      if (full.includes(term)) score += 10;
    }

    // Boost exact phrase match
    if (full.includes(clean)) {
      score += 40;
    }

    return { loc, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.loc);
}

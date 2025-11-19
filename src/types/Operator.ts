import { DatabaseItem } from '../services/database';

export interface Operator extends DatabaseItem {
  matricule: string;
  nom: string;
  dateDetection: Date;
  posteTravail: string;
  referenceProduit: string;
  codeDefaut?: string;
  natureDefaut?: string;
  shiftLeaderName?: string;
  projet?: string;
  section?: string;
  ligne?: number;
  commentaire?: string;
  nombreOccurrences?: number;
  photoUri?: string;
  category?: string;
  codeBoitier?: string;
  codeRepere?: string;
  repere1?: string;
  repere2?: string;
  operateurNom?: string;
}

export interface CreateOperatorData {
  matricule: string;
  nom: string;
  dateDetection: Date;
  posteTravail: string;
  referenceProduit: string;
  codeDefaut?: string;
  natureDefaut?: string;
  shiftLeaderName?: string;
  projet?: string;
  section?: string;
  ligne?: number;
  commentaire?: string;
  nombreOccurrences?: number;
  photoUri?: string;
  category?: string;
  codeBoitier?: string;
  codeRepere?: string;
  repere1?: string;
  repere2?: string;
  p1?: string;
  p2?: string;
  valeurDemande?: string;
  valeurDetecte?: string;
  operateurNom?: string;
}

export const POSTES_TRAVAIL = [
  'Poste 1', 'Poste 2', 'Poste 3', 'Poste 4', 'Poste 5',
  'Poste 6', 'Poste 7', 'Poste 8', 'Poste 9', 'Poste 10',
  'Poste 11', 'Poste 12', 'Poste 13', 'Poste 14', 'Poste 15',
  'Poste 16', 'Poste 17', 'Poste 18', 'Poste 19', 'Poste 20',
  'Poste 21', 'Poste 22', 'Poste 23', 'Poste 24', 'Poste 25',
  'Poste 26', 'Poste 27', 'Poste 28', 'Poste 29', 'Poste 30',
  'Poste 31', 'Poste 32', 'Poste 33', 'Poste 34', 'Poste 35',
  'Test agrafe', 'Test électrique', 'Test caméra', 'Test geometrie', 'Firewall'
];


export const PROJETS_SECTIONS = {
  'CRA': 'Section 01',
  'WPA': 'Section 02',
  'X1310 PDB': 'Section 03',
  'X1310 LOWDASH': 'Section 04',
  'X1310 EGR ICE': 'Section 05',
  'X1310 EGR HEV': 'Section 05',
  'X1310 ENGINE': 'Section 06',
  'X1310 Smalls': 'Section 07',
  'P13A SMALLS': 'Section 07',
  'P13A EGR': 'Section 07',
  'P13A MAIN & BODY': 'Section 07'
};

export const CODES_DEFAUT_PAR_CATEGORIE: Record<string, Record<string, string>> = {
  'Connexion / Encliquetage': {
    '101': 'Connexion non encliquetée',
    '102': 'Connexion mal orientée dans l\'alvéole',
    '103': 'Connexion déformée',
    '104': 'Bavure, crique, cassure,...',
    '105': 'Connexion écrasée',
    '106': 'Lance à plat',
    '107': 'Connexion cassée',
    '108': 'Connexion coupée',
    '109': 'Connexion oxydée',
    '110': 'Corps étranger dans connexion',
    '111': 'Mauvaise connexion',
    '199': 'Autres'
  },
  'Fils': {
    '201': 'Fils brûlés',
    '202': 'Fils blessés',
    '203': 'Section NC',
    '204': 'Couleur NC',
    '205': 'Longueur NC',
    '206': 'Matière de l\'isolant',
    '207': 'Immobilisation NC',
    '208': 'Cuivre apparent',
    '209': 'Fils cassé / coupé',
    '210': 'Fils inversé',
    '299': 'Autres'
  },
  'Sertissage': {
    '301': 'Ailettes non jointives',
    '302': 'Ailettes retournées',
    '303': 'Sertissage partiel',
    '304': 'Sertissage sur isolant',
    '305': 'Témoin de découpe NC',
    '306': 'Tenue NC en traction',
    '307': 'Isolant hors ailettes',
    '308': 'Référence connexion NC',
    '309': 'Brins hors ailettes',
    '310': 'Coupe nette',
    '311': 'Cuivre hors ailettes',
    '312': 'Papier dans sertissage',
    '399': 'Autres'
  },
  'Sertissage Jumelage/Double départ/Mariage': {
    '301B': 'Ailettes non jointives',
    '302B': 'Ailettes retournées',
    '303B': 'Sertissage partiel',
    '304B': 'Sertissage sur isolant',
    '305B': 'Témoin de découpe NC',
    '306B': 'Tenue NC en traction',
    '307B': 'Isolant hors ailettes',
    '308B': 'Référence connexion NC',
    '309B': 'Brins hors ailettes',
    '310B': 'Coupe nette',
    '311B': 'Cuivre hors ailettes',
    '312B': 'Papier dans sertissage'
  },
  'Epissures': {
    '401': 'Manque fil',
    '402': 'Erreur ou fil en double',
    '403': 'Mauvais positionnenement des brins / Soudure',
    '404': 'Manchon percé par brins / mal positionné',
    '405': 'Erreur de manchon',
    '406': 'Manchon trop ou pas assez rétreint',
    '407': 'Non étanche',
    '408': 'Fil brûlé',
    '409': 'Fil arraché / cassé',
    '499': 'Autres'
  },
  'Joint': {
    '501': 'Détérioré, inversé',
    '502': 'Erreur de joint',
    '599': 'Autres'
  },
  'Connecteur': {
    '601': 'Grille non verrouillée',
    '602': 'Erreur de connecteur',
    '603': 'Manque matière',
    '604': 'Couvercle / verrou mal positionné, détérioré ou manquant',
    '605': 'Boîtier détérioré',
    '606': 'Erreur fusible',
    '607': 'Inversion connecteur',
    '608': 'Immobilisation connecteur',
    '609': 'Manque protection connecteur (sachet, manchon,...)',
    '610': 'Mauvais Encliquetage fusible',
    '611': 'Erreur relais, centrale clignotante',
    '612': 'Boitier non-conforme (fournisseur)',
    '613': 'Corps étranger dans connecteur (joint…)',
    '699': 'Autres'
  },
  'Géométrie': {
    '701': 'Dérivation Toron Principal NC',
    '702': 'Dérivation Toron Secondaire NC',
    '703': 'Position boîtier NC',
    '704': 'Position bague NC',
    '705': 'Position rubannage NC',
    '706': 'Position ligature NC',
    '707': 'Position manchon NC',
    '708': 'Position pion',
    '709': 'Position goulotte',
    '799': 'Autres'
  },
  'Hygiène': {
    '801': 'Fils tendus',
    '802': 'Mauvais peignage',
    '803': 'Erreur de ruban',
    '804': 'Rubannage : recouvrement trop important, trop faible',
    '805': 'Rubannage non prévu',
    '899': 'Autres'
  },
  'Identification': {
    '901': 'Référence Câblage NC',
    '902': 'Manque étiquette',
    '903': 'Indice de modification NC',
    '904': 'Etiquette d\'identification mal positionnée/déchirée',
    '905': 'Repére mal positionné',
    '906': 'Code Barre mal positionné',
    '999': 'Autres'
  },
  'Surmoulage': {
    '1001': 'Manque matière',
    '1002': 'Bague à l\'envers',
    '1003': 'Déformé, bavure',
    '1004': 'Dureté hors tolérance',
    '1005': 'Position hors tolérance, connexion reculée',
    '1006': 'Bague NC',
    '1007': 'Erreur de référence',
    '1008': 'Fil pincé',
    '1099': 'Autres'
  },
  'Locating / agrafe / pion / goulotte': {
    '1101': 'Inversée',
    '1102': 'Non conforme',
    '1103': 'Cassée',
    '1104': 'Manque matière',
    '1105': 'Mal positionné',
    '1106': 'Mauvais maintien',
    '1107': 'Collier / Rilsan non coupé',
    '1199': 'Autres'
  },
  'Conditionnement': {
    '1201': 'Câblage mal disposé',
    '1202': 'Conditionnement NC (erreur, manque, aspect,...)',
    '1203': 'GALIA : erreur, manque, impression',
    '1204': 'Erreur de quantité',
    '1205': 'Mélange de faisceaux dans conditionnement',
    '1299': 'Autres'
  },
  'Protection': {
    '1301': 'Non enmanchée',
    '1302': 'Matière NC',
    '1303': 'Longueur NC',
    '1304': 'Diamètre NC',
    '1305': 'Immobilisation NC (Protection mal fixée)',
    '1306': 'Fils hors protection',
    '1307': 'Protection détériorée, déformée, inversée',
    '1399': 'Autres'
  },
  'Manchon': {
    '1401': 'Manchon Non cuit',
    '1402': 'Manchon NC (détérioré, matière,...)',
    '1403': 'Rétreint NC',
    '1404': 'Non étanche',
    '1405': 'Manchon mal positionné',
    '1499': 'Autres'
  },
  'Ligatures': {
    '1501': 'Erreur de référence (Type, couleur, largeur)',
    '1502': 'Non prévu',
    '1503': 'Non serré',
    '1599': 'Autres'
  },
  'Manque élément': {
    '1601': 'Manque fil',
    '1602': 'Manque connecteur',
    '1603': 'Manque fusibles',
    '1604': 'Manque centrale clignotante, relais',
    '1605': 'Manque locating, agrafe, pion',
    '1606': 'Manque connexion',
    '1607': 'Manque manchon',
    '1608': 'Manque étiquette',
    '1609': 'Manque protection',
    '1610': 'Manque épissure',
    '1611': 'Manque ligature',
    '1612': 'Manque rubannage',
    '1613': 'Manque surmoulage',
    '1614': 'Manque joint',
    '1615': 'Manque repére',
    '1616': 'Manque grille',
    '1617': 'Manque vis',
    '1618': 'Manque bouchon étanchéité',
    '1699': 'Autres'
  },
  'Divers': {
    '1701': 'Réponses hors délais',
    '1799': 'Divers'
  }
};

// Garder l'ancien format pour la compatibilité
export const CODES_DEFAUT = Object.fromEntries(
  Object.entries(CODES_DEFAUT_PAR_CATEGORIE).flatMap(([category, codes]) =>
    Object.entries(codes)
  )
);

export const CATEGORIES = Object.keys(CODES_DEFAUT_PAR_CATEGORIE); 
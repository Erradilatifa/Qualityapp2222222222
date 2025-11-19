# Diagramme de Classes - Application Mobile Qualité LEONI

## Diagramme UML (PlantUML)

```plantuml
@startuml
!define ENTITY class
!define INTERFACE interface
!define ABSTRACT abstract class

' ===== INTERFACES DE BASE =====
INTERFACE DatabaseItem {
  +id?: string
  +createdAt?: Date
  +updatedAt?: Date
  +[key: string]: any
}

' ===== ENTITÉS MÉTIER =====
ENTITY Operator {
  +matricule: string
  +nom: string
  +dateDetection: Date
  +posteTravail: string
  +referenceProduit: string
  +codeDefaut?: string
  +natureDefaut?: string
  +equipe?: string
  +projet?: string
  +section?: string
  +ligne?: number
  +commentaire?: string
  +nombreOccurrences?: number
  +photoUri?: string
  +category?: string
  +codeBoitier?: string
  +codeRepere?: string
  +repere1?: string
  +repere2?: string
}

ENTITY Task {
  +title: string
  +description?: string
  +completed: boolean
  +priority: 'low' | 'medium' | 'high'
  +dueDate?: Date
  +category?: string
  +userId?: string
  +commentaire?: string
}

ENTITY Notification {
  +id?: string
  +type: NotificationType
  +title: string
  +message: string
  +matricule?: string
  +nom?: string
  +codeDefaut?: string
  +referenceProduit?: string
  +posteTravail?: string
  +dateDetection?: Date
  +timestamp: Date
  +read: boolean
  +action?: ActionType
  +actionData?: any
  +priority: PriorityLevel
  +category: CategoryType
  +icon?: string
  +color?: string
}

' ===== TYPES DE DONNÉES =====
ENTITY CreateOperatorData {
  +matricule: string
  +nom: string
  +dateDetection: Date
  +posteTravail: string
  +referenceProduit: string
  +codeDefaut?: string
  +natureDefaut?: string
  +equipe?: string
  +projet?: string
  +section?: string
  +ligne?: number
  +commentaire?: string
  +nombreOccurrences?: number
  +photoUri?: string
  +category?: string
  +codeBoitier?: string
  +codeRepere?: string
  +repere1?: string
  +repere2?: string
  +p1?: string
  +p2?: string
  +valeurDemande?: string
  +valeurDetecte?: string
}

ENTITY CreateTaskData {
  +title: string
  +description?: string
  +priority: 'low' | 'medium' | 'high'
  +dueDate?: Date
  +category?: string
  +userId?: string
  +completed: boolean
  +commentaire?: string
}

' ===== STATISTIQUES =====
ENTITY NotificationStats {
  +total: number
  +unread: number
  +byType: TypeStats
  +byPriority: PriorityStats
}

ENTITY DefautStats {
  +totalDefauts: number
  +defautsByType: DefautType[]
  +mostFrequentDefauts: DefautType[]
  +pieChartData: any[]
  +legendData: any[]
  +categoryStats: CategoryStats[]
  +categoryPieChartData: any[]
  +filsInverseStats: FilsInverseStats[]
  +totalFilsInverseDefauts: number
}

ENTITY DefautType {
  +code: string
  +nature: string
  +count: number
  +percentage: number
}

ENTITY CategoryStats {
  +category: string
  +count: number
  +percentage: number
  +color: string
}

ENTITY FilsInverseStats {
  +repere: string
  +count: number
  +percentage: number
  +color: string
}

' ===== SERVICES =====
ENTITY DatabaseService {
  -collectionName: string
  -storageKey: string
  
  +constructor(collectionName: string)
  +create(data: DatabaseItem): Promise<string>
  +getAll(): Promise<DatabaseItem[]>
  +getById(id: string): Promise<DatabaseItem | null>
  +update(id: string, data: Partial<DatabaseItem>): Promise<void>
  +delete(id: string): Promise<void>
  +query(filters: Filter[]): Promise<DatabaseItem[]>
  -createLocal(data: DatabaseItem): Promise<string>
  -getLocalData(): Promise<DatabaseItem[]>
  -createDefautNotification(data: any, id: string): Promise<void>
  +logUserConnection(matricule: string): Promise<void>
  +getActiveUsersToday(): Promise<any[]>
}

ENTITY NotificationService {
  +create(notification: Notification): Promise<string>
  +getAll(): Promise<Notification[]>
  +markAsRead(id: string): Promise<void>
  +markAllAsRead(): Promise<void>
  +delete(id: string): Promise<void>
  +getUnreadCount(): Promise<number>
  +getStats(): Promise<NotificationStats>
  +createDefautNotification(operatorData: any, operatorId: string): Promise<void>
  +createSystemNotification(title: string, message: string): Promise<void>
}

' ===== CONTEXTES =====
INTERFACE AuthContextType {
  +user: User | null
  +loading: boolean
  +login(email: string, password: string): Promise<void>
  +logout(): Promise<void>
}

INTERFACE ThemeContextType {
  +theme: Theme
  +isDark: boolean
  +toggleTheme(): void
}

INTERFACE NotificationBadgeContextType {
  +unreadCount: number
  +refresh(): Promise<void>
  +markAsRead(notificationId: string): Promise<void>
}

ENTITY Theme {
  +primary: string
  +secondary: string
  +background: string
  +surface: string
  +textPrimary: string
  +textSecondary: string
  +textTertiary: string
  +border: string
  +borderLight: string
  +success: string
  +warning: string
  +error: string
  +info: string
}

' ===== ÉNUMÉRATIONS =====
enum NotificationType {
  defaut_ajoute
  defaut_modifie
  defaut_supprime
  system
  alerte
  info
}

enum ActionType {
  view_defaut
  edit_defaut
  delete_defaut
  none
}

enum PriorityLevel {
  low
  medium
  high
  urgent
}

enum CategoryType {
  qualite
  system
  maintenance
  securite
}

' ===== CONSTANTES MÉTIER =====
ENTITY Constants {
  +POSTES_TRAVAIL: string[]
  +EQUIPES: string[]
  +PROJETS_SECTIONS: Record<string, string>
  +CODES_DEFAUT_PAR_CATEGORIE: Record<string, Record<string, string>>
  +CODES_DEFAUT: Record<string, string>
  +CATEGORIES: string[]
}

' ===== RELATIONS =====
DatabaseItem <|-- Operator
DatabaseItem <|-- Task
DatabaseItem <|-- Notification

Operator --> CreateOperatorData : "created from"
Task --> CreateTaskData : "created from"

DatabaseService --> DatabaseItem : "manages"
NotificationService --> Notification : "manages"

DefautStats --> DefautType : "contains"
DefautStats --> CategoryStats : "contains"
DefautStats --> FilsInverseStats : "contains"

NotificationStats --> NotificationType : "uses"
NotificationStats --> PriorityLevel : "uses"

Notification --> NotificationType : "uses"
Notification --> ActionType : "uses"
Notification --> PriorityLevel : "uses"
Notification --> CategoryType : "uses"

AuthContextType --> DatabaseService : "uses for user tracking"
NotificationBadgeContextType --> NotificationService : "uses"

DatabaseService --> NotificationService : "creates notifications"

' ===== INSTANCES DE SERVICES =====
ENTITY OperatorService {
  <<singleton>>
}

ENTITY TaskService {
  <<singleton>>
}

DatabaseService <|-- OperatorService
DatabaseService <|-- TaskService

OperatorService --> Operator : "manages"
TaskService --> Task : "manages"

@enduml
```

## Description des Classes Principales

### 1. **Entités Métier**

#### `Operator` (extends DatabaseItem)
- **Rôle** : Représente un défaut détecté par un opérateur
- **Attributs clés** : matricule, nom, dateDetection, codeDefaut, natureDefaut
- **Relations** : Hérite de DatabaseItem, créé via CreateOperatorData

#### `Task` (extends DatabaseItem)
- **Rôle** : Représente une tâche générique du système
- **Attributs clés** : title, completed, priority, dueDate
- **Relations** : Hérite de DatabaseItem, créé via CreateTaskData

#### `Notification` (extends DatabaseItem)
- **Rôle** : Représente les notifications système
- **Attributs clés** : type, title, message, priority, read
- **Relations** : Utilise les énumérations pour typage strict

### 2. **Services**

#### `DatabaseService`
- **Rôle** : Service générique pour la gestion des données (Firebase + cache local)
- **Méthodes principales** : CRUD operations, synchronisation, cache local
- **Pattern** : Template method avec fallback local storage

#### `NotificationService`
- **Rôle** : Service spécialisé pour les notifications
- **Méthodes principales** : Création, lecture, statistiques
- **Relations** : Utilisé par DatabaseService pour créer des notifications

### 3. **Contextes React**

#### `AuthContextType`
- **Rôle** : Gestion de l'authentification Firebase
- **Méthodes** : login, logout, état utilisateur

#### `ThemeContextType`
- **Rôle** : Gestion des thèmes (clair/sombre)
- **Méthodes** : toggleTheme, état du thème

#### `NotificationBadgeContextType`
- **Rôle** : Gestion des badges de notification
- **Méthodes** : refresh, markAsRead, compteur non lus

### 4. **Types de Données**

#### `DefautStats`
- **Rôle** : Agrégation des statistiques de défauts
- **Composition** : Contient DefautType[], CategoryStats[], FilsInverseStats[]

#### `NotificationStats`
- **Rôle** : Statistiques des notifications
- **Composition** : Compteurs par type et priorité

### 5. **Énumérations**
- `NotificationType` : Types de notifications
- `ActionType` : Actions possibles sur notifications
- `PriorityLevel` : Niveaux de priorité
- `CategoryType` : Catégories de notifications

## Patterns Architecturaux Utilisés

1. **Repository Pattern** : DatabaseService comme couche d'abstraction
2. **Singleton Pattern** : Services instanciés une seule fois
3. **Strategy Pattern** : Fallback Firebase → Local Storage
4. **Observer Pattern** : Contextes React pour état global
5. **Factory Pattern** : Création d'objets via interfaces Create*Data

## Relations Clés

- **Héritage** : Operator, Task, Notification héritent de DatabaseItem
- **Composition** : DefautStats compose plusieurs types de statistiques
- **Dépendance** : Services dépendent des interfaces métier
- **Association** : Contextes utilisent les services pour les opérations

import { EventAttributes } from "ics";

export interface GoEvent {
  eventID: string;
  name: string;
  eventType: EventType;
  heading: string;
  link: string;
  image: string;
  start: string;
  end: string;
  extraData: ExtraData;
}

export interface ExtraData {
  generic: GenericDetails;
  spotlight?: SpotlightHourEvent;
  raidbattles?: RaidBattleEvent;
  communityday?: CommunityDayEvent;
  breakthrough?: SpawnWithShinyChance;
}

export interface GenericDetails {
  hasSpawns: boolean;
  hasFieldResearchTasks: boolean;
}

export interface SpotlightHourEvent extends SpawnWithShinyChance {
  bonus: string;
  list: SpawnWithShinyChance[];
}

export interface RaidBattleEvent {
  bosses: SpawnWithShinyChance[];
  shinies: Spawn[];
}

export interface CommunityDayEvent {
  spawns: Spawn[];
  bonuses: Bonus[];
  bonusDisclaimers: string[];
  shinies: Spawn[];
  specialresearch: SpecialResearch[];
}

export interface Spawn {
  name: string;
  image: string;
}

export interface SpawnWithShinyChance extends Spawn {
  canBeShiny: boolean;
}

export interface Bonus {
  text: string;
  image: string;
}

export interface SpecialResearch {
  name: string;
  step: number;
  tasks: Task[];
  rewards: Bonus[];
}

export interface Task {
  text: string;
  reward: Bonus;
}

export type EventType =
  | MiscEventType
  | ResearchEventType
  | RaidEventType
  | RocketEventType;

export type MiscEventType =
  | "community-day"
  | "event"
  | "live-event"
  | "pokemon-go-fest"
  | "global-challenge"
  | "safari-zone"
  | "ticketed-event"
  | "location-specific"
  | "bonus-hour"
  | "pokemon-spotlight-hour"
  | "potential-ultra-unlock"
  | "update"
  | "season"
  | "pokemon-go-tour"
  | "wild-area";
export type ResearchEventType =
  | "research"
  | "timed-research"
  | "limited-research"
  | "research-breakthrough"
  | "special-research";
export type RaidEventType =
  | "raid-day"
  | "raid-battles"
  | "raid-hour"
  | "raid-weekend"
  | "go-battle-league"
  | "elite-raids";
export type RocketEventType =
  | "go-rocket-takeover"
  | "team-go-rocket"
  | "giovanni-special-research";

export type EventContent = Pick<
  EventAttributes,
  "description" | "htmlContent"
>;

export type DateArray = [number, number, number, number, number]
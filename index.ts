import { existsSync, mkdirSync, writeFileSync } from "fs";
import { createEvents, EventAttributes } from "ics";
import fetch from "node-fetch";
import {
  Bonus,
  CommunityDayEvent,
  DateArray,
  EventContent,
  EventType,
  GoEvent,
  RaidBattleEvent,
  Spawn,
  SpotlightHourEvent,
} from "./types";

const dir = "./calendars"

const msInDay = 1000 * 60 * 60 * 24;

const genericRaidHourImage =
  "https://leekduck.com/assets/img/events/raidhour.jpg";

const main = async () => {
  console.log(
    `Generating calendar start time: ${new Date().toLocaleTimeString()}`
  );

  // fetch json events data
  const response = await fetch(
    "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.min.json"
  );
  const events = (await response.json()) as GoEvent[];

  // create calendars directory
  if (!existsSync(dir)) {
    mkdirSync(dir);
  }

  createAndWriteCalendar(events, ["community-day"], "communityDays");
  createAndWriteCalendar(
    events,
    ["raid-hour", "raid-day", "raid-battles", "raid-weekend", "elite-raids"],
    "raids"
  );
  createAndWriteCalendar(events, ["pokemon-spotlight-hour"], "spotlightHours");
  createAndWriteCalendar(
    events,
    ["pokemon-go-fest", "wild-area"],
    "otherMajorEvents"
  );
};

main();

const createAndWriteCalendar = (
  events: GoEvent[],
  filters: EventType[],
  calendarName: string
) => {
  const filteredEvents = events.filter((event) =>
    filters.includes(event.eventType)
  );

  const { error, value } = createEvents(filteredEvents.flatMap(eventFormatter));
  if (error) {
    console.error(error);
    return;
  }
  writeFileSync(`${dir}/${calendarName}.ics`, value);
};

// #region formatters
const eventFormatter = (
  event: GoEvent
): EventAttributes | EventAttributes[] => {
  const { name, start, end, eventType, link, extraData, image } = event;
  const startType = start.endsWith("Z") ? "utc" : "local";
  const endType = end.endsWith("Z") ? "utc" : "local";

  let eventContent: EventContent = {};
  switch (eventType) {
    case "raid-day":
    case "wild-area":
      eventContent = { htmlContent: generateImageTag(image, name) };
      break;
    case "raid-hour":
      if (image !== genericRaidHourImage) {
        eventContent = { htmlContent: generateImageTag(image, name) };
      }
      break;
    default:
      break;
  }
  if (extraData.communityday) {
    eventContent = formatCommunityDay(extraData.communityday);
  }
  if (extraData.spotlight) {
    eventContent = formatSpotlightHour(extraData.spotlight);
  }
  if (extraData.raidbattles) {
    eventContent = formatRaidBattles(extraData.raidbattles);
  }

  if (eventContent.htmlContent) {
    eventContent.htmlContent =
      eventContent.htmlContent.replaceAll("\n", "") +
      `<p>See also: <a href="${link}">Leek Duck</a></p>`;
  }

  const startDateArr = start.split(/-|T|:/, 5).map(Number) as DateArray;
  const endDateArr = end.split(/-|T|:/, 5).map(Number) as DateArray;

  const eventAttr: EventAttributes = {
    ...eventContent,
    busyStatus: "FREE",
    categories: [eventType],
    end: endDateArr,
    endInputType: endType,
    endOutputType: endType,
    start: startDateArr,
    startInputType: startType,
    startOutputType: startType,
    title: name,
    url: link,
  };

  if (extraData.raidbattles) {
    //handle shadow weekend raids
    const startDate = new Date(start);
    const endDate = new Date(end);
    const msDiff = endDate.valueOf() - startDate.valueOf();
    if (
      startDate.getDay() === 6 && // starts on Saturday
      endDate.getDay() === 0 && // ends on Sunday
      msDiff > msInDay * 21 // lasts at least 3 weeks
    ) {
      const events = [];
      let weekendEndDate = startDateArr[2] + 1;
      while (weekendEndDate <= endDateArr[2]) {
        const startDateArrCopy = [...startDateArr];
        const endDateArrCopy = [...endDateArr];
        startDateArrCopy[2] = weekendEndDate - 1;
        endDateArrCopy[2] = weekendEndDate;
        events.push({
          ...eventAttr,
          start: startDateArrCopy,
          end: endDateArrCopy,
        });
        weekendEndDate += 7;
      }
      return events;
    }
    return eventAttr;
  }
  return eventAttr;
};

const formatSpotlightHour = ({
  bonus,
  list,
}: SpotlightHourEvent): EventContent => {
  const shinies = list.filter((s) => s.canBeShiny);

  const descriptionItems = [`Bonus: ${bonus}`, formatSpawns(list)];
  if (shinies.length > 0) {
    descriptionItems.push(formatShinies(shinies));
  }

  return {
    description: descriptionItems.join("\n"),
    htmlContent: `
      <h3>${bonus}</h3>
      ${formatSpawnImages(list, "Spawns: ")}
      ${formatShinies(shinies, "<p>", "</p>")}
    `,
  };
};

const formatRaidBattles = ({
  bosses,
  shinies,
}: RaidBattleEvent): EventContent => {
  const descriptionItems = [formatBosses(bosses)];
  if (shinies.length > 0) {
    descriptionItems.push(formatShinies(shinies));
  }

  return {
    description: descriptionItems.join("\n"),
    htmlContent: `
      ${formatSpawnImages(bosses, "Bosses: ")}
      ${formatSpawnImages(shinies, "Potential Shinies: ")}
    `,
  };
};

const formatCommunityDay = ({
  spawns,
  bonuses,
  bonusDisclaimers,
  shinies,
  specialresearch,
}: CommunityDayEvent): EventContent => {
  const descriptionItems = [formatSpawns(spawns)];
  if (shinies.length > 0) {
    descriptionItems.push(formatShinies(shinies));
  }
  if (bonuses.length > 0) {
    descriptionItems.push("Bonuses:");
    descriptionItems.push(...bonuses.map((b) => `  ${b.text}`));
  }
  if (bonusDisclaimers.length > 0) {
    descriptionItems.push(...bonusDisclaimers);
  }

  return {
    description: descriptionItems.join("\n"),
    htmlContent: `
      ${formatSpawnImages(spawns, "Spawns: ")}
      ${formatSpawnImages(shinies, "Potential Shinies: ")}
      ${formatBonusImages(bonuses)}
      ${bonusDisclaimers.map((b) => `<p>${b}</p>`).join("&nbsp;")}

    `,
  };
};

const formatArray = (
  items: Spawn[] | Bonus[],
  prependText = "",
  appendText = ""
) =>
  `${prependText}${items.map((s) => s.name ?? s.text).join(", ")}${appendText}`;

const formatBonuses = (bonuses: Bonus[], prependText = "", appendText = "") =>
  formatArray(bonuses, `${prependText}Bonuses: `, appendText);
const formatBosses = (bosses: Spawn[], prependText = "", appendText = "") =>
  formatArray(bosses, `${prependText}Bosses: `, appendText);
const formatShinies = (shinies: Spawn[], prependText = "", appendText = "") =>
  formatArray(shinies, `${prependText}Potential Shinies: `, appendText);
const formatSpawns = (spawns: Spawn[], prependText = "", appendText = "") =>
  formatArray(spawns, `${prependText}Spawns: `, appendText);

const formatSpawnImages = (spawns: Spawn[], caption: string) =>
  generateFigure(caption, generateImageTags(spawns));

const formatBonusImages = (bonuses: Bonus[]) => {
  if (bonuses.length === 0) {
    return "";
  }

  const images = bonuses
    .map(
      (bonus) => `
        <div style="max-width: 100px; text-align: center;">
          <figure>
            ${generateImageTag(bonus.image, bonus.text)}
            <figcaption>${bonus.text}</figcaption>
          </figure>
        </div>
      `
    )
    .join("&nbsp;");

  return `
    <p><b>Bonuses:</b></p>
    <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
      ${images}
    </div>
  `;
};

const generateFigure = (caption: string, images: string) =>
  `
    <figure>
      <figcaption><b>${caption}</b></figcaption>
      <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
        ${images}
      </div>
    </figure>
  `;

const generateImageTags = (items: Spawn[] | Bonus[]) =>
  items.map((s) => generateImageTag(s.image, s.name ?? s.text)).join("&nbsp;");

const generateImageTag = (link: string, altText: string) =>
  `<img src="${link}" alt="${altText}"/>`;

// #endregion

const axios = require("axios");
const seedrandom = require("./seedrandom");

const maxRounds = 5000;

if (!process.argv[2]) {
  console.error("Missing cycle argument.");
  console.error("Usage: node matchupsGenerator.js <cycle>");
  process.exit(1);
}

const cycle = process.argv[2];

const apiMatchups =
  "https://dashleague.games/wp-json/api/v1/stats/data?data=matchups";
const apiTiers = `https://dashleague.games/wp-json/api/v1/stats/data?data=tiers&cycle=${cycle}`;

/* Randomize array using Durstenfeld shuffle algorithm */
function shuffle(a) {
  const array = [...a];
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function getRngSeed(tiers) {
  return Object.values(tiers)
    .map((t) => t.join(""))
    .join("");
}

function addMatchup(matchups, team, opponent) {
  if (!matchups[team]) matchups[team] = [];
  if (!matchups[opponent]) matchups[opponent] = [];

  matchups[team].push(opponent);
  matchups[opponent].push(team);
}

function genMatchups(matchups, tiers, tier, maxRematches) {
  const newMatchups = {};
  const rematchesAdded = [];

  const findMatchups = (team) =>
    Object.values(newMatchups).filter((matches) => matches.includes(team));

  const findUnfinishedMatchups = () =>
    tiers[tier].filter(
      (team) => !newMatchups[team] || newMatchups[team].length < 2
    );

  for (const team of shuffle(tiers[tier])) {
    if (!newMatchups[team]) newMatchups[team] = [];
    if (newMatchups[team].length === 2) continue;

    const otherTeams = shuffle(tiers[tier].filter((t) => t !== team));

    const rematches = otherTeams.filter(
      (t) =>
        ((matchups[t] || []).includes(team) ||
          (matchups[team] || []).includes(t)) &&
        findMatchups(t).length < 2
    );

    const newOpponents = otherTeams.filter(
      (opponent) =>
        !rematches.includes(opponent) && findMatchups(opponent).length < 2
    );

    const matchupsLeft = 2 - (newMatchups[team] || []).length;

    if (matchupsLeft > newOpponents.length) {
      // if no opponents are found, try adding rematches
      if (rematches.length > 0 && rematchesAdded.length < maxRematches) {
        const opponent = rematches.pop();
        addMatchup(newMatchups, team, opponent);

        rematchesAdded.push([team, opponent]);
        continue;
      }

      break;
    }

    for (let a = matchupsLeft; a > 0; a--) {
      addMatchup(newMatchups, team, newOpponents.pop());
    }
  }

  if (findUnfinishedMatchups().length === 0) {
    const rematchList = rematchesAdded
      .map((m) => `${m[0]} vs ${m[1]}`)
      .join(", ");

    if (rematchesAdded.length > 0) {
      console.log(
        `${tier} has ${rematchesAdded.length} rematches`,
        rematchesAdded.length > 0 ? rematchList : ""
      );
    }

    return newMatchups;
  }
}

async function main() {
  const matchups = (await axios.get(apiMatchups)).data.data;
  const tiers = (await axios.get(apiTiers)).data.data;

  Math.seedrandom(getRngSeed(tiers));

  const allMatchups = {};

  for (const tier in tiers) {
    let tierDone = false;
    let maxRematches = 0;

    while (!tierDone) {
      for (let rounds = maxRounds; rounds > 0; rounds--) {
        const newMatchups = genMatchups(matchups, tiers, tier, maxRematches);

        if (newMatchups) {
          tierDone = true;
          allMatchups[tier] = newMatchups;
          break;
        }
      }

      // creating matches with the allowed number of rematches failed, try again
      // with 1 more rematch allowed
      maxRematches += 1;
    }
  }

  for (const tier in allMatchups) {
    console.log(`\n${tier[0].toUpperCase()}${tier.slice(1)}`);
    for (const team of tiers[tier]) {
      console.log(`  ${team}: ${shuffle(allMatchups[tier][team]).join(", ")}`);
    }
  }

  console.log();
  console.log(JSON.stringify(allMatchups));
}

main();

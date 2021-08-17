# Dash League Matchup Generator

This project provides a way to generate randomized matchups for Dash League,
while reducing the amount of rematches as much as possible. It's done through
bruteforce since it's a hard problem to solve, probably NP complete weighted
bucket sort or some stuff like that. Each tier gets randomized matchups with a
max amount of rematches for 5000 rounds, with the allowed rematch number
increasing if no valid matchups were found in those 5000 rounds.

The output is a prettified list, and a raw json dump of the tier matchups.

To run it you need node.js and the axios package.

```bash
npm i axios
node matchupsGenerator.js
```

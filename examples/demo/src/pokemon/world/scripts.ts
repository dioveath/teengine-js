import type { Mon } from "../model/mon.js";

export type PartySpec = Array<{ speciesId: number; level: number }>;

export type BattleSpec =
  | { kind: "wild"; party: PartySpec }
  | {
      kind: "trainer";
      trainerName: string;
      payout: number;
      party: PartySpec;
      npcId?: string;
    };

export type BattleResult = { won: boolean; caught: boolean; fled: boolean };

/**
 * Facade over the running game that scripts may manipulate. Implemented
 * structurally by the Game orchestrator.
 */
export interface GameFacade {
  dex: {
    learnset(speciesId: number): string[];
    move(key: string): { displayName: string };
    species(id: number): { displayName: string };
  };
  party: Mon[];
  storage: Mon[];
  bag: Map<string, number>;
  money: number;
  flags: Record<string, boolean>;
  counters: Record<string, number>;

  addMon(speciesId: number, level: number): Mon;
  healParty(): void;
  giveItem(itemKey: string, count?: number): void;
}

export interface ScriptApi {
  say(text: string): Promise<void>;
  choose(prompt: string, options: string[], cancelable?: boolean): Promise<number>;
  battle(spec: BattleSpec): Promise<BattleResult>;
  shop(): Promise<void>;
  ending(): Promise<void>;
  readonly game: GameFacade;
}

const BULBASAUR = 1;
const CHARMANDER = 4;
const SQUIRTLE = 7;
const CATERPIE = 10;
const WEEDLE = 13;
const PIDGEY = 16;
const RATTATA = 19;
const NIDORAN_F = 29;
const GEODUDE = 74;
const ONIX = 95;
const ROCKRUFF = 744;

const STARTERS = [BULBASAUR, CHARMANDER, SQUIRTLE] as const;

function rivalCounter(chosenId: number): number {
  if (chosenId === CHARMANDER) return SQUIRTLE;
  if (chosenId === SQUIRTLE) return BULBASAUR;
  return CHARMANDER;
}

export const SCRIPTS: Record<string, (api: ScriptApi) => Promise<void>> = {
  async intro(api) {
    await api.say("Far from any trade road lies VELMORA, a region where evergreen forests meet old volcanoes.");
    await api.say("Here, people and wild monsters have shared the land for a thousand years — partners, not masters.");
    await api.say("But lately the wilds have stirred, and the roads north have gone quiet...");
    await api.say("ASTER! Time to wake up! PROFESSOR SAGE was asking for you!");
    await api.say("(Walk with the ARROW KEYS or WASD. Z talks and confirms. X cancels. ENTER opens the menu.)");
  },

  async professor(api) {
    const g = api.game;
    if (!g.flags.gotStarter) {
      await api.say("SAGE: Aster! There you are. Velmora's wilds have grown restless lately.");
      await api.say("SAGE: The old bond between people and monsters is fading. I believe you can rekindle it.");
      await api.say("SAGE: I've prepared three young monsters. Choose the partner that calls to you!");
      const choice = await api.choose("Take a partner?", ["LEAF pup", "EMBER pup", "TIDE pup"]);
      if (choice < 0) {
        await api.say("SAGE: No rush. Your partner will find you.");
        return;
      }
      const starterId = STARTERS[choice]!;
      const mon = g.addMon(starterId, 5);
      g.flags.gotStarter = true;
      await api.say(`You received ${mon.displayName}!`);
      await api.say("SAGE: Marvelous. That spark in its eyes... nurture it well.");
      await api.say("SAGE: Take these too — five POKE BALLS for the road.");
      g.giveItem("poke-ball", 5);
      await api.say("KESTREL: Hold it, gramps! If Aster gets a monster, so do I!");
      const rivalId = rivalCounter(starterId);
      await api.say(`KESTREL sent out ${g.dex.species(rivalId).displayName}!`);
      const result = await api.battle({
        kind: "trainer",
        trainerName: "RIVAL KESTREL",
        payout: 300,
        party: [{ speciesId: rivalId, level: 5 }],
      });
      if (result.won) {
        await api.say("KESTREL: Tch! Beginner's luck, that's all!");
        await api.say("SAGE: Ha! A rivalry already in bloom.");
      } else {
        await api.say("KESTREL: Heh! Told you I'm a natural.");
        await api.say("SAGE: Every trainer stumbles at first. Rest, then try the route north.");
        g.healParty();
      }
      await api.say("SAGE: Head north through PINECREST PATH. Prove yourself at TERRA GYM!");
      g.flags.rivalDone = true;
    } else {
      await api.say("SAGE: A trainer's bond deepens with every step through tall grass.");
      if (!g.flags.badge) {
        await api.say("SAGE: BRAMBLE at TERRA GYM commands stone like it was clay. Prepare well!");
      } else {
        await api.say("SAGE: The TERRA BADGE suits you. The north awaits, Aster.");
      }
    }
  },

  async rivalLab(api) {
    if (!api.game.flags.rivalDone) {
      await api.say("KESTREL: Stay out of my way, Aster. I'm taking the strongest partner first!");
    } else {
      await api.say("KESTREL: Next time we battle, I won't lose. Count on it!");
    }
  },

  async aide(api) {
    await api.say("AIDE: The PC stores every monster you catch past your six-party limit.");
    await api.say("AIDE: Type match-ups decide battles. WATER douses FIRE, FIRE scorches GRASS...");
  },

  async mom(api) {
    await api.say("MOM: Off to see the world already? Your father did the same at your age.");
    await api.say("MOM: Let me look at your monsters...");
    api.game.healParty();
    await api.say("MOM: There! Fighting fit. Be safe out there, dear.");
  },

  async rivalSis(api) {
    await api.say("KESTREL's sister: My brother left for his journey in such a hurry!");
    if (!api.game.flags.gotSisPotion) {
      api.game.flags.gotSisPotion = true;
      api.game.giveItem("potion");
      await api.say("She gave you a POTION for the road!");
    } else {
      await api.say("She waves as you go. Good luck out there!");
    }
  },

  async nurse(api) {
    await api.say("NURSE IVY: Welcome to the MON CENTER! Shall I heal your monsters?");
    const choice = await api.choose("Heal your party?", ["YES", "NO"], true);
    if (choice === 0) {
      api.game.healParty();
      await api.say("NURSE IVY: ...All healed! Fighting fit for the road ahead!");
      await api.say("NURSE IVY: We hope to see you again!");
    } else {
      await api.say("NURSE IVY: Take care out there!");
    }
  },

  async clerk(api) {
    await api.say("CLERK FINN: Welcome! How can I help?");
    await api.shop();
    await api.say("CLERK FINN: Come again!");
  },

  async kidGrass(api) {
    await api.say("KID: Wild monsters hide in tall grass! Walk right in and see.");
    await api.say("KID: Weaken them first, then throw a BALL. That's the trick!");
  },

  async elderPond(api) {
    await api.say("ELDER MIRA: This pond remembers the first village, long before any gym stood here.");
    await api.say("ELDER MIRA: Storms sweep PINECREST PATH, yet the keeper only waves through badge holders.");
  },

  async guardian(api) {
    const g = api.game;
    if (!g.flags.badge) {
      await api.say("KEEPER ORLA: Whoa there! The north road is closed.");
      await api.say("KEEPER ORLA: Only trainers wearing the TERRA BADGE may pass. LEADER BRAMBLE tests worth!");
    } else {
      await api.say("KEEPER ORLA: A fresh TERRA BADGE! The north is yours, trainer.");
      await api.say("KEEPER ORLA: Beyond this gate lies the rest of VELMORA... but that is another chapter.");
    }
  },

  async battleTobi(api) {
    if (api.game.counters.trainer_tobi) {
      await api.say("TOBI: My RATATA will bounce back. You'll see!");
      return;
    }
    await api.say("TOBI: Hey! My critter heard there's easy prey on this path!");
    const result = await api.battle({
      kind: "trainer",
      trainerName: "YOUNGSTER TOBI",
      payout: 160,
      party: [{ speciesId: RATTATA, level: 4 }],
      npcId: "trainer_tobi",
    });
    if (result.won) await api.say("TOBI: Wha—?! Rematch someday!");
  },

  async battleMira(api) {
    if (api.game.counters.trainer_mira) {
      await api.say("MIRA: Bugs teach patience. You rushed me and got lucky!");
      return;
    }
    await api.say("MIRA: Shhh... you'll scare the CATERPIE. Too late! Battle!");
    const result = await api.battle({
      kind: "trainer",
      trainerName: "BUG CATCHER MIRA",
      payout: 140,
      party: [
        { speciesId: CATERPIE, level: 3 },
        { speciesId: WEEDLE, level: 3 },
      ],
      npcId: "trainer_mira",
    });
    if (result.won) await api.say("MIRA: My bugs did their best...");
  },

  async battleWren(api) {
    if (api.game.counters.trainer_wren) {
      await api.say("WREN: My birds will circle back around someday.");
      return;
    }
    await api.say("WREN: I train where the wind is strongest. Show me your form!");
    const result = await api.battle({
      kind: "trainer",
      trainerName: "LASS WREN",
      payout: 180,
      party: [
        { speciesId: PIDGEY, level: 4 },
        { speciesId: NIDORAN_F, level: 5 },
      ],
      npcId: "trainer_wren",
    });
    if (result.won) await api.say("WREN: A strong updraft carried you this time!");
  },

  async battleAnsel(api) {
    if (api.game.counters.keeper_ansel) {
      await api.say("ANSEL: Stone lasts longer than pride, challenger. Remember that.");
      return;
    }
    await api.say("ANSEL: I am KEEPER ANSEL. Stone is patient. Are you?");
    const result = await api.battle({
      kind: "trainer",
      trainerName: "KEEPER ANSEL",
      payout: 400,
      party: [{ speciesId: GEODUDE, level: 9 }],
      npcId: "keeper_ansel",
    });
    if (result.won) await api.say("ANSEL: Eroded already... Go on through.");
  },

  async battlePetra(api) {
    if (api.game.counters.keeper_petra) {
      await api.say("PETRA: ROCKRUFF howls for a rematch. Not today, though.");
      return;
    }
    await api.say("PETRA: I am KEEPER PETRA. My partner smells your nerves!");
    const result = await api.battle({
      kind: "trainer",
      trainerName: "KEEPER PETRA",
      payout: 450,
      party: [{ speciesId: ROCKRUFF, level: 10 }],
      npcId: "keeper_petra",
    });
    if (result.won) await api.say("PETRA: Down already?! Leader BRAMBLE is past me. Good luck!");
  },

  async battleBramble(api) {
    const g = api.game;
    if (g.flags.badge) {
      await api.say("BRAMBLE: Wear the TERRA BADGE proudly. Few earn it.");
      return;
    }
    await api.say("BRAMBLE: Welcome to TERRA GYM. I am BRAMBLE.");
    await api.say("BRAMBLE: Stone endures what flash burns away. Show me what endures in you!");
    const result = await api.battle({
      kind: "trainer",
      trainerName: "LEADER BRAMBLE",
      payout: 1500,
      party: [
        { speciesId: GEODUDE, level: 11 },
        { speciesId: ONIX, level: 13 },
      ],
    });
    if (result.won) {
      g.flags.badge = true;
      await api.say("BRAMBLE: Magnificent! The stone cracks open for you.");
      await api.say("You received the TERRA BADGE!");
      await api.say("BRAMBLE: KEEPER ORLA guards the north gate. Show her your badge, and the road opens.");
    } else {
      await api.say("BRAMBLE: Come back when your roots run deeper, challenger.");
      g.healParty();
    }
  },
};

export const SIGN_TEXT: Record<string, string> = {
  "town:6,18": "EMBERPINE VILLAGE — Where embers meet evergreens.",
  "town:15,11": "TERRA GYM — Leader BRAMBLE. 'Stone endures.'",
  "route1:9,47": "PINECREST PATH — North: NORTH GATEHOUSE. Beware tall grass!",
  "route1:15,36": "Trainer tip: weakened wilds are easier to catch!",
  "route1:4,19": "NORTH GATEHOUSE ahead. Badge required.",
};

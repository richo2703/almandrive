export type TopicDefinition = {
  slug: string;
  name: string;
  germanName: string;
  keywords: string[];
  categoryBias?: string[];
};

export const topicDefinitions: TopicDefinition[] = [
  {
    slug: "mixed",
    name: "Mixed",
    germanName: "Gemischt",
    keywords: [],
  },
  {
    slug: "traffic-signs",
    name: "Traffic Signs",
    germanName: "Verkehrszeichen",
    keywords: [
      "traffic sign",
      "traffic signs",
      "road sign",
      "road signs",
      "traffic light",
      "warning sign",
      "sign",
      "lane control",
      "verkehrszeichen",
      "zeichen",
      "schild",
    ],
  },
  {
    slug: "right-of-way",
    name: "Right of Way",
    germanName: "Vorfahrt",
    keywords: [
      "right of way",
      "priority",
      "give way",
      "yield",
      "vorfahrt",
      "vorrang",
      "vorfahrts",
    ],
  },
  {
    slug: "speed",
    name: "Speed",
    germanName: "Geschwindigkeit",
    keywords: [
      "speed",
      "speed limit",
      "km/h",
      "kph",
      "geschwindigkeit",
      "tempo",
      "faster",
      "slower",
    ],
  },
  {
    slug: "distance",
    name: "Distance",
    germanName: "Abstand",
    keywords: [
      "distance",
      "following distance",
      "stopping distance",
      "braking distance",
      "abstand",
      "bremsweg",
      "sicherheitsabstand",
    ],
  },
  {
    slug: "overtaking",
    name: "Overtaking",
    germanName: "Überholen",
    keywords: [
      "overtak",
      "pass",
      "passing",
      "überholen",
      "ueberholen",
    ],
  },
  {
    slug: "parking-and-stopping",
    name: "Parking and Stopping",
    germanName: "Halten und Parken",
    keywords: [
      "park",
      "parking",
      "stop",
      "stopping",
      "halten",
      "parken",
    ],
  },
  {
    slug: "turning-and-intersections",
    name: "Turning and Intersections",
    germanName: "Abbiegen und Kreuzungen",
    keywords: [
      "turn",
      "turning",
      "intersection",
      "intersections",
      "junction",
      "crossroad",
      "crossing",
      "abbiegen",
      "kreuzung",
      "einbiegen",
      "wenden",
    ],
  },
  {
    slug: "alcohol-and-drugs",
    name: "Alcohol and Drugs",
    germanName: "Alkohol und Drogen",
    keywords: [
      "alcohol",
      "drugs",
      "drug",
      "drunk",
      "alkohol",
      "drogen",
      "berauscht",
      "medication",
      "medicine",
    ],
  },
  {
    slug: "environment",
    name: "Environment",
    germanName: "Umwelt",
    keywords: [
      "environment",
      "eco",
      "fuel",
      "consumption",
      "emission",
      "pollution",
      "umwelt",
      "kraftstoff",
      "verbrauch",
      "sprit",
    ],
  },
  {
    slug: "technical-knowledge",
    name: "Technical Knowledge",
    germanName: "Technisches Wissen",
    keywords: [
      "brake",
      "braking",
      "engine",
      "tyre",
      "tire",
      "wheel",
      "oil",
      "abs",
      "bremse",
      "reifen",
      "technik",
      "motor",
    ],
  },
  {
    slug: "hazard-awareness",
    name: "Hazard Awareness",
    germanName: "Gefahrenwahrnehmung",
    keywords: [
      "danger",
      "hazard",
      "hazards",
      "risk",
      "gefahr",
      "gefahren",
    ],
  },
  {
    slug: "emergency-behavior",
    name: "Emergency Behavior",
    germanName: "Verhalten in Notfällen",
    keywords: [
      "accident",
      "emergency",
      "first aid",
      "injury",
      "unfall",
      "erste hilfe",
      "notfall",
      "rescue",
      "breakdown",
    ],
  },
  {
    slug: "trailer",
    name: "Trailer",
    germanName: "Anhänger",
    keywords: [
      "trailer",
      "tow",
      "coupling",
      "anhanger",
      "anhaenger",
      "anhänger",
    ],
    categoryBias: ["B96", "BE", "C1E", "CE", "D1E", "DE"],
  },
  {
    slug: "truck",
    name: "Truck",
    germanName: "Lkw",
    keywords: [
      "truck",
      "lorry",
      "cargo",
      "load",
      "freight",
      "ladung",
      "lkw",
      "goods vehicle",
      "heavy vehicle",
    ],
    categoryBias: ["C1", "C1E", "C", "CE"],
  },
  {
    slug: "bus",
    name: "Bus",
    germanName: "Bus",
    keywords: [
      "bus",
      "passengers",
      "fahrgaeste",
      "coach",
      "minibus",
    ],
    categoryBias: ["D1", "D1E", "D", "DE"],
  },
  {
    slug: "motorcycle",
    name: "Motorcycle",
    germanName: "Motorrad",
    keywords: [
      "motorcycle",
      "motorbike",
      "motorrad",
      "two wheeler",
      "zweirad",
      "rider",
    ],
    categoryBias: ["AM", "A1", "A2", "A"],
  },
  {
    slug: "agricultural-vehicles",
    name: "Agricultural Vehicles",
    germanName: "Landwirtschaftliche Fahrzeuge",
    keywords: [
      "tractor",
      "agricultural",
      "farm",
      "landwirtschaft",
      "traktor",
      "agrar",
    ],
    categoryBias: ["L", "T"],
  },
  {
    slug: "road-signs",
    name: "Road Signs",
    germanName: "Straßenzeichen",
    keywords: [
      "road sign",
      "road signs",
      "signs",
      "warning sign",
      "regulatory sign",
      "directional sign",
      "zeichen",
      "schild",
    ],
  },
  {
    slug: "safe-driving",
    name: "Safe Driving",
    germanName: "Sicheres Fahren",
    keywords: [
      "safe driving",
      "safe",
      "defensive",
      "blind spot",
      "visibility",
      "distraction",
      "fatigue",
      "fahrsicherheit",
    ],
  },
  {
    slug: "vehicle-technology",
    name: "Vehicle Technology",
    germanName: "Fahrzeugtechnik",
    keywords: [
      "brake",
      "engine",
      "tyre",
      "tire",
      "oil",
      "coolant",
      "maintenance",
      "technology",
      "technik",
      "fahrzeugtechnik",
    ],
  },
  {
    slug: "professional-driving",
    name: "Professional and Heavy Vehicles",
    germanName: "Berufskraftverkehr und schwere Fahrzeuge",
    keywords: [
      "professional",
      "heavy vehicle",
      "truck driver",
      "driver qualification",
      "goods vehicle",
      "cargo",
      "load",
      "berufskraftverkehr",
      "kraftfahrer",
    ],
    categoryBias: ["C1", "C1E", "C", "CE", "D1", "D1E", "D", "DE"],
  },
];

export const learningTopicSlugs = topicDefinitions.map((topic) => topic.slug);

export function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function topicMatchScore(
  corpus: string,
  topic: TopicDefinition,
  categoryCode?: string | null,
) {
  if (topic.slug === "mixed") return 0;
  const normalizedCorpus = ` ${normalizeMatchText(corpus)} `;
  let score = 0;
  for (const keyword of topic.keywords) {
    const normalizedKeyword = normalizeMatchText(keyword);
    if (!normalizedKeyword) continue;
    if (normalizedCorpus.includes(` ${normalizedKeyword} `)) {
      score += normalizedKeyword.split(" ").length > 1 ? 3 : 1;
    }
  }
  if (categoryCode && topic.categoryBias?.includes(categoryCode)) {
    score += 1;
  }
  return score;
}

export function classifyTopic(
  corpus: string,
  categoryCode?: string | null,
) : TopicDefinition {
  const mixedTopic = topicDefinitions[0] ?? {
    slug: "mixed",
    name: "Mixed",
    germanName: "Gemischt",
    keywords: [],
  };
  let best: TopicDefinition = mixedTopic;
  let bestScore = 0;
  let bestPriority = 0;
  for (const [priority, topic] of topicDefinitions.entries()) {
    const score = topicMatchScore(corpus, topic, categoryCode);
    if (score > bestScore || (score === bestScore && priority < bestPriority)) {
      best = topic;
      bestScore = score;
      bestPriority = priority;
    }
  }
  return bestScore > 0 ? best : mixedTopic;
}

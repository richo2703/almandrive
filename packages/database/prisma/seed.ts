import "../src/load-env.js";
import {
  PrismaClient,
  QuestionType,
} from "@prisma/client";
import {
  languageCodes,
  licenseCategoryCodes,
} from "@theorie-direkt/shared";

const prisma = new PrismaClient();

const languages = [
  ["de", "German", "Deutsch", false],
  ["en", "English", "English", false],
  ["ru", "Russian", "Русский", false],
  ["tr", "Turkish", "Türkçe", false],
  ["ar", "Arabic", "العربية", true],
  ["ro", "Romanian", "Română", false],
  ["pl", "Polish", "Polski", false],
  ["hr", "Croatian", "Hrvatski", false],
  ["pt", "Portuguese", "Português", false],
  ["es", "Spanish", "Español", false],
  ["it", "Italian", "Italiano", false],
  ["fr", "French", "Français", false],
  ["el", "Greek", "Ελληνικά", false],
] as const;

const categoryNames: Record<string, string> = {
  AM: "Mopeds and light quadricycles",
  A1: "Light motorcycles",
  A2: "Medium motorcycles",
  A: "Motorcycles",
  B: "Passenger cars",
  BF17: "Accompanied driving from 17",
  B197: "Category B with automatic test",
  B96: "Car and trailer combination",
  BE: "Passenger car with trailer",
  C1: "Medium goods vehicles",
  C1E: "Medium goods vehicle combinations",
  C: "Heavy goods vehicles",
  CE: "Heavy goods vehicle combinations",
  D1: "Minibuses",
  D1E: "Minibus combinations",
  D: "Buses",
  DE: "Bus combinations",
  L: "Agricultural tractors",
  T: "High-speed agricultural tractors",
};

const topics = [
  ["mixed", "Mixed"],
  ["traffic-signs", "Traffic Signs"],
  ["right-of-way", "Right of way"],
  ["speed", "Speed"],
  ["distance", "Distance"],
  ["overtaking", "Overtaking"],
  ["parking-and-stopping", "Parking and Stopping"],
  ["turning-and-intersections", "Turning and Intersections"],
  ["alcohol-and-drugs", "Alcohol and Drugs"],
  ["environment", "Environment"],
  ["technical-knowledge", "Technical knowledge"],
  ["hazard-awareness", "Hazard awareness"],
  ["emergency-behavior", "Emergency behavior"],
  ["trailer", "Trailer"],
  ["truck", "Truck"],
  ["bus", "Bus"],
  ["motorcycle", "Motorcycle"],
  ["agricultural-vehicles", "Agricultural vehicles"],
  ["road-signs", "Road signs"],
  ["safe-driving", "Safe driving"],
  ["vehicle-technology", "Vehicle technology"],
  ["professional-driving", "Professional and heavy vehicles"],
] as const;

type DemoQuestion = {
  id: string;
  category: "B" | "C" | "CE";
  topic: string;
  type: QuestionType;
  difficulty: number;
  text: string;
  explanation: string;
  answers: [string, boolean][];
};

const bPrompts = [
  ["road-signs", "What is the safest response when a temporary road sign conflicts with a permanent sign?", "Follow the temporary sign because it reflects the current traffic arrangement.", ["Follow the temporary sign", true], ["Follow the permanent sign", false], ["Stop and wait for another driver", false], ["Ignore both signs", false]],
  ["safe-driving", "Which checks should you make before changing lanes?", "Use mirrors, signal in good time, and check the blind spot before moving.", ["Check the mirrors", true], ["Signal clearly", true], ["Check the blind spot", true], ["Accelerate without checking", false]],
  ["right-of-way", "At an unsigned intersection, what general rule should you prepare to apply?", "In the absence of signs, signals, or other controls, traffic from the right generally has priority.", ["Give way to traffic from the right", true], ["The larger vehicle always goes first", false], ["The faster vehicle goes first", false], ["Traffic from the left always goes first", false]],
  ["safe-driving", "What should you do when visibility becomes poor in heavy rain?", "Reduce speed and increase the following distance so you have more time to react.", ["Reduce speed", true], ["Increase following distance", true], ["Drive close to the vehicle ahead", false], ["Use high beams at all times", false]],
  ["vehicle-technology", "What can an illuminated red oil-pressure warning indicate?", "Low oil pressure can quickly damage the engine, so stop safely and investigate.", ["A potentially serious lubrication problem", true], ["The fuel tank is full", false], ["The tyres are cold", false], ["The radio is disconnected", false]],
  ["environment", "Which driving style usually reduces fuel consumption?", "Smooth acceleration, early anticipation, and avoiding unnecessary high engine speeds save fuel.", ["Accelerate smoothly", true], ["Anticipate traffic early", true], ["Use unnecessarily high engine speeds", false], ["Brake late and hard", false]],
  ["safe-driving", "Why should you keep extra distance behind a motorcycle?", "Motorcycles can slow quickly and may need to change position to avoid surface hazards.", ["To allow more reaction time", true], ["Because motorcycles cannot brake", false], ["To block other traffic", false], ["To force the rider to speed up", false]],
  ["road-signs", "A lane-control signal shows a red cross above your lane. What does it mean?", "A red cross means the lane is closed and must not be used.", ["The lane is closed", true], ["The lane is only for parking", false], ["You must increase speed", false], ["Overtaking is required", false]],
  ["right-of-way", "You approach a pedestrian crossing where a person is clearly waiting to cross. What should you do?", "Approach at a speed that lets you stop and allow the person to cross safely.", ["Reduce speed and be ready to stop", true], ["Sound the horn and continue", false], ["Overtake any slowing vehicle", false], ["Stop on the crossing", false]],
  ["vehicle-technology", "Which condition can increase braking distance?", "Wet roads reduce available grip and therefore increase braking distance.", ["A wet road surface", true], ["Correct tyre pressure", false], ["Good visibility", false], ["A clean windscreen", false]],
  ["safe-driving", "What is the main purpose of checking the blind spot?", "The direct shoulder check can reveal road users hidden from the mirrors.", ["To detect road users not visible in mirrors", true], ["To read rear-seat labels", false], ["To adjust the head restraint", false], ["To check fuel level", false]],
  ["environment", "When is it sensible to switch off the engine during a longer wait?", "When the stop is expected to last, switching off can avoid unnecessary fuel use and emissions if it is safe to do so.", ["When a longer stationary wait is expected", true], ["While rolling downhill", false], ["During every gear change", false], ["When steering through a bend", false]],
  ["road-signs", "What should you expect near a warning sign for children?", "Children may enter the road unexpectedly, so reduce speed and watch both sides carefully.", ["Children may enter the road unexpectedly", true], ["The road is closed to pedestrians", false], ["Parking is always permitted", false], ["Only buses may continue", false]],
  ["right-of-way", "An emergency vehicle approaches with blue lights and siren. What should you do?", "Create a clear path promptly without endangering others.", ["Create a clear path safely", true], ["Race ahead of it", false], ["Stop in the middle of an intersection", false], ["Ignore it if your light is green", false]],
  ["safe-driving", "Which actions help prevent distraction before starting a journey?", "Set navigation and secure loose items before moving.", ["Set navigation before moving", true], ["Secure loose items", true], ["Type messages while driving slowly", false], ["Hold the phone below the window line", false]],
  ["vehicle-technology", "Why is correct tyre pressure important?", "Correct pressure supports stable handling, predictable braking, tyre life, and efficient fuel use.", ["It supports handling and efficiency", true], ["It makes seat belts unnecessary", false], ["It replaces tread depth", false], ["It prevents all punctures", false]],
  ["safe-driving", "What should you do if you feel too tired to continue safely?", "Stop at a safe place and take an effective break rather than trying to push through fatigue.", ["Stop safely and take a break", true], ["Open a window and continue indefinitely", false], ["Drive faster to arrive sooner", false], ["Follow another vehicle more closely", false]],
  ["road-signs", "What does a yellow traffic light generally require when you can stop safely?", "A yellow light warns that the signal is changing; stop if this can be done safely.", ["Stop before the line if safe", true], ["Always accelerate", false], ["Reverse away from the junction", false], ["Ignore the signal at night", false]],
  ["right-of-way", "Before turning right, why must you check for cyclists?", "Cyclists may be travelling straight alongside you and can be hidden in mirrors or blind spots.", ["They may continue straight beside you", true], ["They must always stop behind cars", false], ["Cycles are not allowed near junctions", false], ["Only pedestrians can have priority", false]],
  ["environment", "Which route choice is usually more efficient?", "A steady route with fewer stops can be more efficient than a shorter route with heavy congestion.", ["A steady route with fewer stops", true], ["The route with the most acceleration", false], ["Any route using only low gears", false], ["The route with repeated short stops", false]],
] as const;

const heavyPrompts = [
  ["C", "professional-driving", "Why must a heavy vehicle driver account for a larger turning area?", "Long wheelbases and rear-wheel paths can cause the vehicle to cut across the inside of a turn.", ["The rear wheels can track inside the front wheels", true], ["Heavy vehicles always steer from the rear", false], ["The cab becomes narrower in turns", false], ["The trailer lifts off the road", false]],
  ["C", "vehicle-technology", "What should be checked when securing a heavy vehicle load?", "The load must be distributed and restrained so it cannot slide, tip, roll, or fall.", ["Weight distribution", true], ["Suitable restraints", true], ["Whether the load can move freely", false], ["Only the colour of the straps", false]],
  ["C", "safe-driving", "How does a high centre of gravity affect a truck?", "A high centre of gravity increases rollover risk, especially during abrupt steering or cornering.", ["It increases rollover risk", true], ["It always shortens braking distance", false], ["It removes side-wind effects", false], ["It improves sharp cornering", false]],
  ["C", "professional-driving", "Why should a truck driver leave a larger following distance?", "Heavy vehicles need more space to stop and a larger view ahead helps with early planning.", ["To allow for longer stopping distance", true], ["To prevent cars from overtaking", false], ["To keep the engine warmer", false], ["To hide road signs", false]],
  ["C", "vehicle-technology", "What is the purpose of a daily walk-around inspection?", "It can identify visible safety defects before the vehicle enters traffic.", ["To identify visible safety defects", true], ["To replace scheduled maintenance", false], ["To calculate road tolls only", false], ["To clean the cab interior only", false]],
  ["CE", "professional-driving", "What is a key risk when reversing a truck and trailer?", "The combination can change direction quickly and large blind areas make observation difficult.", ["The trailer can move into blind areas", true], ["The trailer always follows a straight line", false], ["Steering has no effect on the trailer", false], ["Reversing removes articulation", false]],
  ["CE", "vehicle-technology", "Before coupling a trailer, what should the driver confirm?", "The coupling components must be compatible, correctly aligned, locked, and connected.", ["The coupling is correctly locked", true], ["Air and electrical lines are connected", true], ["The trailer brake is permanently released", false], ["The landing legs carry the load while driving", false]],
  ["CE", "safe-driving", "What can cause a trailer to swing during an emergency manoeuvre?", "Abrupt steering, unsuitable speed, and poor load distribution can destabilise the combination.", ["Abrupt steering", true], ["Unsuitable speed", true], ["Poor load distribution", true], ["Smooth progressive inputs", false]],
  ["CE", "professional-driving", "Why must the driver consider the trailer's off-tracking?", "The trailer wheels follow a tighter path and may endanger kerbs, cyclists, or roadside objects.", ["The trailer follows a tighter inner path", true], ["The trailer always moves outside the cab path", false], ["It only matters on straight roads", false], ["It eliminates blind spots", false]],
  ["CE", "vehicle-technology", "After coupling, why perform a low-speed pull test?", "A gentle pull can help confirm that the coupling is engaged before entering traffic.", ["To help confirm secure engagement", true], ["To warm the tyres", false], ["To release all trailer brakes permanently", false], ["To increase load height", false]],
  ["C", "safe-driving", "How should a truck driver respond to strong crosswinds?", "Reduce speed, keep a firm and smooth steering input, and allow extra space around the vehicle.", ["Reduce speed", true], ["Use smooth steering inputs", true], ["Leave extra lateral space", true], ["Make abrupt steering corrections", false]],
  ["C", "vehicle-technology", "Why must wheel nuts and tyres be included in regular inspections?", "Loose fixings or damaged tyres can lead to loss of control and serious component failure.", ["Defects can create a serious safety risk", true], ["They only affect cab comfort", false], ["They are checked only when washing", false], ["Inspection is unnecessary after maintenance", false]],
  ["C", "professional-driving", "What should be considered before entering a road with a height restriction?", "The driver must know the vehicle's actual height, including its load, and compare it with the signed limit.", ["The vehicle's actual loaded height", true], ["Only the cab colour", false], ["The number of mirrors", false], ["The driver's seat position", false]],
  ["C", "safe-driving", "Why is early observation especially important in a heavy vehicle?", "Early observation provides time to slow progressively and avoids abrupt manoeuvres with a large vehicle.", ["It allows smoother, earlier decisions", true], ["It removes the need for mirrors", false], ["It guarantees an empty road", false], ["It shortens the vehicle", false]],
  ["C", "environment", "Which practice can reduce unnecessary emissions from a heavy vehicle?", "Route planning and steady, anticipated driving reduce avoidable idling, acceleration, and braking.", ["Plan the route", true], ["Drive steadily", true], ["Idle whenever parked", false], ["Accelerate hard toward congestion", false]],
  ["CE", "professional-driving", "What should be checked before disconnecting a trailer?", "The trailer should be on suitable ground, secured against movement, and supported correctly before uncoupling.", ["The trailer is secured against movement", true], ["The ground and support are suitable", true], ["All restraints are removed first", false], ["The tractor remains in gear and unattended", false]],
  ["CE", "safe-driving", "How should speed be managed before a bend with a loaded trailer?", "Select a safe speed before entering the bend and use smooth steering to keep the combination stable.", ["Reduce to a safe speed before the bend", true], ["Brake sharply halfway through the bend", false], ["Accelerate to pull the trailer straight", false], ["Move across both lanes", false]],
  ["CE", "vehicle-technology", "Why are the trailer air-line connections important?", "Correct air connections allow the trailer braking system to operate as designed.", ["They support correct trailer brake operation", true], ["They power the cab radio", false], ["They replace the mechanical coupling", false], ["They increase load capacity", false]],
  ["CE", "professional-driving", "What is the purpose of checking the trailer doors before departure?", "Doors and closures must be secure so they cannot open or release cargo while moving.", ["To confirm doors and closures are secure", true], ["To improve engine cooling", false], ["To reduce steering effort", false], ["To disengage the parking brake", false]],
  ["CE", "safe-driving", "When descending a long gradient with a combination, why use an appropriate lower gear or auxiliary brake?", "Controlled retardation helps maintain a safe speed and reduces overheating of the service brakes.", ["To control speed and protect service brakes", true], ["To make the trailer lighter", false], ["To disconnect the engine from the wheels", false], ["To avoid all use of mirrors", false]],
] as const;

const demoQuestions: DemoQuestion[] = [
  ...bPrompts.map((row, index) => ({
    id: `demo-b-${String(index + 1).padStart(3, "0")}`,
    category: "B" as const,
    topic: row[0],
    type: row.slice(3).filter((answer) => answer[1]).length > 1
      ? QuestionType.MULTIPLE_CHOICE
      : QuestionType.SINGLE_CHOICE,
    difficulty: (index % 3) + 1,
    text: row[1],
    explanation: row[2],
    answers: row.slice(3) as unknown as [string, boolean][],
  })),
  ...heavyPrompts.map((row, index) => ({
    id: `demo-${row[0].toLowerCase()}-${String(index + 1).padStart(3, "0")}`,
    category: row[0] as "C" | "CE",
    topic: row[1],
    type: row.slice(4).filter((answer) => answer[1]).length > 1
      ? QuestionType.MULTIPLE_CHOICE
      : QuestionType.SINGLE_CHOICE,
    difficulty: 2 + (index % 2),
    text: row[2],
    explanation: row[3],
    answers: row.slice(4) as unknown as [string, boolean][],
  })),
];

async function main() {
  for (const [code, name, nativeName, isRtl] of languages) {
    await prisma.language.upsert({
      where: { code },
      update: {
        name,
        nativeName,
        isRtl,
        isInterfaceActive: true,
        isContentActive: code === "en",
      },
      create: {
        code,
        name,
        nativeName,
        isRtl,
        isInterfaceActive: true,
        isContentActive: code === "en",
      },
    });
  }

  for (const [index, code] of licenseCategoryCodes.entries()) {
    await prisma.licenseCategory.upsert({
      where: { code },
      update: { name: categoryNames[code]!, sortOrder: index },
      create: {
        code,
        name: categoryNames[code]!,
        description: categoryNames[code]!,
        sortOrder: index,
      },
    });
  }

  const english = await prisma.language.findUniqueOrThrow({ where: { code: "en" } });

  for (const [index, [slug, name]] of topics.entries()) {
    const topic = await prisma.topic.upsert({
      where: { slug },
      update: { sortOrder: index },
      create: { slug, sortOrder: index },
    });
    await prisma.topicTranslation.upsert({
      where: { topicId_languageId: { topicId: topic.id, languageId: english.id } },
      update: { name },
      create: { topicId: topic.id, languageId: english.id, name },
    });
  }

  const categories = new Map(
    (await prisma.licenseCategory.findMany()).map((category) => [category.code, category]),
  );
  const topicMap = new Map(
    (await prisma.topic.findMany()).map((topic) => [topic.slug, topic]),
  );

  for (const item of demoQuestions) {
    const category = categories.get(item.category);
    const topic = topicMap.get(item.topic);
    if (!category || !topic) throw new Error(`Missing seed relation for ${item.id}`);

    const question = await prisma.question.upsert({
      where: { externalId: item.id },
      update: {
        categoryId: category.id,
        topicId: topic.id,
        type: item.type,
        difficulty: item.difficulty,
        isActive: true,
      },
      create: {
        externalId: item.id,
        categoryId: category.id,
        topicId: topic.id,
        type: item.type,
        difficulty: item.difficulty,
      },
    });

    await prisma.questionTranslation.upsert({
      where: { questionId_languageId: { questionId: question.id, languageId: english.id } },
      update: { text: item.text, explanation: item.explanation },
      create: {
        questionId: question.id,
        languageId: english.id,
        text: item.text,
        explanation: item.explanation,
      },
    });

    for (const [index, [text, isCorrect]] of item.answers.entries()) {
      const key = String.fromCharCode(65 + index);
      const option = await prisma.answerOption.upsert({
        where: { questionId_key: { questionId: question.id, key } },
        update: { isCorrect, sortOrder: index },
        create: { questionId: question.id, key, isCorrect, sortOrder: index },
      });
      await prisma.answerOptionTranslation.upsert({
        where: {
          answerOptionId_languageId: {
            answerOptionId: option.id,
            languageId: english.id,
          },
        },
        update: { text },
        create: { answerOptionId: option.id, languageId: english.id, text },
      });
    }
  }

  console.log(
    `Seeded ${languageCodes.length} languages, ${licenseCategoryCodes.length} categories, ${topics.length} topics, and ${demoQuestions.length} original demo questions.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

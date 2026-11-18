"""
Lietuviški atlikimo aprašymai dažniausiems pratimams (laukas instructionsLt
faile public/exercises.json). Trumpi, salėje perskaitomi per kelias sekundes.

Paleidimas: python scripts/lt_exercise_instructions.py
"""
import json
import sys
from pathlib import Path

STEPS = {
    'Barbell Squat': [
        'Štangą padėkite stove šiek tiek žemiau pečių. Palįskite po ja, kad ji gultų ant viršutinės nugaros dalies, ne ant kaklo.',
        'Nukelkite štangą, atsitraukite du žingsnius. Pėdos pečių plotyje, pirštai šiek tiek į šonus.',
        'Įkvėpkite, įtempkite pilvą ir leiskitės žemyn, klubus stumdami atgal, o kelius kreipdami pirštų kryptimi.',
        'Nusileiskite bent iki tol, kol šlaunys lygiagrečios grindims. Nugara tiesi, kulnai ant grindų.',
        'Stumdamiesi visa pėda grįžkite į viršų, iškvėpkite viršuje.',
    ],
    'Barbell Full Squat': [
        'Štanga ant viršutinės nugaros dalies, pėdos pečių plotyje, pirštai šiek tiek į šonus.',
        'Įtempkite pilvą ir leiskitės kuo giliau, išlaikydami tiesią nugarą ir kulnus ant grindų.',
        'Keliai juda pirštų kryptimi, nekrenta į vidų.',
        'Iš apatinio taško kilkite stumdami visa pėda, krūtinė lieka pakelta.',
    ],
    'Front Barbell Squat': [
        'Štanga guli ant priekinių deltinių raumenų, alkūnės pakeltos aukštai į priekį.',
        'Pėdos pečių plotyje. Įtempkite pilvą ir leiskitės žemyn, liemuo lieka beveik vertikalus.',
        'Nusileiskite iki šlaunų lygiagretumo ar žemiau, alkūnės nekrenta.',
        'Kilkite stumdami visa pėda, viršuje ištieskite klubus.',
    ],
    'Goblet Squat': [
        'Laikykite hantelį ar svarstį vertikaliai prie krūtinės abiem rankomis.',
        'Pėdos šiek tiek plačiau nei pečiai. Leiskitės žemyn, alkūnės eina tarp kelių.',
        'Nugara tiesi, krūtinė pakelta, kulnai ant grindų.',
        'Grįžkite į viršų stumdami visa pėda.',
    ],
    'Bodyweight Squat': [
        'Stovėkite pėdomis pečių plotyje, rankas ištieskite į priekį pusiausvyrai.',
        'Leiskitės žemyn klubus stumdami atgal, keliai juda pirštų kryptimi.',
        'Nusileiskite iki šlaunų lygiagretumo, nugara tiesi.',
        'Grįžkite į viršų, viršuje sutraukite sėdmenis.',
    ],
    'Barbell Deadlift': [
        'Stovėkite taip, kad štanga būtų virš pėdos vidurio. Pėdos klubų plotyje.',
        'Pasilenkite ir suimkite štangą kiek plačiau nei kojos. Nuleiskite klubus, kol blauzdos paliečia štangą.',
        'Ištieskite nugarą, pakelkite krūtinę, įtempkite pilvą. Pečiai virš štangos.',
        'Kelkite štangą stumdami grindis kojomis, štanga slysta arti kūno. Viršuje ištieskite klubus, nesilenkite atgal.',
        'Nuleiskite tuo pačiu keliu: pirma klubai atgal, kai štanga pasiekia kelius, lenkite kelius.',
    ],
    'Romanian Deadlift': [
        'Laikykite štangą ištiestomis rankomis prie šlaunų, pėdos klubų plotyje, keliai šiek tiek sulenkti.',
        'Stumkite klubus atgal ir leiskite štangą šlaunimis žemyn. Nugara visą laiką tiesi.',
        'Leiskitės, kol pajusite tempimą šlaunų gale, dažniausiai iki kelių ar šiek tiek žemiau.',
        'Grįžkite į viršų stumdami klubus į priekį ir sutraukdami sėdmenis.',
    ],
    'Stiff-Legged Barbell Deadlift': [
        'Laikykite štangą prie šlaunų, kojos beveik tiesios.',
        'Lenkitės per klubus, nugara tiesi, štanga juda arti kojų.',
        'Nusileiskite iki stipraus tempimo šlaunų gale.',
        'Grįžkite į viršų, viršuje sutraukite sėdmenis.',
    ],
    'Sumo Deadlift': [
        'Pėdos plačiai, pirštai į šonus, štanga virš pėdos vidurio.',
        'Suimkite štangą siauru chvatu tarp kojų. Keliai stumiami į šonus, nugara tiesi.',
        'Kelkite štangą stumdami grindis kojomis, klubai ir pečiai kyla kartu.',
        'Viršuje ištieskite klubus, nuleiskite kontroliuodami.',
    ],
    'Barbell Bench Press - Medium Grip': [
        'Atsigulkite ant suolo, akys po štanga. Pėdos tvirtai ant grindų.',
        'Suimkite štangą kiek plačiau nei pečiai. Suveskite mentes ir lengvai išlenkite nugarą.',
        'Nukelkite štangą ir nuleiskite ją iki krūtinės apatinės dalies, alkūnės apie 45 laipsnius nuo kūno.',
        'Spauskite štangą aukštyn, kol rankos ištiesiamos. Mentės lieka suvestos.',
    ],
    'Barbell Incline Bench Press - Medium Grip': [
        'Suolo atlošas 30-45 laipsnių kampu. Mentės suvestos, pėdos ant grindų.',
        'Suimkite štangą kiek plačiau nei pečiai ir nukelkite.',
        'Nuleiskite štangą iki viršutinės krūtinės dalies.',
        'Spauskite aukštyn, kol rankos ištiesiamos.',
    ],
    'Dumbbell Bench Press': [
        'Atsisėskite ant suolo, hantelius pasidėkite ant šlaunų ir atsigulkite, kartu pakeldami juos prie krūtinės.',
        'Mentės suvestos, delnai į priekį, pėdos ant grindų.',
        'Spauskite hantelius aukštyn, viršuje jie beveik susiliečia.',
        'Lėtai nuleiskite iki krūtinės lygio, alkūnės šiek tiek prie kūno.',
    ],
    'Incline Dumbbell Press': [
        'Atlošas 30-45 laipsnių kampu. Hanteliai prie pečių, delnai į priekį.',
        'Spauskite hantelius aukštyn ir šiek tiek į vidų.',
        'Lėtai nuleiskite iki viršutinės krūtinės lygio.',
    ],
    'Dumbbell Flyes': [
        'Gulėkite ant suolo, hanteliai virš krūtinės, delnai vienas į kitą, alkūnės šiek tiek sulenktos.',
        'Plačiu lanku nuleiskite rankas į šonus, kol pajusite tempimą krūtinėje.',
        'Tuo pačiu lanku grįžkite į viršų, tarsi apkabintumėte medį.',
    ],
    'Cable Crossover': [
        'Nustatykite blokus viršuje, paimkite rankenas ir žengkite žingsnį į priekį.',
        'Šiek tiek pasilenkite, alkūnės lengvai sulenktos.',
        'Suveskite rankas priešais save žemyn lanku, sutraukite krūtinę.',
        'Lėtai grįžkite atgal, kol pajusite tempimą krūtinėje.',
    ],
    'Pushups': [
        'Atsiremkite delnais kiek plačiau nei pečiai, kūnas tiesus nuo galvos iki kulnų.',
        'Įtempkite pilvą ir sėdmenis. Leiskitės žemyn, kol krūtinė beveik paliečia grindis.',
        'Alkūnės apie 45 laipsnius nuo kūno.',
        'Spauskitės aukštyn, kol rankos ištiesiamos. Klubai nekrenta.',
    ],
    'Dips - Triceps Version': [
        'Įsikibkite į lygiagretes, rankos ištiestos, kūnas vertikalus.',
        'Lenkite alkūnes ir leiskitės, kol žastai beveik lygiagretūs grindims. Alkūnės prie kūno.',
        'Spauskitės aukštyn, kol rankos ištiesiamos.',
    ],
    'Bench Dips': [
        'Atsisėskite ant suolo krašto, delnai šalia klubų. Nuslinkite nuo suolo, kojos ištiestos ar sulenktos.',
        'Lenkite alkūnes ir leiskitės, kol žastai lygiagretūs grindims.',
        'Spauskitės aukštyn tricepsu, pečiai nekyla prie ausų.',
    ],
    'Pullups': [
        'Kabokite ant skersinio plačiu chvatu, delnai nuo savęs.',
        'Nuleiskite pečius žemyn ir traukitės aukštyn, kol smakras virš skersinio.',
        'Krūtinė juda link skersinio, kojos nesisupa.',
        'Lėtai nusileiskite iki ištiestų rankų.',
    ],
    'Chin-Up': [
        'Kabokite ant skersinio pečių pločio chvatu, delnai į save.',
        'Traukitės aukštyn, kol smakras virš skersinio.',
        'Lėtai nusileiskite iki ištiestų rankų.',
    ],
    'Wide-Grip Lat Pulldown': [
        'Atsisėskite, kelius užfiksuokite po atrama. Suimkite rankeną plačiu chvatu.',
        'Šiek tiek atsilošę, traukite rankeną iki viršutinės krūtinės dalies, alkūnės eina žemyn ir atgal.',
        'Sutraukite mentes apačioje.',
        'Lėtai grąžinkite rankeną aukštyn iki ištiestų rankų.',
    ],
    'Seated Cable Rows': [
        'Atsisėskite, pėdos ant atramos, keliai šiek tiek sulenkti. Suimkite rankeną.',
        'Nugara tiesi. Traukite rankeną link pilvo, alkūnės prie kūno.',
        'Sutraukite mentes gale, liemuo nesisupa.',
        'Lėtai ištieskite rankas atgal.',
    ],
    'Bent Over Barbell Row': [
        'Laikykite štangą ištiestomis rankomis, pasilenkite per klubus iki 45 laipsnių, nugara tiesi.',
        'Traukite štangą link pilvo, alkūnės juda atgal prie kūno.',
        'Viršuje sutraukite mentes.',
        'Lėtai nuleiskite iki ištiestų rankų.',
    ],
    'One-Arm Dumbbell Row': [
        'Vienu keliu ir ranka atsiremkite į suolą, nugara tiesi ir lygiagreti grindims.',
        'Laisva ranka laikykite hantelį.',
        'Traukite hantelį link klubo, alkūnė eina arti kūno.',
        'Lėtai nuleiskite. Atlikite visus kartojimus ir pakeiskite ranką.',
    ],
    'Inverted Row': [
        'Atsigulkite po skersiniu ar štanga stove, suimkite ją kiek plačiau nei pečiai.',
        'Kūnas tiesus nuo galvos iki kulnų.',
        'Traukitės, kol krūtinė priartėja prie skersinio, sutraukite mentes.',
        'Lėtai nusileiskite.',
    ],
    'Face Pull': [
        'Viršutinį bloką nustatykite veido aukštyje, pritvirtinkite virvę.',
        'Suimkite virvę delnais į vidų, atsitraukite žingsnį.',
        'Traukite virvę link veido, alkūnės aukštai, galuose rankos išsiskiria į šonus.',
        'Sutraukite mentes, lėtai grįžkite.',
    ],
    'Standing Military Press': [
        'Štanga ant priekinių pečių, chvatas kiek plačiau nei pečiai. Pėdos klubų plotyje.',
        'Įtempkite pilvą ir sėdmenis. Spauskite štangą tiesiai aukštyn, galvą šiek tiek atitraukdami.',
        'Viršuje rankos ištiestos, štanga virš galvos vidurio.',
        'Lėtai nuleiskite iki pečių.',
    ],
    'Dumbbell Shoulder Press': [
        'Atsisėskite su atlošu, hanteliai pečių aukštyje, delnai į priekį.',
        'Spauskite hantelius aukštyn, kol rankos beveik ištiesiamos.',
        'Lėtai nuleiskite iki pečių lygio.',
    ],
    'Side Lateral Raise': [
        'Stovėkite su hanteliais prie šonų, alkūnės šiek tiek sulenktos.',
        'Kelkite rankas į šonus iki pečių aukščio. Mažieji pirštai lygiai su nykščiais ar šiek tiek aukščiau.',
        'Nesisupkite liemeniu. Lėtai nuleiskite.',
    ],
    'Reverse Flyes': [
        'Pasilenkite per klubus beveik lygiagrečiai grindims, hanteliai kabo po krūtine.',
        'Alkūnės šiek tiek sulenktos. Kelkite rankas į šonus, sutraukite mentes.',
        'Lėtai nuleiskite.',
    ],
    'Barbell Curl': [
        'Stovėkite su štanga, delnai į priekį, chvatas pečių plotyje.',
        'Alkūnės prie kūno. Lenkite rankas, kol štanga pasiekia pečių aukštį.',
        'Liemuo nesisupa. Lėtai nuleiskite.',
    ],
    'Dumbbell Bicep Curl': [
        'Stovėkite su hanteliais, delnai į priekį, alkūnės prie kūno.',
        'Lenkite rankas, kol hanteliai pasiekia pečių aukštį.',
        'Lėtai nuleiskite iki ištiestų rankų.',
    ],
    'Hammer Curls': [
        'Laikykite hantelius delnais vienas į kitą.',
        'Alkūnės prie kūno. Lenkite rankas neapsukdami riešo.',
        'Lėtai nuleiskite.',
    ],
    'Triceps Pushdown': [
        'Stovėkite prie viršutinio bloko, suimkite rankeną, alkūnės prie kūno.',
        'Spauskite rankeną žemyn, kol rankos ištiesiamos.',
        'Alkūnės lieka vietoje. Lėtai grįžkite iki 90 laipsnių kampo alkūnėje.',
    ],
    'Lying Triceps Press': [
        'Gulėkite ant suolo, štanga virš krūtinės ištiestomis rankomis, chvatas siauras.',
        'Lenkite tik alkūnes ir leiskite štangą link kaktos.',
        'Žastai lieka vietoje. Ištieskite rankas atgal į viršų.',
    ],
    'Leg Press': [
        'Atsisėskite, pėdos ant platformos pečių plotyje.',
        'Atlaisvinkite fiksatorius ir leiskite platformą žemyn, kol keliai sulinksta apie 90 laipsnių.',
        'Apatinė nugara lieka prispausta prie atlošo.',
        'Stumkite platformą aukštyn, keliai neužsirakina iki galo.',
    ],
    'Leg Extensions': [
        'Atsisėskite, kulkšnys po volu, keliai ties sukimosi ašimi.',
        'Ištieskite kojas iki galo, viršuje sutraukite keturgalvius.',
        'Lėtai nuleiskite.',
    ],
    'Lying Leg Curls': [
        'Atsigulkite ant pilvo, volas virš kulnų.',
        'Lenkite kojas, traukdami kulnus link sėdmenų.',
        'Klubai lieka prispausti. Lėtai ištieskite.',
    ],
    'Seated Leg Curl': [
        'Atsisėskite, volas po blauzdomis, šlaunys užfiksuotos.',
        'Lenkite kojas žemyn ir atgal kiek galite.',
        'Lėtai grįžkite.',
    ],
    'Dumbbell Lunges': [
        'Stovėkite su hanteliais prie šonų.',
        'Žengkite plačiu žingsniu į priekį ir leiskitės, kol abu keliai sulinksta apie 90 laipsnių.',
        'Priekinis kelias virš pėdos, galinis beveik liečia grindis.',
        'Atsistumkite priekine koja atgal. Kartokite pakaitomis.',
    ],
    'Split Squat with Dumbbells': [
        'Galinę koją užkelkite ant suolo, priekinė koja apie žingsnį priekyje.',
        'Leiskitės žemyn, kol priekinė šlaunis lygiagreti grindims.',
        'Liemuo tiesus. Stumdamiesi priekine koja grįžkite į viršų.',
        'Atlikite kartojimus ir pakeiskite koją.',
    ],
    'Barbell Glute Bridge': [
        'Sėskite ant grindų, štangą užriedinkite ant klubų. Galite naudoti minkštą įklotą.',
        'Atsigulkite, pėdos ant grindų, keliai sulenkti.',
        'Kelkite klubus aukštyn, kol kūnas tiesus nuo pečių iki kelių. Sutraukite sėdmenis.',
        'Lėtai nuleiskite.',
    ],
    'Butt Lift (Bridge)': [
        'Gulėkite ant nugaros, keliai sulenkti, pėdos ant grindų.',
        'Kelkite klubus aukštyn, sutraukite sėdmenis viršuje.',
        'Lėtai nuleiskite.',
    ],
    'Standing Calf Raises': [
        'Pėdų priekiai ant pakylos krašto, kulnai kabo.',
        'Kelkitės ant pirštų kiek galite aukščiau.',
        'Lėtai nusileiskite, kulnai žemiau pakylos lygio.',
    ],
    'Seated Calf Raise': [
        'Atsisėskite, keliai po atrama, pėdų priekiai ant platformos.',
        'Kelkite kulnus kiek galite aukščiau.',
        'Lėtai nuleiskite iki tempimo blauzdose.',
    ],
    'Plank': [
        'Atsiremkite dilbiais į grindis, alkūnės po pečiais.',
        'Ištieskite kojas, kūnas tiesus nuo galvos iki kulnų.',
        'Įtempkite pilvą ir sėdmenis, klubai nekyla ir nekrenta. Kvėpuokite tolygiai.',
    ],
    'Side Bridge': [
        'Gulėkite ant šono, atsiremkite dilbiu, alkūnė po petimi.',
        'Pakelkite klubus, kūnas tiesus.',
        'Išlaikykite nurodytą laiką ir pakeiskite pusę.',
    ],
    'Crunches': [
        'Gulėkite ant nugaros, keliai sulenkti, rankos prie galvos.',
        'Kelkite pečius nuo grindų, traukdami šonkaulius link dubens.',
        'Kaklas atpalaiduotas. Lėtai nusileiskite.',
    ],
    'Hanging Leg Raise': [
        'Kabokite ant skersinio ištiestomis rankomis.',
        'Kelkite kojas, kol šlaunys lygiagrečios grindims ar aukščiau.',
        'Nesisupkite. Lėtai nuleiskite.',
    ],
    'Russian Twist': [
        'Sėskite, keliai sulenkti, šiek tiek atsilošę. Laikykite svorį ar suneškite rankas.',
        'Sukite liemenį į vieną pusę, tada į kitą.',
        'Nugara tiesi, judesys iš liemens, ne tik rankų.',
    ],
    'Mountain Climbers': [
        'Atsiremkite delnais kaip atsispaudimams.',
        'Greitai traukite kelius pakaitomis link krūtinės.',
        'Klubai lieka žemai, pilvas įtemptas.',
    ],
    'One-Arm Kettlebell Swings': [
        'Svarstis prieš jus ant grindų. Pėdos kiek plačiau nei pečiai.',
        'Pasilenkite per klubus, suimkite svarstį ir atmeskite jį tarp kojų.',
        'Staigiai ištieskite klubus, svarstis kyla iki krūtinės aukščio. Ranka tik veda.',
        'Leiskite svarsčiui kristi atgal tarp kojų ir kartokite.',
    ],
    "Farmer's Walk": [
        'Pakelkite sunkius hantelius ar svarsčius, rankos ištiestos prie šonų.',
        'Eikite trumpais žingsniais, nugara tiesi, pečiai atgal.',
        'Pilvas įtemptas, svoriai nesisupa.',
    ],
    'Hack Squat': [
        'Atsistokite treniruoklyje, pečiai po atramomis, pėdos pečių plotyje.',
        'Leiskitės žemyn iki šlaunų lygiagretumo.',
        'Stumkite visa pėda aukštyn.',
    ],
    'Smith Machine Squat': [
        'Štanga ant viršutinės nugaros dalies, pėdos šiek tiek priekyje.',
        'Atrakinkite štangą ir leiskitės iki šlaunų lygiagretumo.',
        'Kilkite stumdami visa pėda.',
    ],
    'Machine Bench Press': [
        'Sureguliuokite sėdynę taip, kad rankenos būtų krūtinės viduryje.',
        'Spauskite rankenas į priekį, kol rankos ištiesiamos.',
        'Lėtai grįžkite, kol pajusite tempimą krūtinėje.',
    ],
    'Butterfly': [
        'Atsisėskite, rankos ant rankenų ar atramų, alkūnės šiek tiek sulenktos.',
        'Suveskite rankas priešais save, sutraukite krūtinę.',
        'Lėtai grįžkite atgal.',
    ],
    'Upright Barbell Row': [
        'Laikykite štangą prie šlaunų, chvatas kiek siauresnis nei pečiai.',
        'Traukite štangą aukštyn išilgai kūno, alkūnės kyla aukščiau riešų.',
        'Pakelkite iki krūtinės viršaus ir lėtai nuleiskite.',
    ],
    'Barbell Shrug': [
        'Laikykite štangą ištiestomis rankomis prie šlaunų.',
        'Kelkite pečius tiesiai link ausų, rankos lieka tiesios.',
        'Viršuje stabtelėkite ir lėtai nuleiskite.',
    ],
    'Box Jump (Multiple Response)': [
        'Stovėkite priešais dėžę, pėdos klubų plotyje.',
        'Nusileiskite į pusę pritūpimo, mostelkite rankomis ir šokite ant dėžės.',
        'Nusileiskite minkštai abiem kojomis, keliai sulenkti.',
        'Nulipkite žemyn ir kartokite.',
    ],
    'Rope Jumping': [
        'Laikykite šokdynės rankenas prie klubų.',
        'Sukite virvę riešais ir šokinėkite ant pirštų galiukų, nedideliu aukščiu.',
        'Kvėpuokite tolygiai, keliai šiek tiek sulenkti.',
    ],
}

path = Path(__file__).resolve().parent.parent / 'public' / 'exercises.json'
data = json.loads(path.read_text(encoding='utf8'))
names = {e['name'] for e in data}
done = 0
for ex in data:
    if ex['name'] in STEPS:
        ex['instructionsLt'] = STEPS[ex['name']]
        done += 1
path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
sys.stdout.reconfigure(encoding='utf-8')
print('aprašymų:', done, 'nerasta:', [n for n in STEPS if n not in names])

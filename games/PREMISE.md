# Clef and scale games

This is a catalog to mark up, not a build. The aim is a phone session you start as easily as solitaire, whose winning condition is reading bass and tenor and knowing major and minor scales well enough to solo. The app already has the notation and the signatures in [TrombonePiano/ScoreNotation.swift](../swift_version/TrombonePiano/ScoreNotation.swift). `trombonePosition` is a drawing rule, not the playing chart: it keeps partials within 15 cents of equal temperament and returns one position, so the flat 7th partial is omitted and G4 comes back as 4th. The usual G4 is what players call a sharp 2nd. Partials and that chart belong in the core app, on the keys, the staff, and the horn, and the games use the same labels. The position mark itself is `#2`, not the words "short 2". See "What counts as a position" and "Partials on the horn you already have" below.

The instrument screen stays landscape on the phone. Portrait has no room for a staff beside the controls (`supportedInterfaceOrientations` in [TrombonePiano/PianoViewController.swift](../swift_version/TrombonePiano/PianoViewController.swift)). The game works on any device, and the phone is the main one, so that screen allows portrait. It is meant for one hand on a strap: the other hand is holding on. Targets sit where a thumb can reach them, and the deal does not depend on a second hand. A Sunday New York Times crossword cell, on a phone, is about 17 points. It is playable, and a square sometimes takes two or three taps. Apple's floor for a control is 44 points, and the one-thumb studies land near 9 mm, about 25 points (Parhi, Karlson, and Bederson, 2006; Bergstrom-Lehtovirta and Oulasvirta, 2014, for where the thumb can reach at all). The tap area here splits the difference: nothing smaller than about 30 points, which is almost twice the crossword cell and still fits a staff on a phone. Notes, cages, and position marks get at least that. A deal shows fewer of them rather than shrinking the staff to fit. The drawn note can still be smaller than its tap area. Those areas overlap. A tap that lands in two of them selects the target whose center is closer to the tap, which is a Voronoi choice, the same rule as the bubble cursor (Grossman and Balakrishnan, 2005). A tap outside every area selects nothing. Abutting rectangles with a hard edge between them are the worse rule: the whole overlap would belong to whichever target was drawn last. UIKit’s hit test will not do the nearer-center choice. It returns the frontmost view that contains the point. The staff is drawn in one view, so the tap handler makes the choice. Keyboards and maps are the shipping cases that already do a version of this. Ordinary buttons usually do not.

## What those games are actually paying you with

Crossword, KenKen, Woodoku, solitaire, and backgammon do not share a reward system. They share an unfinished pattern and a session that can end.

- A crossword pays an insight, then a filled grid. It has no timer, no fail state, and no opponent. You may stall, look a clue up, and come back tomorrow. Looking up the state bird, or the warrior, is how that square gets learned. The grid is there to make you need the fact, not to examine whether you already had it. Progress sits on the board. A harder board is a choice you make, or a change the app names. It is not a silent step up.
- KenKen pays a collapse. A cage is supposed to have several answers, and you pencil them until the rest of the grid leaves one. Tetsuya Miyamoto made it so his math students would practice by solving a puzzle. The arithmetic is the part to leave behind. A cage here is a musical constraint (a fourth, a chord, one slide position), and the grid rule is what makes a cage unambiguous. That is the same pleasure as the two-clue intersection, with the candidates left on the board instead of solved in your head. It is also a one-thumb game: tap a cell, tap a candidate. There is no answer to look up. You can ask the grid to mark what is still possible, or what is already impossible. That hint is optional, and using it is a fair way to work the cage.
- Woodoku pays a geometric setup. The thrill is seeing a clear before you place the piece. A run lasts a few minutes, death is ordinary, and the next board is one tap away. That is why it takes an hour without a story. The number at the end is only mildly interesting, and only because it is how long the board lasted before it won. A packing run here can remember that length. It is not a score to chase, and a crossword or a KenKen grid does not get one, because those end when you finish them.
- Angry Birds 2 pays one aimed choice, and then you watch. The shot is not a reflex. You read a structure, pull once, and the pleasure is whether it comes down. That is the part worth taking: a placement commits, and the musical structure resolves in a way you can see, quietly if the sound is off. Hats, a better slingshot, spells, and an energy timer are why the app gets deleted. A deal here can be tried again. It does not sell a stronger piece.
- Solitaire pays an occasional win on a deal you can play tired, with one hand. Luck is high, so the pattern you can learn is thin. That is fine for a waiting-room habit and weak as a teacher.
- Backgammon pays decisions under dice. One game is noisy. A match is long enough for skill to show. The session has a natural end (this game, this match) and still makes you want another.

Raph Koster’s _A Theory of Fun for Game Design_ is the line that ties them to practice. Fun, in his account, is the feeling of learning a pattern. Frustration is what happens when the pattern never becomes visible. Boredom is what happens once a pattern is mastered, and for a clef that boredom is a success signal: widen the material (ledger lines, the other clef, minor, partial crossings, phrases). It is not a signal to invent new rules. The game itself should stay something you open after the rules are obvious.

## What the research is actually good for

A few sources change the design. The rest of the gamification shelf mostly argues about points.

**The puzzle has to be the skill.** Thomas Malone’s 1981 paper “Toward a Theory of Intrinsically Motivating Instruction” (_Cognitive Science_) sorts fun into challenge, fantasy, and curiosity. Challenge is a goal whose outcome is uncertain, via difficulty, hidden information, or randomness. Curiosity is an almost-complete structure: you know enough to feel the gap (George Loewenstein’s 1994 information-gap account of curiosity says the same thing). Fantasy only helps instruction when the skill and the scene need each other. A trombone rescuing a kingdom is a costume. A note that is both “3rd position” and “the tenor-clef C” is an intrinsic puzzle. Malone’s own Breakout experiment stripped the game down and found that the bricks breaking, a goal you can see on the board, mattered far more than the printed score. The score was not worthless there: versions with neither bricks nor score were the dull ones, and his survey of schoolchildren found scorekeeping among the features that correlated with a game’s popularity. The narrow lesson is that the visible goal does the work, and a number can ride on it but cannot replace it.

**Difficulty is the ingredient, up to a point.** Elizabeth and Robert Bjork’s chapter “Making Things Hard on Yourself, But in a Good Way” names the desirable difficulties: vary the conditions, interleave topics instead of blocking them, space sessions, and make the learner produce the answer. The word “desirable” is doing real work. A timer, a tiny staff, or calling A♭4 a normal 1st position are difficulties that do not help you encode the right thing. Retrieval does. Henry Roediger and Jeffrey Karpicke’s 2006 testing-effect paper is the narrow version: a test is a study event.

The standard for “you keep coming back” is backgammon after the rules are dead simple. The dice are what is new. A deal here should work the same way. The controls and the winning condition stay put, and get familiar. Each deal is a new board: different notes, a different cage, a different key, sometimes the other clef. When bass-clef notes on the staff are automatic, the next deal is still worth opening, and the harder material arrives as a richer board inside those same rules.

**Points are the most studied idea and the least trustworthy.** Hamari, Koivisto, and Sarsa’s 2014 review “Does Gamification Work?” found that points, badges, and leaderboards were the usual ingredients, and that results depended on the context and the person. Edward Deci, Richard Koestner, and Richard Ryan’s 1999 meta-analysis, following the Lepper, Greene, and Nisbett 1973 overjustification finding, is the warning beside it: an expected tangible reward can make the activity itself less interesting. If the prize for naming a tenor clef note is a gem, the note is the chore.

**The session should feel voluntary, including the misses.** Jesper Juul’s _The Art of Failure_ treats failure as something players accept when the game is fair and the next try is immediate. A life counter that locks practice is the opposite. So is a streak that zeros out on a missed day. A streak gets the app opened. It does not decide whether the clef was retrieved, and a broken streak is a common reason people stop.

**Keep the screen quiet.** John Sweller’s cognitive-load work, and Alexander Renkl’s faded worked examples, argue against decorating a hard diagram. The staff is already the hard diagram. Animation, a story, and a running score belong at the cadence, if anywhere. Early in a new key, show the positions on the way up and leave the way down blank. Then blank both. Then move the same scale to tenor. Kalyuga, Ayres, Chandler, and Sweller’s expertise reversal effect (2003) is the reason the fading has to happen: the printed position that helps a beginner gets in the way once the note is known, so the help is withdrawn as the player advances, not left on as a courtesy.

**Sight reading is reading ahead.** John Sloboda’s 1974 eye-hand span study found that good sight readers hold about five notes past the one they are playing, and poor ones two or three. The 2021 review by Perra and colleagues confirms the span grows with expertise and that readers take in chunks, not notes. That is the skill Covered beat trains, and it names its difficulty knob: how far ahead the mask sits.

**Experts read chunks.** William Chase and Herbert Simon’s chess studies (1973) found that masters see meaningful groups, not single pieces. Isolated notes are the tutorial. Scale fragments, triads, and short phrases are the game. James Paul Gee’s _What Video Games Have to Teach Us About Learning and Literacy_ makes the same demand in game language: well-ordered problems, then a cycle of expertise where the mastered pattern becomes a tool in a larger one.

**Flow is a constraint, not a mood.** Mihaly Csikszentmihalyi’s condition is a clear goal, immediate feedback, and challenge sitting next to current skill. Koster’s boredom result means you must widen the pattern when the current one gets automatic. Self-determination theory (Edward Deci and Richard Ryan) adds that the player should choose the puzzle. You pick the category. After a round, Easier, Next, and Harder are the choice, the way a backgammon skill level is something you change when you are winning too often or too rarely. Next takes the deal Adaptive has lined up. Easier and Harder override it. An adaptive system that starts the next board by itself, and never says what it changed, is the version this plan does not use.

**Copy the near-win you can see. Leave the slot machine.** Woodoku’s near-miss is information: the line you failed to set up is still on the board. A gambling near-miss is a costume on a loss. Luke Clark and colleagues (2009) showed that kind of near-miss recruiting reward-related brain activity in a machine the player cannot learn. Solitaire’s occasional win is acceptable because better play raises the win rate. A random drop does not.

Solitaire’s unlimited undo and Woodoku’s lack of one are both right, for different boards. On a long deal, undo compares branches that were already face up: two black fours, and you play the other one to see the board it makes. The app has added nothing. A slip of the thumb is the same button. KenKen penciling is the same thing. G4 as #2 or as 4th is that pair of fours when both are legal and the rest of the board is what decides. A peek is a different button. It is the Wikipedia article for a square you tried and did not know: the position, the partial, the other clef. You fill the square and continue. The square can come back later. Cycling positions until a check mark appears is the article opened before you have read the clue. A packing board is the Woodoku case. The placed piece is the decision, the clog is the feedback, and the next deal is one tap, so a locked piece stays. There is no ad to reload past.

**Two skills, two puzzles.** Sight reading is ink to position, eventually under a pulse, a bar or two ahead. Soloing is a key schema: which degrees moved in the minor, where the slide jumps at a partial crossing, which notes are chord tones. A fast clef drill will not become soloing by adding a score.

## Rules any idea has to pass

- You answer before the position or the name appears.
- The judge is the playing chart below, plus the written pitch. Trigger positions count when that horn is selected, and the chart has to hold the trigger rows first; today the code only knows T3 through T7 for the five notes a straight slide cannot reach. See "The trigger" below. `trombonePosition` only supplies the in-tune slot it already draws.
- Bass and tenor share a deal once each clef is recognizable. Blocked weeks of one clef feel smoother and stick less.
- A deal can be finished. You try the square first. If you do not know it, a peek is the article: it fills the position, the way a crossword lookup fills the state bird, and the grid goes on. A square you already knew can be finished without that. Neither one is a cheat. The point is to build the chart, not to audit what you knew when you sat down.
- Nothing about the prize stops you from playing another deal. No lives, no energy, no streak to protect.
- Letter names and positions are different questions. The speed game asks for the slide. A slower puzzle may ask for the name, because soloing and talking about keys need it.
- A tired deal still asks a real question. It is just larger, slower, and undoable.
- A first deal is playable without reading anything. The board shows what is legal. Solitaire, Woodoku, and a crossword need no instructions because the board is the instruction: a piece fits where it fits, a card goes where it goes, a blank wants a letter. A game whose rule cannot be seen on the board, and has to be told, is suspect. A clue word such as "a 4th up" is part of the puzzle, like a crossword clue, and is not an instruction. "You may take a note when it is a slide neighbor" is an instruction, and the board had better make it visible instead, by lighting the legal takes or by refusing the illegal one.

## How you answer

Every game below is built from four gestures, and each game names which it uses. There is no fifth. One thumb does all of them.

- **Tap a square.** A blank on the staff, or a cell in a grid. It selects. A second tap on a selected square lifts the selection.
- **Tap a position.** A row of stops along the bottom: 1 through 7, with T for the trigger horn. Early deals do not ask you to tap a separate control for how sharp the slide sits; the reveal prints `#2` when that is the answer, and 2 was the legal tap. A later switch can add the short stops as their own buttons for the player who wants to answer `#2` directly.
- **Tap a candidate.** A pencil mark inside a square, the KenKen gesture. Tap it again to erase it. Tap it when it is the only one left and it commits.
- **Drag a tile.** A fragment of notes moved onto the board. It drops where it fits and springs back where it does not. The Woodoku gesture.

Dice degrees and Opening book answer with a square and a position in turn: tap where the note goes, then tap where the slide goes. The grid games answer with squares and candidates. The packing games answer with tiles. Golf answers with a single tap on the note you are taking.

## What counts as a position

The 7th partial sits about 31 cents flat of A♭. There is no slide left to sharpen A♭4 in 1st, so that note stays a lip, and the usual A♭4 is 3rd, off the 8th partial. Drop the slide almost a semitone and the same partial is G4, short of a true 2nd. That short 2nd is the ordinary place to play G4. True 4th, off the in-tune 8th partial, is the alternate. A B♭ scale that detours to 4th for one note is a different arm path from the one you play.

The same partial, played a little short of each numbered stop, continues G♭4 (short 3rd), F4 (short 4th), and on down. Some of those are useful alternates. F4's home is still 1st. The cents cutoff cannot sort "usual" from "possible": the 5th partial is about 14 cents flat and the drawing rule keeps it, and D4 in 1st is a normal note you sit a hair sharp. Charts do not print "short 1" for that hair. They reserve "short" for the 7th-partial stops, which are a different place on the slide.

So a deal has two layers.

- An integer answer is legal when players use that number. For G4, 2 and 4 both count. A♭4 in 1st does not.
- The reveal prints the position as `#2`, not a bare 2. Early deals do not ask you to tap a separate control for how sharp the slide sits.
- When a puzzle needs one path (a scale, a partial crossing), it prefers the conventional short position, so G4 is short 2nd. When a puzzle is a move (dice, packing a bar), any legal position counts, the way an alternate is a legal backgammon play.
- A position-stack clear groups notes that share a slide stop. G4 does not belong in the true-2nd stack with E4 and A4. It belongs to the short-7th family. Putting it in both would teach a lip slur the slide cannot play in tune.

The chart itself is a small table we write from playing habit, not a looser cutoff on `trombonePosition`. The 15-cent function stays how the horn finds an in-tune numbered stop. The table has three kinds of rows. Home rows are what `trombonePosition` already returns. In-tune alternate rows are the other numbered stops the same cutoff allows, which the function skips because it stops at the shortest: F3 in 6th, B♭3 in 5th, D4 in 4th, F4 in 6th. Short rows are the 7th-partial stops. A game that accepts "any legal position" reads all three kinds; a game that wants one path reads the home row, or the short row when the home row is the lip.

Printed charts often say "short 2". In conversation players say "sharp 2" and write `#2`. This app uses `#2`. How that mark sits on a key versus above a staff note is not settled yet.

## Partials on the horn you already have

Partials are part of the instrument screen, not a game-only layer. `SlideSetting` in [TrombonePiano/ScoreNotation.swift](../swift_version/TrombonePiano/ScoreNotation.swift) is today a travel, a trigger flag, and a label string. It grows into the chart row: numbered position, whether it is short, the partial, and the slide travel. `trombonePositionLabel` is what both the keys and the staff already call. The mark those labels use is `#2`. Trigger labels stay `T3` and gain the same short mark when a trigger note needs it.

The horn drawing moves to that travel. Short 2nd sits between the measured 1st and 2nd stops, noticeably short of 2nd. The pixel is not a new measurement of a particular horn. Players put it somewhere from a quarter to about halfway back toward 1st, and the picture only has to make "short" visible. The measured travels for 1 through 7 stay as they are.

The partial number is shown with the horn, for the last note played, as "7th" rather than a bare 7. A bare 7 next to a position reads as another slide position. It does not need a new switch. SHOW POSITIONS already means "tell me how this note sits on the horn," and the partial is part of that. Keys and the staff keep the position label. The horn caption carries the partial, because that is the one place you are looking when you want the series (the G4 you just played is the 7th, the 4th-position G4 is the 8th).

Mild tendencies stay off the label. The 5th partial is a little flat and the 3rd and 6th are a little sharp, and the remedy is a hair of slide, not a second name. Printing "short 1" on D4 would teach a distinction the charts do not print.

## The trigger

The app treats the F attachment as a way to reach B1 through E♭2 (`tromboneNeedsFAttachment`, T3 through T7). That is the smallest part of what it does, and a player who has just bought a trigger horn has a whole subject here. It is not a priority for a jazz tenor player, and the document should still hold the shape of it so the chart and the games have somewhere to put it.

The attachment adds a fourth of tubing, so the horn in T1 is an F horn: its partials are F2, C3, F3, A3, C4, the flat E♭4, F4. The slide positions stretch by the same ratio, `triggerLengthRatio` in the code, 2 to the 5/12, about 4/3. Each semitone is a fixed fraction of the tube, so a longer tube needs a longer reach per position, and the stops are not where the B♭ stops are. Only about six positions fit before the slide runs out, which is why C2 is a flat T6 and B1 is a reach past the end. That stretch is a fact of the tube, and the horn drawing already moves to it. What it needs is to be taught, not only drawn: a player expecting T2 under the ordinary 2nd stop plays sharp.

The everyday trigger notes are alternates, not low notes. C3 in T1 instead of 6th. B2 in a flat T2 instead of 7th. F3 in T1 for a slur the B♭ side cannot make. A3 in T1 beside its 2nd. Those are the rows the chart needs before any trigger game can judge an answer, and they are the ones a new owner is trying to learn. Below those, the attachment opens the register from E♭2 down to B1, and the pedals below that. Bass trombone, with a second valve, is a further sheet of the same chart and is not in this document.

Games that fit, all waiting on those chart rows and on a decision to spend time here:

![Two paths](icons/alt_route.svg) **Trigger or slide.** A note that has both a B♭ position and a trigger position. The board shows the previous note and the next. You choose which path moves the slide least, or avoids a slur the slide cannot make. With sound on: the previous note and the next note play. Either path is that same pitch. Other categories: Positions. (crossword)

![Ruler](icons/straighten.svg) **Where T2 really is.** The horn is drawn with the trigger thrown. You put the slide where a named trigger note sits. The reveal shows the stretched stop beside the ordinary one. With sound on: the named trigger note plays. Other categories: Positions.

![Down arrow](icons/arrow_downward.svg) **Low register inventory.** The octave below the staff in bass clef, trigger notes included, two missing. Same engine as Scale inventory, deliberately on the ledger lines. With sound on: a placed note plays its trombone sample. Clearing the octave plays that octave. Other categories: Bass clef.

## The Games button

Games opens one screen. It asks what you want to work on, and it offers a sentence, a browse list, Surprise me, and, later, My weaknesses.

**What do you want to work on.** The categories below, not a list of boards. Bass clef runs the clef-reading deals in bass, and the bass side of the both-clef deals. Tenor clef runs those deals in tenor, plus the tenor games. The other buttons are Major keys, Minor keys, Positions, Both clefs, Reading a line, and Soloing. Reading a line and Soloing wait until the clef deals are ordinary. Trigger is a further button, shown when the trigger horn is selected, and it waits on the chart rows described under "The trigger." Ledger lines are the harder end of a clef, not their own button.

**Or just tell me.** A box under the categories. “I have 20 minutes and I need to work on B♭ major in bass clef” is enough. The 20 minutes is how long the sitting lasts. It is not a clock on a tap. The deals inside it are the untimed puzzles for that key and that clef, until the sitting is over or you stop. B♭, bass clef, and a number of minutes can be read off the sentence with no model. A model is for the rest of the wording. On a signal, that model can be on the web. Between stops, the on-device model can do it. If neither is available, the parsed key, clef, and time still start a sitting.

**Browse games.** The games in the categories below. This is where a person picks the form. It is not a set of titled products with icons.

**Surprise me.** A sitting you did not specify. Another clef, another key, one of the games in the categories below.

**My weaknesses.** Hidden until the log is thick enough that a weakness is a pattern, not one bad deal. Then it deals from the squares you looked up and the spots that slipped. Open question: whether a missed square comes back at random, or on a schedule where the gap grows each time it is answered without a lookup (Cepeda and colleagues’ 2006 spacing meta-analysis). The schedule is the stronger teacher and the one Bjork’s spacing point actually describes. It does not have to look like a flashcard app: the square simply turns up in an ordinary deal when it is due.

## After a round

There is no ladder named for the days of the week.

When a round is finished, three buttons are there: Easier, Next, and Harder. They stay inside the category you already chose, and they stay on the game you just played. Golf deals another row of golf. A staff crossword deals another grid. Next does not rotate through the catalog. A different game is Browse, Surprise me, or another category.

What changes on Next is the board. The notes are new. When the game has a key, the next deal is a different key of the same width, meaning the same number of accidentals, unless the line above the buttons says the width changed. The clef stays the one you chose. Harder widens that board: ledger lines, a key with more accidentals, fewer notes given, the other clef when that category already includes it. Easier narrows it: notes on the staff, more of them given, a quieter key. The rules of the game stay put. These buttons do not open Reading a line or Soloing before those categories are offered. Larger notes are the tired switch, a display choice, not an easier puzzle.

That is the place to start, on the first game that gets built. Once that game is in hand, the variant can move: how often the key changes, whether a run stays in one key for a few deals, when the other clef is allowed in. The part to keep until the rules feel obvious is that Next is the same game.

Adaptive is a switch, and it starts on. It watches finished rounds. Several rounds that needed a lot of peeks line up easier material. Several rounds finished with little looking-up line up harder material, the same list Harder uses. One peek is a lookup, not a reason to make the next deal easier. One clean round is not a reason to jump. Adaptive does not start that deal. It shows one line saying what Next will be, including when the material is staying put, and Next is the button that takes it. Easier and Harder override that line for the next step, and Adaptive continues from the level you picked. Turning Adaptive off leaves the same three buttons. Next is then another round of the material you are on.

## Clef reading

The clef is chosen when the sitting starts. Bass clef and Tenor clef on the Games screen both come here, set to that clef.

![Grid](icons/grid_on.svg) **Staff crossword.** A few bars with some notes given. Clues are constraints: “a 4th up,” “in the key,” “1st position,” “same sounding pitch in the other clef.” You fill the blanks. Checking a square is optional. Finishing the grid is the win. The board can sit unfinished until tomorrow. The grid does not get a Sunday-sized cell. If the puzzle is longer than the screen, you scroll. With sound on: a note plays when you commit it, and a peek plays the note you looked up. Finishing the grid plays the line. Other categories: Positions, Major keys. (crossword)

This is the grid engine. Two-clue intersection, Theme dawns late, Cryptogram line, Hidden signature, and What moved are the same board with different clue sets, and they should be built as one game with several clue types rather than five games. The generator has one job across all of them: a cell must have exactly one answer once the clues and the rest of the board are read, the KenKen uniqueness rule. "A 4th up" means diatonic in the key unless a clue says perfect. The clue vocabulary stays small and is listed in one place.

![Golf](icons/golf_course.svg) **Golf.** Five short columns of face-up notes in one clef, and one note in the waste. You may take the bottom note of any column when its slide position is next to the waste note's position, one stop either way, with `#2` next to 1 and 3. The take is the answer: you are asserting that this note lives one stop over, and the position prints on it as it lands. An illegal take does not move, and that is the only feedback; the position stays hidden until a legal take or a peek. Clearing the columns is the hole. Nine holes is a session. You can lift the last take. Easier is fewer columns and more home-position notes; Harder is ledger lines and alternates in play. Larger notes after a chosen tired switch. With sound on: a legal take plays that note. A peek plays the note you looked up. Clearing the columns plays the hole. Other categories: Positions. (solitaire)

Earlier draft had one row, take the end note, by scale step or slide neighbor. One row leaves at most one legal move, which is no decision, and the two relations let the player use whichever they already know. The slide relation is the one that makes this the first build, "clef to position." A scale-step golf is the same engine under Major keys, with the relation swapped, and is a later variant.

![Eye](icons/visibility.svg) **Spot the ledger.** A short line in one clef, and one note is drawn a step off on a ledger line, or sits on a ledger line that should be a space. You tap the wrong one. Nothing else to enter. This is the harder end of the clef with a find-it payoff, and it works at the tired end of a day because the only gesture is a tap. With sound on: the line plays, and the note you tap plays again. Other categories: Tenor clef. (crossword)

## Tenor clef

![Repeat](icons/repeat.svg) **Same ink.** You finish a line in bass. The same pitches return immediately in tenor. The second pass is where the shortcut should appear. When that second pass gets boring, add ledger lines or a busier key. With sound on: the finished bass line plays, and each note of the tenor pass plays as you place it. Other categories: Bass clef, Reading a line. (sight reading)

Decision needed on what "shortcut" means. If it is the direct mapping in tenor becoming automatic, the second pass is the right drill. If it is a translation rule (tenor is bass up a fifth, or treble down a step and an octave), trombone teaching usually warns against it, because the translation stays as a step and tenor never reads at speed. The game can discourage the translation by not keeping the two lines on screen together: the bass line leaves before the tenor line arrives.

## Both clefs

![Two tiles](icons/filter_none.svg) **Clef tiles.** A tile is a short fragment written in bass or tenor. You drop it only where its sounding pitches match what is already on the board. A row clears when the same pitches have been written in both clefs. You cannot finish by ignoring one clef. A locked piece stays. With sound on: a tile plays its fragment when it locks. A cleared row plays those pitches. Other categories: Bass clef, Tenor clef. (pairs)

The label was Woodoku. There is no packing here; the only constraint is that two fragments sound the same, which is Concentration. That is a fine game and should be called what it is. Face-down pairs would add memory to it, which is a different skill and probably not wanted.

![Flag](icons/flag.svg) **Race to the octave.** Each clef is a track. You roll two dice. Each die is a number of scale steps, and you choose which track takes which die, and in which order, before placing those notes. The weaker clef can take the bigger die if you are willing to read its ledger lines. First track to the octave wins the game. First to five games wins the match. The match does not reset because a day was skipped. There is no clock. With sound on: each note plays when you place it. The track that reaches the octave plays that scale. Other categories: Clef reading. (backgammon)

Earlier draft had one die and no choice, and sent you back a few degrees on a miss. One die is a progress bar, not a game. The two-dice choice is the backgammon part. The setback on a miss sits badly next to "a miss does not spend a life" and is dropped. Still an open question whether racing yourself across two clefs is a competition at all; this entry may not survive a prototype.

![Note](icons/music_note.svg) **Horn to ink.** The horn is drawn with the slide at one position and the caption names a partial. You tap where that note goes on the bass staff, then on the tenor staff. The direction is reversed from every other game: horn first, ink second. It ties the partial caption, the two clefs, and the slide together in one deal, and it is the one place the horn drawing is the clue instead of the reveal. With sound on: the partial at that slide position plays as the clue. A tap that lands plays that pitch. Other categories: Positions. (crossword)

## Major keys

![Signature](icons/signature.svg) **Hidden signature.** Notes are on the staff and the signature is blank. You infer how many sharps or flats make them ordinary. With sound on: the line plays. A later form is that playback with the staff withheld. Other categories: Minor keys, Soloing. (crossword)

The generator must make the answer unique. C D E G A fits C, G, and F major, so the line has to include a characteristic degree, the 4th or the 7th, or the deal accepts every signature the notes allow and says so. Relative major and minor share a signature, so that ambiguity is not a problem for this puzzle.

![Note list](icons/queue_music.svg) **Scale inventory.** The board is one octave of a named key, drawn on one clef, two notes missing. You place them. Clearing the octave is the win. A wrong placement does not land; it springs back. With sound on: a placed note plays its trombone sample. Clearing the octave plays the scale. Other categories: Minor keys, Clef reading. (crossword)

Earlier draft clogged the board with a chromatic neighbor on a miss and called it Woodoku, and in the same paragraph said a locked piece stays and that it cost a move to remove. The clog was a penalty added to earn the label, which is the costume problem from the Malone section applied to our own list. The retrieval, which two degrees are missing, is the whole game. The same board with more blanks is Opening book; with the root hidden it is Start on a degree; with the key changed to minor it is What moved. One scale engine, several blanks.

![Layers](icons/layers.svg) **Foundations.** Seven small piles. A foundation wants the next degree of the key. You build by position adjacency. The deal is won when the foundation holds an octave. Every note is visible, so a loss teaches the position you missed. With sound on: a note plays when it lands on a foundation. The finished octave plays the scale. Other categories: Positions, Minor keys. (solitaire)

Needs a worked example before it is kept. Two building rules are named, degree order on the foundation and position adjacency on the piles, and it is not said how they interact. With every note face up a deal is solvable or not before the first move, so a loss is about move order, which is not the lesson named. May collapse into Golf.

![Die](icons/casino.svg) **Dice degrees.** Two dice name scale degrees or an interval. You play that note on the required clef, in a legal position. G4 may be `#2` or 4. A♭4 in 1st is not a move. With sound on: the note you play plays its trombone sample. Other categories: Positions, Clef reading. (backgammon)

![Open book](icons/menu_book.svg) **Opening book.** A roll is a key, and the reply is the position path of one octave, partial crossings included, in a named clef. You study it once on the way up, then the next roll asks for it blank. Keys you have already booked stay in the dice so they are not retired. With sound on: the study pass plays the octave on the way up. On the blank pass, each note plays as you place it, and the finished path plays the octave. Other categories: Positions, Clef reading. (backgammon)

![Stairs](icons/stairs.svg) **Start on a degree.** The same scale, entered on the 3rd or the 5th, in either clef. A scale that only ever starts on the root has not been learned for soloing. With sound on: each note plays as you place it, and the scale plays from the 3rd or the 5th, the degree you entered. Other categories: Minor keys, Soloing, Clef reading.

![Barline](icons/border_vertical.svg) **Bar before the key change.** Four bars with the signature changing at bar three, both signatures printed. You mark the notes whose position changes across the barline, and the ones that stay. The reveal shows both position paths. The puzzle is the difference between two keys, not either key alone, which is what a tune with a bridge asks. With sound on: the reveal plays one position path, then the other. Other categories: Positions, Soloing. (crossword)

## Minor keys

![Up and down](icons/swap_vert.svg) **What moved.** The major scale is filled in. The natural, harmonic, or melodic minor is the same grid with a few squares wrong. You mark the degrees that changed: the 3rd, or the 3rd and the 6th, or the 6th and 7th on the way up. With sound on: the major scale plays, then the minor. A degree you mark plays on its own. Other categories: Major keys. (crossword)

![Up arrow](icons/arrow_upward.svg) **Leading tone.** A natural-minor line is almost resolved. It resolves when you supply the raised 7th. With sound on: the unfinished line plays, and the raised 7th you supply resolves it. Other categories: Soloing. (crossword)

One fact, the same in every key. Once it is known the game is over. Folded into What moved as the harmonic-minor row rather than kept as its own entry.

## Positions

![Intersection](icons/join_inner.svg) **Two-clue intersection.** Each empty note is the crossing of a slide fact and a staff fact. “4th position” and “tenor, on a line” is one note. Candidates can be penciled, or the cell can show every one still possible in green, or every one already ruled out in red. The single answer stays hidden until you peek. With sound on: a committed note plays, and a peek plays the note you looked up. Other categories: Clef reading. (crossword)

![Music stack](icons/library_music.svg) **Position stack clear.** You are offered small cells, a minor third or two chord tones or a step. A clear happens when every in-tune note of one slide position, from the 2nd partial through the 8th, is present. A combo is two clears that never moved the slide. G4 in `#2` does not clear with the true-2nd stack. A locked piece stays. With sound on: a locked cell plays its notes. A clear plays that position's partials, 2nd through 8th, as one slur. Other categories: Soloing. (Woodoku)

The partial range is the rule that makes a stack finite: 1st position runs from B♭1 past B♭5 if it is not capped. Seven notes per stack, 2nd through 8th, is the playing range and the lip-slur exercise. Harder can open the 9th and 10th.

![Turn](icons/turn_slight_right.svg) **Partial-crossing path.** A scale is a path of slide positions. Most steps move by one. The partial break jumps. You mark the jumps, then the path plays. With sound on: that playback is the scale, and a partial-break jump is a leap in the line. Other categories: Major keys, Minor keys. (crossword)

The label was Woodoku, and this is a mark-the-squares puzzle. Relabeled.

![Slider](icons/linear_scale.svg) **Shortest slide path.** A four-note cell in a key. Every note has its home row and its alternates from the chart. You choose a position for each so the slide travels least, or so no slur crosses a break the slide cannot make in tune. F3 in 6th before B♭2 in 1st is a long trip; F3 in 1st is not. The reveal draws the slide's travel for your path and for the shortest one. This is the game where alternates are the point rather than a legality rule, and the one game that uses the slide as a geometry. With sound on: the four notes play. The two paths are those pitches, and the slide travel stays on the drawing. Other categories: Soloing, Trigger when that horn is selected. (Woodoku)

## Reading a line

These wait until a clef’s deals feel ordinary. A metronome click on a line you can already read is an option here, not a game, and it is not on the subway screen.

![Dawn](icons/wb_twilight.svg) **Theme dawns late.** Several clues are ordinary position questions. Halfway, it becomes obvious they spell a B♭ scale, or a V–I, and the remaining clues get easier if you noticed. With sound on: each note you commit plays, and the finished line plays as the scale or the cadence. Other categories: Major keys, Positions. (crossword)

![Letters](icons/abc.svg) **Cryptogram line.** Four bars with a few notes showing and a label such as “major scale” or “triad.” You fill the rest. With sound on: the given notes play, each note you fill plays, and the finished bars play as the labeled pattern. Other categories: Major keys. (crossword)

![Masked eye](icons/visibility_off.svg) **Covered beat.** The note you are on is masked. You answer the next one. A miss lifts the mask for that note and the line continues. The line advances on your tap, not on a clock. Harder moves the mask further ahead: two notes, then a bar, which is Sloboda's eye-hand span made into a knob. This waits until the notes are automatic. It is not a highway of falling notes. With sound on: the note you answer plays. A miss plays that note when the mask lifts. Other categories: Clef reading. (sight reading)

## Soloing

These wait with Reading a line. The samples can sound a clue when sound is on. The microphone is not the judge.

![Two notes](icons/music_note_2.svg) **Pack a bar.** Three chords. Strong beats want chord tones, weak beats want scale tones, written in the clef you are weak at. You pack four notes. A packing that stays in one position for two chord tones is the combo. With sound on: each note plays when it locks, and the full bar plays as the phrase. Other categories: Positions, Clef reading. (Woodoku)

![Ear](icons/hearing.svg) **Call, then place.** The app gives two beats of a key. You place the next chord tone. A wrong note still in the key fails differently from a note outside the key. With sound on: those two beats play, the chord tone you place plays, and the sample answers. With sound off, the two beats are written on the staff. Other categories: Major keys, Minor keys, Clef reading.

![Up and down in a circle](icons/swap_vertical_circle.svg) **One position, two jobs.** A short cell must include a lip slur that hits a chord tone. The board shows the in-tune notes of the position. You choose them. With sound on: the notes you choose play as a lip slur on that position. Other categories: Positions. (Woodoku)

Overlaps Position stack clear enough that it may be one Harder setting of that game rather than its own entry. Decide after the stack game exists.

![Two arrows](icons/compare_arrows.svg) **Transpose a lick.** A two-bar fragment in B♭, written out. You write it in E♭ in the same clef, or in B♭ in the other clef. Each square is the crossing of two constraints, the interval shape of the lick and the new key or clef, which is the two-clue cell applied to a phrase instead of a note. Chunks, not notes, are what an expert reads, and this is the entry that asks for a chunk. With sound on: the given lick plays, then the lick you write plays in the new key or the other clef. Other categories: Major keys, Both clefs, Reading a line. (crossword)

A few things that came up while sorting these are not games. Unlimited undo, and a peek after a real try, are rules for the grid and solitaire deals. A past-self clock is out. Grading a deal by speed is the race this plan does not run.

## A log, and a synthesis when you ask

You pick the puzzle. The app remembers what you picked and what happened: which clef, whether ledger lines were in play, which key, which squares you looked up, which you filled without looking, and how long each square took. The time is recorded and never shown on the play screen, never graded, and never a clock. It is there because it is the one signal that separates a note you knew from a note you worked out, and a peek count cannot tell those apart. Adaptive and My weaknesses read it. The synthesis page may say that tenor clef notes on the staff have become much quicker over the month, or that ledger lines have not, because that is an insight about the player, not a score on a deal. Lookups are part of the record, because that is how a fact gets built. The record is not a score on the play screen.

From time to time you ask for a synthesis. The page is not a fixed set of charts. One visit can take the whole history (“since you started”). Another can be yesterday only. Another is not about a span of time at all: a run of tenor clef that was getting easier, and then something interrupted it. If the same three pictures would appear every time, the page has failed. The model picks the cut. The app draws whatever that cut needs, from counts it already has. The model reads those numbers. It does not invent them. Progress and regression are both allowed, including a regression that is the whole point of the page.

Next Insight asks for another cut, one you have not already been shown. Last Insight returns the previous one as it was, not a new writing of the same idea. You can keep going in either direction. When the log has nothing further that is actually there, Next says so instead of inventing a story to fill the button.

The first model is the on-device Apple foundation model, through the Foundation Models framework. Once Apple Intelligence is on and the model is already on the phone, it runs with no network, so a stretch between subway stops is enough. If that reading is too thin, a networked model is allowed when there is a signal. Private Cloud Compute needs that signal, and so does any other model on the web. The subway does not wait for them. A phone that cannot run Apple Intelligence, or a model that is still downloading, shows the charts without the prose until a networked reading is possible.

## Session shape

How a deal replaces Woodoku on the couch:

- One tap to a deal. No menu of settings in front of it. After a finished round the choices are Easier, Next, and Harder, with the one line that says what Next will be. The Adaptive switch and the tired switch can live with them.
- Nothing on the phone is timed. A note does not fall, and a deal does not expire. You can sit on a cell the way you sit on a KenKen cage.
- A deal lasts about as long as a hand of solitaire or a Woodoku run, a few minutes, and ends on a board you can see.
- An evening with the crossword-style grid is the other legal session: one key, a persistent board, put down and picked up.
- Help has two prices, both of which still let you finish: peek (fill this square, and remember that you looked) and check (mark the wrong squares, fill nothing). An earlier draft had a third, reveal, which in a position game is the same act as peek. Lifting a mark before either of those is free. A peek is a lookup you chose after trying. The square can remember that you looked, so the same note can come back. A finish with no lookups is a pleasant outcome, not the only one that counts.
- The horn drawing can mark a finished line or octave. A sample plays there only when sound is on. Per-note celebration stays off. It would cheapen the reward and cover the phrase.
- The week’s match is five finished deals at the puzzle you chose, not five deals with no lookups, and not a daily streak. A week that does not reach five shows nothing and carries nothing over; there is no broken-week mark. Open question whether a weekly count is a soft streak and should go altogether.

## Sound

The game uses the trombone samples already in the app. Sound is a switch, and the silent switch on the phone is respected, so a subway car stays quiet without pairing headphones. That is a change from the instrument screen: `PianoAudio.configureSession` sets the session to `.playback` (or `.playAndRecord` for the built-in speaker), and both categories play through the ring/silent switch. The game screen needs the ambient category, or its own check of the switch, and the two screens have to hand the session back and forth. With sound on, tapping or placing a note plays that pitch. A peek can play the note you looked up. With sound off, the staff, the position, and the win are unchanged. A deal that would have been only a heard clue is written out instead. The microphone is still not the judge.

## What is already on the phone

People have already tried this. The crowded version asks for a letter name or a piano key. Tenor clef shows up there too, in apps like Clefs. The trombone-shaped version also exists. Tromodometer is a browser position quiz, in treble or bass: a note moves, you pick 1st through 7th, and you have three lives and a clock. Trumpet Hero is the trombone Guitar Hero: notes fall in time, the slide position is drawn for you, bass and tenor are both there, and a mic judges the pitch. Tonestro listens while you play pieces and shows fingering charts. Da Capo’s trombone game is bass clef and letter names, in C, with no sharps or flats.

The falling-note highway is a dead end here. It tests a timed motor reflex and never lays out a way to acquire that reflex. Flight and racing games have the same shape, and they do not get played. A subway session will not be a race to name the position before the note arrives. Tromodometer’s moving note and clock are that race with the slide buttons added.

What those do not do is the loop in this plan. The position stays hidden until you answer. `#2` counts. The same pitches come back in the other clef. A key and a scale are part of the puzzle. A miss does not spend a life. The phone session is one thumb.

A few of the “novel engine” ideas are already decided against. A vertical slide control is Tromodometer’s input. Turning a detected pitch into a position and a partial is ordinary pitch detection followed by the chart, and the mic stays a bad judge. Middle C is 3rd position on the 5th partial, or 6th on the 6th. It is not 4th partial. The position-and-partial matrix is the band-room chart, which this app is finally storing. A 20 ms loop and a latency-driven Anki schedule are not what makes the answer automatic.

## What to leave on the shelf

These are the usual gamification parts, and they fail the rules above. Points for their own sake, badges, levels with roman numerals, a global leaderboard, a daily streak, lives, an energy timer, a shop, a random reward, hats, a better slingshot, a 300 ms fail, and a story wrapped around the staff. Falling notes, a clock on the answer, and a score for how fast the position was found are the same dead end as a racing game: they test a reflex and do not build it. A reaction time is not shown at the end of a deal either. The one number that can remain is how long a packing run lasted before the board clogged, and even that is a glance after the fact, not a total on the screen while you play.

Pitch detection as a judge is a separate project with a lying referee. The samples can play the truth. The horn, when you have it, is how you find out whether the position you chose speaks.

## If we build any of it

Build inside this app, on its own screen, judged by the same chart the keys, the staff, and the horn already show. On the phone that screen is portrait and one-handed. The chart lands in the core app first, so a game is not the only place a short position exists.

A plausible order, once a category is on the Games screen:

- First, a visible-card solitaire or golf deal under Bass clef or Tenor clef: clef to position, one thumb, undo, no clock.
- Next, a persistent grid under Major keys or Minor keys: the scale, what moved, and the two-clue intersections.
- Then Positions: the partial-crossing path and the stack clear.
- Soloing and the covered beat stay off the screen until those sittings feel dull. The metronome stays off the subway game.

The Games button is the way in. A category, a sentence, Browse, or Surprise me starts the first sitting. My weaknesses appears only after the log can support it.

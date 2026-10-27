// Starting content for a new universe. Given who it's for and why, this writes
// a first draft of every word in the experience: the film, letters, coupons,
// puzzle words, trailer, finale and more. Names are baked in; the editor can
// change any of it. A few live values ({daysUntil}, {daysLate}, {years}…) are
// filled in when the universe plays, so they stay correct over time.
import { relById, occById, recommendedWorlds, DEFAULT_THEME } from './catalog.js';
import { info, nowSeason, todayISO, MONTHS } from './dates.js';

const R = (s, v) => String(s).replace(/\{(them|me|date|month|season|nowSeason|today)\}/g, (_, k) => v[k] ?? '');
const deep = (o, v) => Array.isArray(o) ? o.map(x => deep(x, v)) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, x]) => [k, deep(x, v)])) : typeof o === 'string' ? R(o, v) : o;
const uid = () => Math.random().toString(36).slice(2, 9);

const SKIP = /^(the|a|an|my|our|dr\.?|mr\.?|mrs\.?|ms\.?|mx\.?|prof\.?|sir|dame|aunt|auntie|uncle|grandma|grandpa|nana|papa|mama)$/i;
// the main word of a name: "Grandpa Walt" → "Walt", "The Thursday Club" → "Thursday", "Dr. Priya Rao" → "Priya"
export function keyWord(name) {
  const all = String(name || '').trim().split(/\s+/).filter(Boolean);
  const w = all.filter(x => !SKIP.test(x));
  return (w[0] || all[all.length - 1] || '').replace(/[^\p{L}\p{N}'’-]/gu, '');
}
export function studioName(me) {
  const all = String(me || '').trim().split(/\s+/).filter(Boolean);
  const w = all.filter(x => !/^(the|a|an)$/i.test(x));
  const base = (w[0] || all[0] || 'Little').replace(/[^\p{L}\p{N}'’-]/gu, '');
  return `${base} Pictures`;
}
export function verseName(name) {
  const w = [keyWord(name)];
  const base = (w[0] || 'Little').replace(/[^\p{L}\p{N}'-]/gu, '');
  return base.length > 12 ? 'Littleverse' : base + 'verse';
}
export function wordGameName(name) {
  const w = String(name || '').trim().split(/\s+/);
  return w.length === 1 && w[0].length <= 9 ? `${w[0]}-dle` : 'The Word Game';
}

/* ======================================================================
   The film
   ====================================================================== */
const CHAPTERS = {
  birthday: [['{season}', 'The one with your birthday in it.'], ['Tonight', 'The one with cake and a wish.'], ['Epilogue', 'The year ahead.']],
  belated: [['{season}', 'The one where {me} missed it.'], ['{nowSeason}', 'The one where {me} makes up for it.'], ['Epilogue', 'The version where {me} remembered.']],
  anniversary: [['The beginning', 'The one where it started.'], ['Now', 'The one where we’re still here.'], ['Epilogue', 'The next chapter.']],
  justbecause: [['Once upon a time', 'The one where we met.'], ['Lately', 'The one where I made you this.'], ['Epilogue', 'The part that keeps going.']],
  sorry: [['The mistake', 'The one where I got it wrong.'], ['The repair', 'The one where I try to make it right.'], ['Epilogue', 'The version where I do better.']],
  congrats: [['Before', 'The one with all the hard work.'], ['Today', 'The one where you did it.'], ['Epilogue', 'What comes next.']],
  farewell: [['Here', 'The one where we had you nearby.'], ['Departures', 'The one where you go somewhere new.'], ['Epilogue', 'The one where distance doesn’t count.']],
  getwell: [['Lately', 'The one where you’ve been resting.'], ['Soon', 'The one where you feel better.'], ['Epilogue', 'The good days ahead.']],
  reunion: [['Apart', 'The one with all the miles.'], ['Countdown', 'The one where the days get fewer.'], ['Epilogue', 'The one where we’re in the same room.']],
  thanks: [['What you did', 'The one where you showed up.'], ['What it meant', 'The one where I finally say it.'], ['Epilogue', 'Still grateful.']],
  remembrance: [['Your story', 'The one with you in it.'], ['Our story', 'The one where we keep you close.'], ['Epilogue', 'The light that keeps arriving.']],
  newyear: [['Last year', 'The one we got through together.'], ['This year', 'The one we’re about to start.'], ['Epilogue', 'Resolutions, loosely held.']],
};

const HERO_LINE = {
  birthday: 'A feature presentation in honor of {date}.',
  belated: 'A late-{season} feature, premiering {daysLate} after its release date of {date}.',
  anniversary: 'A long-running series, renewed every {date}.',
  justbecause: 'A feature presentation. No occasion required.',
  sorry: 'A feature-length apology. Popcorn optional.',
  congrats: 'A victory lap, in feature length.',
  farewell: 'A going-away feature. Departure: {date}.',
  getwell: 'A feature for resting days. Best watched under a blanket.',
  reunion: 'A countdown feature. {daysUntil} to go.',
  thanks: 'A feature presentation about gratitude.',
  remembrance: 'A feature about a life, and the light it keeps sending.',
  newyear: 'A feature presentation for the year ahead.',
};

const TAGLINE = {
  birthday: 'A birthday feature, plus an entire universe.', belated: 'A slightly late feature, plus an entire universe.',
  anniversary: 'An anniversary feature, plus an entire universe.', justbecause: 'A feature for no reason, plus an entire universe.',
  sorry: 'An apology in feature length, plus an entire universe.', congrats: 'A victory feature, plus an entire universe.',
  farewell: 'A going-away feature, plus an entire universe.', getwell: 'A get-well feature, plus an entire universe.',
  reunion: 'A countdown feature, plus an entire universe.', thanks: 'A thank-you feature, plus an entire universe.',
  remembrance: 'A feature about a life, and the light it left.', newyear: 'A new-year feature, plus an entire universe.',
};

const LOG = {
  birthday: { title: 'Birthday wish: cleared for launch', lede: 'Every year on {date}, a birthday wish leaves Earth headed for {them}. This year, mission control built a whole ship for it.',
    rows: [['{dateShort}', 'Launch window opens. Destination: {them}.'], ['T-MINUS', 'Cake loaded. Candles counted. Singing rehearsed, badly.'], ['LATER', 'Crew decides one wish isn’t enough. Builds a universe.', 'warn'], ['NOW', 'Wish arriving. Status: all good.', 'ok']] },
  belated: { title: 'Birthday wish: launched late', lede: 'On {date} a birthday wish was supposed to leave Earth. It didn’t. Mission control was, frankly, asleep at the console. Here is the incident report.',
    rows: [['{dateShort}', 'Launch window open. No wish launched. Pilot unaware.', 'warn'], ['NEXT DAY', 'Pilot still unaware. Everything seems fine, allegedly.'], ['LATER', 'Pilot checks calendar. Pilot makes a very specific noise.', 'warn'], ['TODAY', 'Emergency plan: build {them} an entire universe instead.'], ['NOW', 'Wish arriving. Status: all good.', 'ok']] },
  anniversary: { title: 'Mission: another year in orbit', lede: 'Two objects in space can circle each other for a very long time if the conditions are right. Here is the flight record.',
    rows: [['{dateShort}', 'First contact. Neither party plays it cool.'], ['SOON AFTER', 'Orbit established. Snacks shared. Inside jokes logged.'], ['LATER', 'Mission extended indefinitely, by mutual agreement.', 'warn'], ['NOW', 'Still in orbit. Status: all good.', 'ok']] },
  justbecause: { title: 'Message: no occasion required', lede: 'Most transmissions need a reason. This one checked the calendar twice and launched anyway.',
    rows: [['TODAY', 'Mission control notices {them} exists. Becomes very happy about it.'], ['LATER', 'Decides a text isn’t enough. Builds a universe.', 'warn'], ['NOW', 'Delivering. Reason: none needed.', 'ok']] },
  sorry: { title: 'Incident report: pilot error', lede: 'Every good crew writes down what went wrong, owns it, and fixes it. This is that report.',
    rows: [['{dateShort}', 'Mistake made. Pilot error. No excuses filed.', 'warn'], ['AFTER', 'Pilot feels terrible. Rightly so.'], ['LATER', 'Pilot decides “sorry” deserves more than one word.'], ['NOW', 'Apology arriving. Status: sincere.', 'ok']] },
  congrats: { title: 'Mission accomplished', lede: 'Big missions take a long time, a lot of fuel and a pilot who won’t quit. This one had all three.',
    rows: [['BEFORE', 'Long nights. Hard work. Doubts, ignored.'], ['{dateShort}', 'Target reached. Mission control loses its mind.', 'warn'], ['NOW', 'Victory lap in progress. Status: extremely proud.', 'ok']] },
  farewell: { title: 'Departure log', lede: 'Ships leave port all the time. This one is carrying someone important, so the crew packed something extra.',
    rows: [['{dateShort}', 'Bags packed. Heart, partially packed.'], ['AFTER', 'Crew notices the empty chair. Builds a universe to send along.', 'warn'], ['NOW', 'Channel open on all frequencies. Call anytime.', 'ok']] },
  getwell: { title: 'Recovery mission', lede: 'Mission control has one objective: get {them} feeling better. Supplies are on the way.',
    rows: [['NOW', 'Patient resting. Crew sends jokes, stars and one small universe.'], ['SOON', 'Expected outcome: feeling much better.', 'ok']] },
  reunion: { title: 'Countdown to arrival', lede: 'Two people, too many miles, one date circled on the calendar. Here is the flight plan.',
    rows: [['NOW', 'Distance: too much. Patience: holding.'], ['DAILY', 'Messages sent across time zones. Some at very odd hours.'], ['{dateShort}', 'Arrival. Hug protocols prepared.', 'ok']] },
  thanks: { title: 'Gratitude log', lede: 'Some things deserve to be written down properly. This is one of them.',
    rows: [['THEN', '{them} shows up when it matters.'], ['AFTER', 'Things go better than they would have. Noticeably.'], ['NOW', 'Thank-you note delivered. Status: overdue and sincere.', 'ok']] },
  remembrance: { title: 'A record of light', lede: 'When a star goes quiet, its light keeps traveling for a very long time. This is a small record of the light {them} sent out, and where it landed.',
    rows: [['{dateShort}', '{them} arrives. The world gets warmer.'], ['ALWAYS', 'Kindness given freely. Stories told twice, gladly.'], ['NOW', 'Still arriving, every time we remember.', 'ok']] },
  newyear: { title: 'New year launch sequence', lede: 'Twelve months of fuel, loaded and ready. Destination: somewhere better than last year.',
    rows: [['DEC 31', 'Countdown begins. Snacks deployed.'], ['00:00', 'Launch. Confetti everywhere.', 'warn'], ['NOW', 'Wishes on board for all twelve months.', 'ok']] },
};

// Stats are computed live from the date. k = which number, l = its label.
const STATS = {
  life: { stats: [{ k: 'years', l: 'trips around the sun' }, { k: 'days', l: 'sunrises so far' }, { k: 'moons', l: 'full moons since you arrived' }, { k: 'lightyears', l: 'how far the light from your first day has traveled' }],
    lede: 'The light from the day you were born is {lightyears} out by now, and still going. Somewhere out there, a very distant star is only just finding out about you.' },
  late: { stats: [{ k: 'daysLate', l: 'days late' }, { k: 'kmLate', l: 'km light travels in that time' }, { k: 'auLate', l: 'about {pluto}× farther than Pluto' }, { k: 'fixed', v: '8.6 years', l: 'for light to reach us from Sirius' }],
    lede: 'So, cosmically speaking, this wish is early. Starlight from Sirius takes almost nine years to get here and nobody calls it late. This one took {daysLate}. I’m choosing to count that as a win.' },
  together: { stats: [{ k: 'years', l: 'years together' }, { k: 'days', l: 'days since it started' }, { k: 'moons', l: 'full moons, shared' }, { k: 'lightyears', l: 'how far the light from our first day has traveled' }],
    lede: 'The light from the day we started is {lightyears} out by now. It has passed a lot of stars. None of them are as good as this.' },
  until: { stats: [{ k: 'daysUntil', l: 'days to go' }, { k: 'hoursUntil', l: 'hours, if you’re counting' }, { k: 'fixed', v: '1', l: 'sky over both of us' }, { k: 'fixed', v: '0', l: 'chance I’m late to the airport' }],
    lede: 'Light could cross the distance between us in a fraction of a second. We have to do it the slow way. It’s fine. Some things are worth the wait.' },
  memory: { stats: [{ k: 'years', l: 'years since you arrived' }, { k: 'moons', l: 'full moons since your first' }, { k: 'lightyears', l: 'how far your first light has traveled' }, { k: 'fixed', v: '∞', l: 'times we’ve told your stories' }],
    lede: 'When a star goes quiet, its light keeps traveling. The light from the day you were born is {lightyears} out and still going. So is everything you gave us.' },
  rest: { stats: [{ k: 'fixed', v: '9', l: 'hours of sleep, doctor’s orders' }, { k: 'fixed', v: '∞', l: 'cups of tea, available on request' }, { k: 'fixed', v: '0', l: 'chores you should be doing' }, { k: 'fixed', v: '1', l: 'universe, built for resting' }],
    lede: 'The prescription is simple: rest, fluids, and one small universe, taken as needed. No side effects except feeling a little more loved.' },
  since: { stats: [{ k: 'days', l: 'days since {date}' }, { k: 'km', l: 'km light has traveled since then' }, { k: 'au', l: 'about {pluto}× farther than Pluto' }, { k: 'fixed', v: '1', l: 'universe, built for you' }],
    lede: 'Light has crossed {au} since {date}. That’s a long way. This message only had to get from me to you.' },
};
function statsFor(occ, rel, yearKnown, future) {
  if (occ === 'belated') return 'late';
  if (future) return 'until';
  if (occ === 'reunion') return 'until';
  if (occ === 'getwell') return 'rest';
  if (rel === 'memorial' || occ === 'remembrance') return yearKnown ? 'memory' : 'since';
  if (occ === 'birthday') return yearKnown ? 'life' : 'until';
  if (occ === 'anniversary') return yearKnown ? 'together' : 'until';
  return 'since';
}

const WISHES = {
  joy: ['A song that shows up at exactly the right moment.', 'A purple sky on an ordinary Tuesday.', 'Mornings that start slow, on purpose.', 'A laugh so hard it goes silent.', 'Good news you didn’t see coming.', 'One truly excellent nap.', 'The window seat, every time.', 'Leftovers that taste better the next day.', 'A plan that falls through into something better.', 'Warm socks straight out of the dryer.', 'A friend who texts back fast.', 'The feeling of being exactly where you should be.'],
  care: ['A full night of sleep, start to finish.', 'Soup that tastes like someone who loves you made it.', 'A day where nothing hurts.', 'Sunlight on the blanket at the right angle.', 'A show good enough to watch twice.', 'Visitors who know when to leave.', 'Tea at exactly the right temperature.', 'A good-news phone call.', 'Patience with yourself.', 'Fresh sheets.', 'The first walk outside in a while.', 'Feeling like you again.'],
  win: ['A first day that goes better than expected.', 'Colleagues who become friends.', 'Your name, said with respect.', 'Coffee that actually works.', 'A desk with a view.', 'The courage to ask the obvious question.', 'A mentor who believes in you early.', 'A Friday that feels earned.', 'Rest without guilt.', 'Proof you were right to try.', 'A new favorite place.', 'The next impossible thing, made possible.'],
  memory: ['That we keep telling your stories, and get them a little wrong, the way you did.', 'That your recipes keep showing up on our tables.', 'That we hear your laugh in someone else’s.', 'Quiet mornings, the way you liked them.', 'That the garden keeps growing.', 'That we’re as patient as you were.', 'That the little ones know who you were.', 'Your songs, played loud.', 'That missing you gets softer, but never smaller.', 'That we call each other more.', 'That we’re kind to strangers, because you were.', 'That you knew how loved you were.'],
  kid: ['A pillow fort that never falls down.', 'Pancakes shaped like anything you want.', 'A puddle big enough to jump in.', 'A best friend at recess.', 'Finding a four-leaf clover.', 'Staying up late, just once.', 'A dog that wants to be your friend.', 'A bike ride downhill.', 'Ice cream that doesn’t melt too fast.', 'A book you can’t put down.', 'Snow days.', 'Always feeling brave enough.'],
};
const wishSet = (occ, rel) => rel === 'memorial' || occ === 'remembrance' ? 'memory' : rel === 'kid' ? 'kid' : occ === 'getwell' || occ === 'sorry' ? 'care' : occ === 'congrats' || occ === 'farewell' ? 'win' : 'joy';

const CATCH_TITLE = {
  memory: 'Catch 12 stars, one for every month we carry you with us', joy: 'Catch 12 stars, one for every month ahead', care: 'Catch 12 stars, one for every day of feeling better',
  win: 'Catch 12 stars, one for every month of the next adventure', kid: 'Catch 12 stars, one for every month ahead',
};

const LETTER = {
  birthday: `{them},

Happy birthday. I wanted to give you something you could open more than once, so I built you a small universe. It has games, letters, a sky full of stars, and a few secrets. Take your time with it.

Here’s what I keep thinking about: when you look up at a star, the light you see left it a long time ago. It crossed all that dark to land on you. That’s how the people who matter feel to me. They keep arriving.

I hope this year gives you big sunsets, songs that show up exactly when you need them, and people who make you feel like the main character. You deserve all of it.

Happy birthday. Go explore.`,
  belated: `{them},

I missed your birthday. {date} came and went and I didn’t say anything, and I’ve felt bad about it ever since. So instead of a quick “sorry, happy late birthday” text, I made you this.

Here’s what I keep thinking about. When you look up at a star, the light you see left it a long time ago. Nobody calls that light late. It still made it, and it still means something out there was shining the whole time.

That’s what this is. The wish is late. What’s behind it isn’t.

I hope this year gives you big sunsets, songs that show up exactly when you need them, and people who make you feel like the main character. You deserve all of it.

Happy birthday, {them}.`,
  anniversary: `{them},

Happy anniversary. I tried to find a gift that said “I’d pick you again,” and everything in the shops said “here is a candle.” So I built you a universe instead.

Since {date} a lot has changed: places, plans, how much of the blanket you take. What hasn’t changed is how glad I am that it’s you.

Here’s to the next year, and the inside jokes we haven’t made yet.`,
  justbecause: `{them},

No occasion. I checked the calendar twice.

I just wanted you to have something that says, in a lot more words than a text, that I’m really glad you exist.

So here’s a universe. It has games and letters and a sky you can draw on. Wander around. Come back whenever you need a reminder.

That’s it. That’s the whole reason.`,
  sorry: `{them},

I’m sorry.

I got it wrong, and I know a sorry only means something if it comes with doing better. So this isn’t instead of a real conversation. It’s the start of one.

I made you this because I wanted you to have something that says, slowly and in a lot of ways, that you matter to me more than being right does.

Take your time. I’ll be here when you’re ready.`,
  congrats: `{them},

YOU DID IT.

I watched you work for this. The late nights, the doubts, the days you kept going anyway. Today all of that paid off, and I’m so proud I could build a universe about it. So I did.

Celebrate properly. Not “okay, next thing.” Properly.

Then go do the next impossible thing. I’ll be cheering for that one too.`,
  farewell: `{them},

So you’re really going.

I’m excited for you, honestly. New streets, new routines, a new favorite place to get coffee. But I wanted you to take a piece of here with you, so I packed you a universe.

Open it when the new place feels too new. Open it when something funny happens and you think of us. Open it whenever.

Distance is just a number. We’ve survived worse group projects.`,
  getwell: `{them},

I’m sorry you’re stuck resting. I made you something to do that doesn’t require getting up: a little universe with games, letters and a sky full of stars.

No pressure to finish any of it. Play a round, read a letter, take a nap, come back later.

Get well soon. Everything’s a bit quieter without you.`,
  reunion: `{them},

{daysUntil}. I’m counting.

The distance is the worst part, so I built something to make the waiting better: a universe you can open on the hard days and the boring ones.

We’re under the same sky, even when it’s a different time on each side of it. Look up tonight. I probably will too.

See you soon. Like, actually soon.`,
  thanks: `{them},

Thank you.

It’s a small word for what you did, so I built something bigger to carry it: a little universe, made just for you.

You probably don’t know how much it mattered. That’s kind of the point of this. Now you will.

Thank you, for real.`,
  remembrance: `{them},

We made this so there would be a place where you’re still at the center of things. A small universe, full of the things you loved and the stories we keep telling.

When a star goes quiet, its light keeps traveling for a long time. That’s what you are to us. Still arriving, every time we laugh the way you did, cook what you cooked, or say something only you would have said.

We miss you. We’ll keep the light on.`,
  newyear: `{them},

Happy new year. The last one had its moments, and I’m grateful you were in most of mine.

So here’s a universe to start this one: games, letters, wishes for every month, and a sky that’s yours to fill.

Here’s to a good year. Let’s make it a great one.`,
};
const LETTER_REL = {
  kid: `Hi {them}!

This whole universe is for you. There are games, a sky full of stars, a candy machine, and secret things hidden everywhere. Look carefully.

You are brave and funny and kind, and you make everybody around you happier. That’s a fact. I checked.

Have fun exploring!`,
  pet: `Dear {them},

You can’t read. We know. We made this anyway.

Thank you for the welcomes at the door, the warm spot on the couch, and the way you look at us like we invented dinner.

You are a very good friend. The best, actually.`,
  self: `Hey, future me.

Right now it’s {today}. I don’t know what you’re doing when you open this, but I hope you’re proud of the way you’re doing it.

Remember: you’ve gotten through every hard day so far. That’s a perfect record.

Be kind to yourself. You’re the only you there is.`,
};

const TIMELINES = {
  belated: { a: ['That timeline', [['{dateShort} · 00:00', 'The first “happy birthday” of the day is mine.'], ['09:00', 'Breakfast shows up with a candle stuck in it.'], ['19:30', 'A sunset somewhere high up. Bad singing, good cake.'], ['23:59', 'You fall asleep happy and a year older.']]],
    b: ['This timeline', [['{dateShort}', 'I forget. Honestly unforgivable.'], ['After', 'Guilt, in slowly increasing amounts.'], ['Later', 'I build you a small universe instead.'], ['Today', 'You’re reading this. The wish lands.']]],
    closing: 'A different ending with the same two of us in it. I think this one’s okay too.', redeem: 'That timeline is redeemable, by the way. There’s a coupon book.' },
  birthday: { a: ['The plan', [['00:00', 'The first “happy birthday” of the day.'], ['09:00', 'Breakfast with a candle stuck in it.'], ['19:30', 'A sunset somewhere high up. Bad singing, good cake.'], ['23:59', 'You fall asleep happy and a year older.']]],
    b: ['The year ahead', [['Spring', 'Something you started finally blooms.'], ['Summer', 'Long evenings, cold drinks, no alarms.'], ['Fall', 'A cozy month. Blankets strongly indicated.'], ['Winter', 'Lights, snacks, and at least one excellent nap.']]],
    closing: 'Same you, one year better. That’s the whole forecast.' },
  anniversary: { a: ['Then', [['{dateShort}', 'We meet. Neither of us plays it cool.'], ['Soon after', 'The first inside joke.'], ['Later', 'Your toothbrush shows up at my place.'], ['Somewhere', 'A fight about nothing. Making up about everything.']]],
    b: ['Now', [['Today', 'You, opening this.'], ['Tonight', 'Dinner, my treat. Check the coupons.'], ['Next year', 'More of this, please.'], ['Always', 'Still picking you.']]],
    closing: 'Two timelines, one story. It’s my favorite one.' },
  justbecause: { a: ['Ordinary days', [['Morning', 'Coffee. Alarm. Snooze.'], ['Afternoon', 'Emails nobody wanted.'], ['Evening', 'Dinner, dishes, a show.'], ['Night', 'Bed, eventually.']]],
    b: ['With you in them', [['Morning', 'A message from you. Day improves.'], ['Afternoon', 'Something reminds me of you. Day improves.'], ['Evening', 'We talk. Day improves.'], ['Night', 'Fall asleep happy.']]],
    closing: 'Same days. Better with you in them.' },
  sorry: { a: ['What happened', [['Then', 'I got it wrong.'], ['After', 'You were hurt, and you had every right to be.'], ['Since', 'I’ve thought about it a lot.']]],
    b: ['What I’ll do', [['Now', 'Say sorry properly. This is that.'], ['Next', 'Listen more than I explain.'], ['Always', 'Do better, and keep doing it.']]],
    closing: 'I can’t change the first column. I can promise the second.' },
  congrats: { a: ['Before', [['Months ago', 'A plan, and a lot of nerve.'], ['Late nights', 'Coffee. Lots of it.'], ['The hard part', 'Doubts, ignored.'], ['Every day', 'Kept going anyway.']]],
    b: ['Now', [['Today', 'You did it.'], ['Tonight', 'Celebrate properly.'], ['Tomorrow', 'The next impossible thing.'], ['Always', 'So proud of you.']]],
    closing: 'All of the first column made the second one possible.' },
  farewell: { a: ['Here', [['Mornings', 'Coffee at the usual place.'], ['Weekends', 'Plans made last minute.'], ['Always', 'You, five minutes away.']]],
    b: ['There', [['Mornings', 'A new usual place. Send photos.'], ['Weekends', 'Video calls, too long, on purpose.'], ['Always', 'You, one message away.']]],
    closing: 'Different map. Same people.' },
  getwell: { a: ['Today', [['Morning', 'Rest.'], ['Afternoon', 'More rest.'], ['Evening', 'Soup, a blanket, something good to watch.']]],
    b: ['Soon', [['Next week', 'Feeling more like yourself.'], ['After that', 'A walk outside.'], ['Then', 'The celebration we owe you.']]],
    closing: 'Go slowly. We’re not going anywhere.' },
  reunion: { a: ['Apart', [['Mornings', 'Good morning, sent into the night.'], ['Evenings', 'Phone calls that cut out at the best part.'], ['Weekends', 'Watching the same movie, at the same time, far apart.']]],
    b: ['Together', [['{dateShort}', 'An airport hug, embarrassingly long.'], ['That night', 'Your favorite dinner, no screens.'], ['After', 'Ordinary days, in the same room.']]],
    closing: 'The first column is almost over.' },
  thanks: { a: ['What you did', [['Then', 'You showed up.'], ['When it mattered', 'You said the right thing.'], ['Quietly', 'You did more than anyone noticed.']]],
    b: ['What it meant', [['Then', 'I didn’t feel alone.'], ['After', 'Things went better than they would have.'], ['Now', 'I’m writing this.']]],
    closing: 'Small things, it turns out, are the big ones.' },
  remembrance: { a: ['What you gave us', [['Always', 'Your laugh, first and loudest.'], ['Sundays', 'Your cooking, and your opinions about ours.'], ['Hard days', 'Patience we didn’t deserve.'], ['Every day', 'A home to come back to.']]],
    b: ['What we’ll keep', [['Always', 'Your stories, told badly and often.'], ['Sundays', 'Your recipes, on our tables.'], ['Hard days', 'Your patience, borrowed.'], ['Every day', 'You, in all of us.']]],
    closing: 'You’re in both columns. You always will be.' },
  newyear: { a: ['Last year', [['January', 'Big plans.'], ['Spring', 'Some of the plans.'], ['Summer', 'Better plans.'], ['December', 'Made it.']]],
    b: ['This year', [['January', 'This universe.'], ['Spring', 'Something new.'], ['Summer', 'Somewhere warm.'], ['December', 'Look back and smile.']]],
    closing: 'Here’s to the second column.' },
};

const CAKE = {
  blow: { kicker: 'Scene 4 · the part with cake', big: 'Make a wish, then blow them out.', small: 'Tap each flame. Or turn on the microphone and actually blow. Your call.' },
  light: { kicker: 'Scene 4 · five candles', big: 'Light a candle for each thing you want to say.', small: 'Tap each wick to light it. They’ll stay lit.' },
};
const CAKE_DONE = { birthday: 'Wish sent. Happy birthday, {them}!', belated: 'Wish sent. Happy birthday, {them}!', anniversary: 'Wish sent. Happy anniversary!', newyear: 'Wish sent. Happy new year!',
  congrats: 'Wish sent. Congratulations!', farewell: 'Wish sent. Safe travels!', reunion: 'Wish sent. See you soon!', remembrance: 'All five are lit, for {them}.', sorry: 'All five are lit. I meant every one.', getwell: 'All five are lit. Feel better soon.' };

const CHORD_MSG = { birthday: 'happy birthday {them}', belated: 'happy birthday {them}', anniversary: 'happy anniversary', justbecause: 'just because', sorry: 'i am sorry', congrats: 'congratulations', farewell: 'bon voyage', getwell: 'get well soon', reunion: 'see you soon', thanks: 'thank you', remembrance: 'we miss you', newyear: 'happy new year' };

/* ======================================================================
   Open When… letters
   ====================================================================== */
const SLEEP = { id: 'sleep', when: 'you can’t sleep', color: 'lilac', breathe: true, body:
`Can’t sleep? Okay. Let’s do this together.

Breathe with the star below. In while it grows, hold while it glows, out while it fades. Four rounds and the night gets a little quieter.

While you breathe, here’s something to fall asleep on: right now, light that left a star before you were born is landing on your window. It crossed all that space and the place it ended up was a sleepy person. Good choice.

Goodnight, {them}.` };
const ROUGH = { id: 'rough', when: 'it’s a rough day', color: 'rose', body:
`Hey. Rough one? Okay. You don’t have to fix it tonight.

A few reminders from someone who thinks you’re great:

— Bad days are one day long. They don’t get to be the whole year.
— You’ve gotten through every hard day so far. Every single one. That’s a perfect record.
— You’re allowed to rest without earning it first.

If it helps, go stack a ridiculous cake in the Cake Tower. Or message me. I’ll answer.` };
const PROUD = { id: 'proud', when: 'you did something great', color: 'mint', body:
`YOU DID IT.

I don’t know what “it” is yet, but I already know two things: you worked for it, and I’m proud of you.

Celebrate properly. Not “okay, next thing.” Properly. A snack, a song, a small dance in the kitchen. That’s an order from mission control.

Then tell me what it was, so I can be annoying about how proud I am.` };
const WHENEVER = { id: 'whenever', when: 'whenever', color: 'lilac', body:
`No reason. No occasion.

You’re one of my favorite people, and I wanted at least one letter in here that doesn’t need an excuse to be opened.

That’s it. That’s the letter.` };
const MISS = { id: 'miss', when: 'you want to hear from me', color: 'gold', body:
`Hi. You opened this one, so I’m going to assume I crossed your mind, which is very nice of you.

I’m probably doing something unimpressive right now. Eating. Losing an argument with my laptop. But some part of my brain is definitely running the “I hope {them}’s okay” program. It runs a lot. I’m not turning it off.

Go send me a message. Any message. A single emoji counts.` };

const LETTERS = {
  partner: [
    { id: 'laugh', when: 'you need a laugh', color: 'gold', body:
`Things I’ve done because of you, ranked by dignity:

1. Built you a universe. (Dignified.)
2. Learned your coffee order by heart. (Reasonable.)
3. Practiced saying “I love you” to the mirror before the first time. (Zero dignity. Worth it.)
4. Hid tiny versions of myself all over this universe so you’d find me. (Concerning.)

If you’re still not laughing, picture me in a propeller hat trying to parallel park a spaceship. That’s me most days, emotionally.` },
    SLEEP, ROUGH, PROUD, MISS, WHENEVER],
  bestie: [
    { id: 'laugh', when: 'you need a laugh', color: 'gold', body:
`Remember when we laughed so hard we couldn’t breathe and neither of us could explain why to anyone else?

That’s still the funniest thing that has ever happened. I will not be taking questions.

Go reread our old messages. Start from the beginning. Report back.` },
    { id: 'bored', when: 'you’re bored', color: 'mint', body:
`Bored? Good news. You are holding an entire universe.

Suggestions, in order:
1. Beat my score in the Flight Academy. (You can’t.)
2. Draw a constellation that looks like a very bad horse.
3. Text me “boo” and see how long it takes me to answer.

You’re welcome.` },
    SLEEP, ROUGH, PROUD, WHENEVER],
  friends: [
    { id: 'quiet', when: 'the group chat goes quiet', color: 'gold', body:
`Someone has to break the silence. Today it’s you.

Ideas:
— A photo of your lunch, unexplained.
— “Remember when…” and then just leave it there.
— A poll about something that doesn’t matter at all.

Nobody’s mad. Everyone’s just busy. A single message fixes it.` },
    { id: 'pep', when: 'someone needs a pep talk', color: 'rose', body:
`If you’re reading this, one of you is having a hard time. Here’s the plan:

1. Everyone sends one thing they love about that person. Specific. No “you’re nice.”
2. Someone sends a ridiculous photo.
3. Someone proposes a plan with a date on it.

That’s it. That’s the whole friendship manual.` },
    { id: 'together', when: 'you’re all together again', color: 'mint', body:
`Look around. All of you, in one place. Do you know how hard that is to schedule?

Take a photo. A good one. Then take a bad one, which will end up being the favorite.

Then put the phones away. This is the good part.` },
    { id: 'laugh', when: 'you need a laugh', color: 'gold', body:
`A short list of things this group has never once done on time:

1. Replied to a calendar invite.
2. Agreed on a restaurant.
3. Split a bill without a spreadsheet.
4. Left a party when we said we would.

Never change. Actually, maybe change the bill thing.` },
    SLEEP, WHENEVER],
  family: [
    { id: 'home', when: 'you miss home', color: 'gold', body:
`The kitchen still smells the same. The good mug is still in the cupboard. Your spot is still your spot.

Home isn’t going anywhere. Neither are we.

Call when you can. Or don’t, and we’ll call you. We usually do anyway.` },
    { id: 'laugh', when: 'you need a laugh', color: 'mint', body:
`Some family traditions, as observed by an outside expert:

— Saying “we should leave” forty-five minutes before leaving.
— Arguing about the board game rules every single time.
— Taking a group photo where someone’s eyes are always closed.

Never fix any of these.` },
    SLEEP, ROUGH, PROUD, WHENEVER],
  distance: [
    MISS,
    { id: 'tz', when: 'the time difference is annoying', color: 'mint', body:
`It’s morning for one of us and night for the other, and somehow we keep making it work anyway.

Here’s a secret: the moon you see tonight is the same one I saw a few hours ago. I left it there for you.

Look up. Say goodnight. I’ll get it eventually.` },
    { id: 'beautiful', when: 'you see something beautiful', color: 'gold', body:
`Send me a photo. Blurry is fine. Badly framed is fine.

I want to see what you’re seeing. That’s the closest thing to being there, until I’m actually there.` },
    SLEEP, ROUGH, WHENEVER],
  memorial: [
    { id: 'miss', when: 'we miss you most', color: 'lilac', body:
`Some days are fine. Some days the smallest thing, a song in a shop, a voice that sounds like yours, and we’re right back to missing you.

We’ve decided that’s okay. Missing you is just love with nowhere to go. So we’re putting it here.

We love you. We miss you. Both, always.` },
    { id: 'good', when: 'something good happens', color: 'gold', body:
`Something good happened today, and the first thought was: we have to tell you.

So we’re telling you. You would have made a fuss about it. You would have been proud. You would have asked a hundred questions.

Consider yourself told.` },
    { id: 'birthday', when: 'it’s your birthday', color: 'rose', body:
`Happy birthday.

We still make the cake. We still sing, badly, the way you liked. Someone always cries a little, and then someone tells a story that makes everybody laugh.

You’d like it, we think. It’s a lot like the ones you threw.` },
    { id: 'quiet', when: 'the house is too quiet', color: 'mint', body:
`The house is quieter without you. We notice it most in the evenings.

So we put your music on. We open the windows. We talk too loudly, like you did.

It helps. Not all the way. Enough.` },
    { id: 'recipe', when: 'we cook your recipe', color: 'gold', body:
`We made it again. It wasn’t quite right. It never is.

We think you left something out of the recipe on purpose, so we’d have to keep trying.

We will. Every time.` },
    { id: 'advice', when: 'we need your advice', color: 'lilac', body:
`We still ask “what would you do?” more than you’d believe.

Usually we know the answer: be patient, be kind, eat something, call your family.

You’re still giving advice. You just let us do the talking now.` },
  ],
  kid: [
    { id: 'tooth', when: 'you lose a tooth', color: 'gold', body:
`You lost a tooth! That means you’re growing, which is very impressive.

Put it under your pillow. Go to sleep. Something magical might happen.

(Also, smile in the mirror. That gap is extremely cool.)` },
    { id: 'sleep', when: 'you can’t sleep', color: 'lilac', breathe: true, body:
`Can’t sleep? Let’s breathe together.

Watch the star below. Breathe in while it grows. Hold it while it glows. Breathe out while it fades.

Do it four times. The stars outside are doing it too.

Goodnight, {them}.` },
    { id: 'bored', when: 'you’re bored', color: 'mint', body:
`Bored? Here are some missions:

1. Build the tallest cake in the Cake Tower.
2. Find all the hidden friends in this universe.
3. Draw a constellation shaped like your favorite animal.

Report back with results.` },
    { id: 'brave', when: 'you did something brave', color: 'rose', body:
`You did something brave today!

Being brave doesn’t mean you weren’t scared. It means you were scared and did it anyway. That’s the best kind.

We are SO proud of you.` },
    { id: 'sad', when: 'you feel sad', color: 'rose', body:
`It’s okay to feel sad. Everybody does sometimes, even grown-ups. Even superheroes.

Find someone who loves you and ask for a big hug. That’s allowed. It works really well.

Tomorrow is a new day.` },
    WHENEVER],
  mentor: [
    { id: 'land', when: 'a lesson doesn’t land', color: 'gold', body:
`Some days nothing sticks. The room is tired. You’re tired.

For the record: one of your lessons didn’t land for me for about three years. Then one day it did, all at once, and I’ve used it ever since.

You’re planting things. Some of them take a while.` },
    { id: 'matter', when: 'you wonder if it mattered', color: 'lilac', body:
`It mattered.

Not just the big things. The extra five minutes after class. The note in the margin. The time you said “you can do this” like you meant it.

I’m still carrying all of it.` },
    { id: 'term', when: 'it’s the last day of term', color: 'mint', body:
`You made it. Another one.

Go home early. Put your feet up. Let somebody else do the explaining for a while.

You’ve earned it many times over.` },
    ROUGH, WHENEVER],
  colleague: [
    { id: 'monday', when: 'Monday is a lot', color: 'gold', body:
`Mondays are just Fridays that haven’t built any character yet.

Get a coffee. Answer the easy emails first. Pretend the hard one doesn’t exist until after lunch.

You’ve done this before. You’re very good at it.` },
    { id: 'meeting', when: 'the meeting could’ve been an email', color: 'mint', body:
`Mute yourself. Take a deep breath. Draw a small spaceship in the margin of your notes.

Everyone else in this meeting is also drawing something. That’s how we survive.` },
    { id: 'promo', when: 'you get promoted', color: 'rose', body:
`Called it.

Seriously, congratulations. You’ve been doing the job above your job for a while now. It’s about time the title caught up.

Drinks are on you. (Kidding. Mostly.)` },
    { id: 'miss', when: 'you miss the old team', color: 'lilac', body:
`The new place probably has better coffee. It does not have better people. We checked.

Send us a message. We’ll pretend to be busy, then reply immediately.` },
    WHENEVER],
  pet: [
    { id: 'mail', when: 'the mail arrives', color: 'gold', body:
`Yes, there is someone at the door. Yes, they are probably a threat.

You may sound the alarm. Thank you for your service.` },
    { id: 'treat', when: 'you hear the treat bag', color: 'rose', body:
`You heard it. We know you heard it. Everyone in the house heard you hear it.

Sit nicely. Look adorable. Wait for it.

(It’s for you. It’s always for you.)` },
    { id: 'late', when: 'we’re late home', color: 'lilac', body:
`We’re coming. We’re sorry. We didn’t forget about you, not even for a second.

When we walk through that door, please do the thing where you act like it’s been a hundred years. It’s our favorite part of the day.` },
    { id: 'good', when: 'you’re being very good', color: 'mint', body:
`Who’s good? You’re good.

That’s it. That’s the whole letter. You’re very, very good.` },
  ],
  self: [
    { id: 'doubt', when: 'you doubt yourself', color: 'rose', body:
`Hey. It’s me. You, from before.

I just want to remind you that you’ve doubted yourself before, and you were wrong every time. Every single time.

Go do the scary thing. I already believe you can.` },
    { id: 'why', when: 'you forget why you started', color: 'gold', body:
`You started because you wanted something better. Not perfect. Better.

Look back at where you were. That’s how far you’ve come. Keep going.` },
    { id: 'laugh', when: 'you need a laugh', color: 'mint', body:
`Remember that time you walked into a glass door? In public? While waving?

You survived that. You can survive anything.` },
    PROUD, WHENEVER],
};

function lockedLetters(occ, rel, d, them, me) {
  const out = [];
  const nextISO = `${d.next.getFullYear()}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  if (['birthday', 'belated'].includes(occ) && rel !== 'memorial') out.push({ id: 'nextdate', when: `it’s ${d.long} again`, color: 'rose', lock: { date: nextISO }, body:
`HAPPY BIRTHDAY, ${them}.

${occ === 'belated' ? 'On time, for once. If you’re reading this, the alarms worked.\n\n' : ''}This is supposed to be the first “happy birthday” of your day. Another whole year of you. Go outside tonight and look up for a minute. The sky is putting on a show somewhere.

I hope this is your best year yet. I’ll be around for every part of it I can.` });
  if (occ === 'anniversary') out.push({ id: 'nextdate', when: 'it’s our next anniversary', color: 'rose', lock: { date: nextISO }, body:
`Another year. Look at us.

I’d say I can’t believe it, but I can. I’d pick you again. I’d pick you every time.

Happy anniversary.` });
  if (occ === 'reunion') out.push({ id: 'nextdate', when: 'we’re finally together', color: 'rose', lock: { date: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` }, body:
`You’re here. Or I’m there. Either way: same room, finally.

Put the phone down. Seriously. This letter can wait. I can’t.` });
  if (occ === 'newyear' || rel === 'self') out.push({ id: 'nextdate', when: 'a year from now', color: 'rose', lock: { date: (() => { const t = new Date(); return `${t.getFullYear() + 1}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; })() }, body:
`A whole year. How did it go?

Whatever happened, you got through it. Take a minute to notice that before you rush into the next one.

Proud of you. Same time next year?` });
  if (rel !== 'memorial' && rel !== 'pet') out.push({ id: 'final', when: 'you’ve collected 12 stamps', color: 'gold', lock: { stamps: 12 }, body:
`If you’re reading this, you’ve seen most of this universe by now.

Honest version: I started building this because I wanted to give you something bigger than a message. Somewhere along the way it stopped being a project and started being fun, because I kept imagining you having fun in it.

Every planet in here is a little “I was thinking about you.” There are a lot of planets.

Thank you for exploring it. Thank you for being the kind of person who makes someone want to build a universe.` });
  if (rel === 'memorial') out.push({ id: 'final', when: 'every candle is lit', color: 'gold', lock: { stamps: 8 }, body:
`If you’ve walked all the way through this place, you’ve seen a lot of what we remember.

It isn’t everything. It couldn’t be. But it’s a place to come back to when we want to be near you for a while.

Thank you for everything you were. We’ll keep the light on.` });
  return out;
}

/* ======================================================================
   Coupons (or promises)
   ====================================================================== */
const C = (id, title, fine, icon) => ({ id, title, fine, icon });
const COUPONS = {
  partner: [C('breakfast', 'Breakfast in bed, with a candle stuck in it', 'Candle placement is the chef’s choice.', '🥞'), C('movie', 'One movie night. You pick.', 'I don’t complain. Out loud. Popcorn on me.', '🍿'), C('right', 'One “you were right”', 'Said sincerely, with no follow-up questions. Can be used retroactively.', '🏳️'), C('plan', 'One day where I plan everything', 'You just show up. I handle the rest, including the boring parts.', '🗺️'), C('dance', 'A slow dance in the kitchen', 'Music of your choosing. Dishes can wait.', '💃'), C('drink', 'One drink of your choice, any size', 'All the toppings. No judgment about the toppings.', '🧋'), C('playlist', 'One playlist, made only for you', 'No skips required. Liner notes included.', '📼'), C('sunset', 'A sunset somewhere high up', 'Bad singing and good snacks included.', '🌇')],
  bestie: [C('snack', 'One emergency snack run', 'Any hour. Any snack. No questions asked.', '🍟'), C('come', 'One “I’ll come with you”', 'To anything. The dentist. A wedding. Your ex’s party. Anything.', '🫶'), C('outfit', 'One brutally honest outfit opinion', 'Delivered with love and zero filter.', '👗'), C('call', 'One late-night phone call', 'No questions, no time limit, no judgment.', '📞'), C('dj', 'Road trip DJ rights', 'Full control of the aux. I won’t touch it. Probably.', '🎧'), C('dinner', 'One dinner on me', 'You pick the place. I pick dessert.', '🍝'), C('photo', 'One good photo of you', 'I’ll take forty until you like one.', '📸'), C('pep', 'One pep talk, on demand', 'Volume and intensity adjustable.', '📣')],
  friends: [C('round', 'One round, on me', 'Valid for the whole table. Yes, even them.', '🍻'), C('host', 'One game night, hosted', 'I clean up after. Snacks included.', '🎲'), C('aux', 'The aux, for one night', 'Your playlist, no vetoes.', '🎧'), C('trip', 'One trip, planned', 'I’ll make the spreadsheet. You just show up.', '🗺️'), C('photo', 'One group photo where everyone looks good', 'I’ll keep taking it until it happens.', '📸'), C('brunch', 'One brunch, booked', 'At a reasonable hour. By our standards.', '🥂')],
  family: [C('call', 'One long phone call', 'No rushing, no “I have to go.”', '📞'), C('meal', 'One home-cooked meal', 'Your favorite. I’ll even do the dishes.', '🍲'), C('fix', 'One “I’ll fix that thing”', 'The leaky tap, the wobbly shelf, the printer.', '🔧'), C('day', 'One day out, together', 'Wherever you want to go.', '🚗'), C('tech', 'Tech help, without sighing', 'Valid for any device, any number of times.', '💻'), C('visit', 'One surprise visit', 'I’ll bring dessert.', '🧁')],
  distance: [C('call', 'One video call, any length', 'Even if one of us falls asleep.', '📱'), C('package', 'One surprise package', 'Contents classified.', '📦'), C('movie', 'One movie, watched in sync', 'Press play on three.', '🍿'), C('morning', 'One “good morning” in your time zone', 'Even if it’s 3am for me.', '🌅'), C('airport', 'One airport pickup with a sign', 'The sign will be embarrassing.', '🪧'), C('letter', 'One letter, by real mail', 'Handwritten. Stamp included.', '✉️')],
  memorial: [C('sauce', 'We’ll keep making your recipes', 'And arguing about the salt, like you would have.', '🍲'), C('garden', 'We’ll keep the garden going', 'Even the plant nobody can name.', '🌷'), C('stories', 'We’ll tell the little ones your stories', 'The good ones, and the ones you’d deny.', '📖'), C('call', 'We’ll call each other more', 'Like you always told us to.', '📞'), C('songs', 'We’ll play your songs, loud', 'In the car, in the kitchen, everywhere.', '🎶'), C('kind', 'We’ll be kind to strangers', 'Because you always were.', '🤍'), C('chair', 'We’ll keep a place at the table', 'At every holiday. Always.', '🕯️')],
  kid: [C('story', 'One extra bedtime story', 'Any book. Even the long one.', '📚'), C('fort', 'One pillow fort, built together', 'Engineering by you. Heavy lifting by me.', '🏰'), C('icecream', 'Ice cream for dinner', 'Once. Don’t tell anyone.', '🍦'), C('park', 'One trip to the park', 'Swings, slides, as long as you want.', '🛝'), C('late', 'Stay up 30 minutes later', 'Valid on a weekend.', '🌙'), C('pancake', 'One pancake shaped like anything', 'Results may vary. Artistic interpretation allowed.', '🥞'), C('yes', 'One day of “yes”', 'Within reason. Mostly.', '🎉')],
  mentor: [C('coffee', 'One coffee, on me', 'And a proper catch-up.', '☕'), C('card', 'A thank-you card, every year', 'Handwritten. Forever.', '💌'), C('favor', 'One favor, any size', 'You helped me. I’d like to return it.', '🤝'), C('visit', 'One visit to your class', 'To tell them it works.', '🎓')],
  colleague: [C('coffee', 'One coffee run', 'Your order, memorized.', '☕'), C('meeting', 'One meeting I’ll take for you', 'Notes provided. Mostly accurate.', '📋'), C('lunch', 'One lunch on me', 'Somewhere better than the usual place.', '🥗'), C('cover', 'One “I’ve got you covered”', 'For the afternoon. No questions.', '🛡️'), C('rec', 'One glowing reference', 'Sincere. Detailed. Slightly exaggerated.', '⭐'), C('drinks', 'One round of after-work drinks', 'The first one, anyway.', '🍹')],
  pet: [C('treat', 'One extra treat', 'The good kind.', '🦴'), C('walk', 'One long walk, the long way', 'All the sniffing you want.', '🌳'), C('rubs', 'Belly rubs, unlimited', 'No expiry date.', '🤍'), C('toy', 'One new toy', 'Squeaky, probably.', '🧸'), C('couch', 'The couch, just this once', 'We know it won’t be just this once.', '🛋️'), C('nap', 'One afternoon nap, together', 'Sun patch included.', '😴')],
  self: [C('day', 'One guilt-free day off', 'No laptop. No guilt. No exceptions.', '🌿'), C('dinner', 'One solo dinner somewhere nice', 'Bring a book. Order dessert.', '🍝'), C('no', 'One “no,” no explanation', 'Use it wisely. Or don’t.', '🙅'), C('new', 'Try one new thing', 'A class, a recipe, a city.', '✨'), C('books', 'One bookshop spree', 'Up to three books. Fine, four.', '📚'), C('early', 'One early night', 'Phone in another room.', '🌙')],
};

/* ======================================================================
   Word game: five-letter words with hints
   ====================================================================== */
const WB = {
  HAPPY: 'How we want you, every day of the year', STARS: 'Every one of them, out tonight for you', PARTY: 'What this whole universe is, technically',
  CAKES: 'Plural. Today is not a day for restraint.', DREAM: 'Worth chasing, even when it’s far', DANCE: 'What feet do when the song is right',
  ORBIT: 'What two things do when they can’t stay away', COMET: 'A dusty snowball with excellent PR', SMILE: 'You do it with your whole face',
  LAUGH: 'The best sound in any room', HEART: 'Fist-sized, works overtime', LIGHT: 'Fast. Still not as fast as gossip.',
  SWEET: 'Like candy. Mostly like you.', MAGIC: 'What the sky does at golden hour', BRAVE: 'You, more often than you think',
  TOAST: 'Raise a glass. Or butter some bread.', CHEER: 'What we’re doing for you, loudly', PROUD: 'How we feel. Very.',
  PEACE: 'What we wish you', STORY: 'Yours is our favorite one', SUNNY: 'The forecast, today and every day',
  MOVIE: 'This is one. Feature length.', PLANE: 'Window seat, please', MILES: 'The distance. Temporary.',
  HELLO: 'The best word after a long time apart', SORRY: 'Five letters. Meant every one.', FRESH: 'How a new year starts',
  TEACH: 'What you did best', CLASS: 'Where it all started', TREAT: 'Some friends know this word in every language',
  WALKS: 'The best part of the day, for some of us', QUIET: 'The kind of morning we hope you get', CANDY: 'A lollipop is technically one',
  MUSIC: 'What makes a long drive short', HOMES: 'Wherever your people are', BLOOM: 'What flowers do when they’re ready',
  SPARK: 'How every good thing starts', ROSES: 'They smell like June', VOICE: 'We’d know yours anywhere',
  TRUST: 'Built slowly, kept carefully', TEAMS: 'Better with you on them', LUNCH: 'The best meeting of the day',
  SLEEP: 'Doctor’s orders. Lots of it.', BRAIN: 'Yours: impressive', GRACE: 'You had it in every room',
  SHINE: 'What you do without trying', WORLD: 'Bigger than this one, but this one’s yours', CLOUD: 'Fluffy. Usually.',
  FRIES: 'Shared, never fairly', SNACK: 'Mandatory on all missions', PIZZA: 'The answer to “what should we eat?”',
};
const WORDS_FOR = {
  birthday: ['HAPPY', 'CAKES', 'PARTY', 'STARS', 'CANDY', 'DANCE', 'SMILE', 'TOAST', 'DREAM', 'MAGIC', 'SWEET', 'CHEER'],
  belated: ['HAPPY', 'SORRY', 'STARS', 'CAKES', 'PARTY', 'COMET', 'LIGHT', 'DANCE', 'CANDY', 'DREAM', 'MAGIC', 'SWEET'],
  anniversary: ['HEART', 'ORBIT', 'DANCE', 'STORY', 'SWEET', 'STARS', 'ROSES', 'MOVIE', 'DREAM', 'SPARK', 'TOAST', 'TRUST'],
  justbecause: ['HAPPY', 'STARS', 'SMILE', 'LAUGH', 'SUNNY', 'SWEET', 'MAGIC', 'HEART', 'SPARK', 'DREAM', 'MUSIC', 'SHINE'],
  sorry: ['SORRY', 'HEART', 'TRUST', 'PEACE', 'QUIET', 'LIGHT', 'STORY', 'SMILE', 'BLOOM', 'HELLO', 'GRACE', 'STARS'],
  congrats: ['PROUD', 'CHEER', 'BRAVE', 'TOAST', 'PARTY', 'DREAM', 'BRAIN', 'SHINE', 'SPARK', 'STARS', 'HAPPY', 'MAGIC'],
  farewell: ['PLANE', 'MILES', 'HELLO', 'WORLD', 'BRAVE', 'STORY', 'HOMES', 'STARS', 'CHEER', 'LIGHT', 'DREAM', 'TOAST'],
  getwell: ['SLEEP', 'QUIET', 'PEACE', 'SUNNY', 'BLOOM', 'BRAVE', 'SMILE', 'LIGHT', 'CLOUD', 'HEART', 'MOVIE', 'SNACK'],
  reunion: ['MILES', 'PLANE', 'HELLO', 'HEART', 'ORBIT', 'DREAM', 'STARS', 'LIGHT', 'SMILE', 'DANCE', 'STORY', 'SPARK'],
  thanks: ['GRACE', 'HEART', 'LIGHT', 'SHINE', 'PROUD', 'STORY', 'SMILE', 'TRUST', 'BRAVE', 'STARS', 'TEACH', 'SPARK'],
  remembrance: ['STORY', 'LIGHT', 'STARS', 'GRACE', 'VOICE', 'HEART', 'LAUGH', 'PEACE', 'HOMES', 'BLOOM', 'MUSIC', 'QUIET'],
  newyear: ['FRESH', 'TOAST', 'PARTY', 'CHEER', 'DREAM', 'SPARK', 'STARS', 'LIGHT', 'HAPPY', 'BLOOM', 'MAGIC', 'BRAVE'],
};
const WORDS_REL = { kid: ['CANDY', 'PIZZA', 'SNACK', 'HAPPY', 'STARS', 'DANCE'], pet: ['TREAT', 'WALKS', 'SNACK', 'SLEEP'], colleague: ['TEAMS', 'LUNCH', 'BRAIN', 'PROUD'], mentor: ['TEACH', 'CLASS', 'BRAIN', 'PROUD'], friends: ['FRIES', 'PIZZA', 'LAUGH', 'PARTY'] };
function wordsFor(occ, rel, them) {
  const list = [...(WORDS_REL[rel] || []), ...(WORDS_FOR[occ] || WORDS_FOR.birthday)];
  const nm = String(them || '').toUpperCase().replace(/[^A-Z]/g, '');
  const out = [];
  if (nm.length === 5) out.push({ w: nm, hint: 'Hmm. Who could this be?' });
  for (const w of list) { if (out.length >= 12) break; if (!out.some(o => o.w === w)) out.push({ w, hint: WB[w] }); }
  return out;
}

/* ======================================================================
   Trailer and finale
   ====================================================================== */
const B = 'boom', H = 'hit', A = 'alarm', RI = 'rise', BR = 'braam';
function trailerFor(occ, rel, d, them, me) {
  const T = (title, sub, rating, lines) => ({ title, sub, rating, lines: lines.map(([t, s, x]) => ({ t, s, ...(x || {}) })) });
  const em = (e, n) => Array(n).fill(e).join(' ');
  switch (occ) {
    case 'belated': return T(`${them} 2`, `Next ${d.month}`, `Rated G for ${them}`, [['In a world…', B], ['where one person…', B], ['forgot one very important date…', B], ['a promise was made.', H], ['⏰', A, { big: true }], [em('⏰', 2), A, { big: true }], [em('⏰', 3), A, { big: true }], [`This ${d.month}…`, RI], ['nobody forgets.', BR], ['There will be cake.', H, { small: 'Critics: “There will be a LOT of cake.”' }], ['There will be singing.', H, { small: 'Critics: “Pitch: questionable. Effort: undeniable.”' }], ['There will be a first “happy birthday” at 00:00 sharp.', BR]]);
    case 'anniversary': return T(`${them} & ${me}`, 'Renewed for another season', 'Rated PG for public displays of affection', [['In a world…', B], ['where two people…', B], ['kept choosing each other…', B], ['the story continues.', H], ['💍', A, { big: true }], [em('💍', 2), A, { big: true }], [em('💍', 3), A, { big: true }], [`This ${d.month}…`, RI], ['another year.', BR], ['There will be dinner.', H, { small: 'Critics: “Somebody booked a table this time.”' }], ['There will be slow dancing.', H, { small: 'Critics: “In the kitchen, mostly.”' }], [`Premiering every ${d.long}. Forever.`, BR]]);
    case 'reunion': return T(`${them} & ${me}`, 'Together, finally', 'Rated A for airport hug', [['In a world…', B], ['where two people…', B], ['live much too far apart…', B], ['the countdown begins.', H], ['✈️', A, { big: true }], [em('✈️', 2), A, { big: true }], [em('✈️', 3), A, { big: true }], [`On ${d.long}…`, RI], ['the distance closes.', BR], ['There will be an airport hug.', H, { small: 'Critics: “Embarrassingly long.”' }], ['There will be snacks.', H, { small: 'Critics: “So many snacks.”' }], [`Arriving ${d.long}.`, BR]]);
    case 'farewell': return T(`${them}: The Next Chapter`, 'Now boarding', `Rated G for go get ’em`, [['In a world…', B], ['where one brave person…', B], ['packs up everything…', B], ['a new chapter begins.', H], ['🧳', A, { big: true }], [em('🧳', 2), A, { big: true }], [em('🧳', 3), A, { big: true }], ['New city…', RI], ['same people.', BR], ['There will be video calls.', H, { small: 'Critics: “Too long. On purpose.”' }], ['There will be visits.', H, { small: 'Critics: “Bring the good snacks.”' }], ['Now boarding.', BR]]);
    case 'congrats': return T(`${them} 2`, 'The next big thing', `Rated A for achievement`, [['In a world…', B], ['where one person…', B], ['refused to quit…', B], ['history was made.', H], ['🏆', A, { big: true }], [em('🏆', 2), A, { big: true }], [em('🏆', 3), A, { big: true }], ['This year…', RI], ['they do it again.', BR], ['There will be champagne.', H, { small: 'Critics: “Sprayed, mostly.”' }], ['There will be speeches.', H, { small: 'Critics: “Surprisingly moving.”' }], ['Coming soon. Probably sooner than you think.', BR]]);
    case 'remembrance': return T(`${them}`, 'Always', 'Rated L for loved', [['In a world…', B], ['made better…', B], ['by one person…', B], ['the stories go on.', H], ['🕯️', A, { big: true }], [em('🕯️', 2), A, { big: true }], [em('🕯️', 3), A, { big: true }], [`Every ${d.long}…`, RI], ['we remember.', BR], ['There will be stories.', H, { small: '“Told badly, and often.”' }], ['There will be laughter.', H, { small: '“Exactly the way you laughed.”' }], ['Still showing. Always.', BR]]);
    case 'newyear': return T(`${them}: This Year`, 'Twelve months. One sequel.', 'Rated N for new', [['In a world…', B], ['where one year ends…', B], ['and another begins…', B], ['the sequel starts now.', H], ['🎆', A, { big: true }], [em('🎆', 2), A, { big: true }], [em('🎆', 3), A, { big: true }], ['This year…', RI], ['everything’s possible.', BR], ['There will be plans.', H, { small: 'Critics: “Some of them will happen.”' }], ['There will be good days.', H, { small: 'Critics: “Lots of them.”' }], ['Now showing. All year.', BR]]);
    default: {
      const yearly = ['birthday'].includes(occ);
      return T(`${them} 2`, yearly ? `Next ${d.month}` : 'The sequel', `Rated G for ${them}`, [['In a world…', B], [rel === 'friends' ? 'where one group chat…' : 'where one person…', B], [yearly ? 'gets one year better…' : 'makes everything better…', B], [`${them} returns.`, H], ['✨', A, { big: true }], [em('✨', 2), A, { big: true }], [em('✨', 3), A, { big: true }], [yearly ? `This ${d.month}…` : 'Coming soon…', RI], [yearly ? 'one more trip around the sun.' : 'more of the good stuff.', BR], ['There will be cake.', H, { small: 'Critics: “There will be a LOT of cake.”' }], ['There will be singing.', H, { small: 'Critics: “Pitch: questionable. Effort: undeniable.”' }], [yearly ? `Coming ${d.long}. Bring snacks.` : 'Coming soon. Bring snacks.', BR]]);
    }
  }
}
const FINALE = {
  birthday: { lines: ['Happy birthday, {them}.', 'Another year of you.', 'Lucky us.'], burst: ['HAPPY', 'BIRTHDAY'] },
  belated: { lines: ['Happy birthday, {them}.', 'The wish was late.', 'Everything behind it was right on time.'], burst: ['HAPPY', 'BIRTHDAY'] },
  anniversary: { lines: ['Happy anniversary.', 'Same you, same me.', 'Still my favorite story.'], burst: ['HAPPY', 'ANNIVERSARY'] },
  justbecause: { lines: ['No reason.', 'No occasion.', 'Just you.'], burst: ['JUST', 'BECAUSE'] },
  sorry: { lines: ['I’m sorry.', 'Thank you for reading all the way here.', 'I’ll do better.'], burst: ['I’M', 'SORRY'] },
  congrats: { lines: ['You did it, {them}.', 'We always knew you would.', 'Now go do the next thing.'], burst: ['YOU', 'DID IT'] },
  farewell: { lines: ['Bon voyage, {them}.', 'Go somewhere new.', 'Come back sometimes.'], burst: ['BON', 'VOYAGE'] },
  getwell: { lines: ['Rest up, {them}.', 'Everything can wait.', 'Except feeling better.'], burst: ['GET WELL', 'SOON'] },
  reunion: { lines: ['See you soon, {them}.', 'Same sky.', 'Same room, soon.'], burst: ['SEE YOU', 'SOON'] },
  thanks: { lines: ['Thank you, {them}.', 'For all of it.', 'Especially the parts you didn’t notice.'], burst: ['THANK', 'YOU'] },
  remembrance: { lines: ['We love you, {them}.', 'We miss you every day.', 'Your light is still arriving.'], burst: ['ALWAYS', 'LOVED'] },
  newyear: { lines: ['Happy new year, {them}.', 'New year.', 'Same us.'], burst: ['HAPPY', 'NEW YEAR'] },
};

/* ======================================================================
   Reasons deck
   ====================================================================== */
const REASONS = {
  partner: ['The way you laugh at your own jokes before you get to the end.', 'You remember how I take my coffee.', 'You make ordinary errands feel like a date.', 'You’re kind to waiters. Always.', 'Your terrible singing in the car.', 'You notice when I’m quiet.', 'You make the best version of a bad day.', 'The face you make when you’re concentrating.', 'You still hold my hand in public.', 'You believe in me a little more than I do.', 'You make our place feel like home.', 'You’re you. That’s the main one.'],
  bestie: ['You laugh at the same stupid things.', 'You remember the stuff I told you once, years ago.', 'You never make me explain.', 'You’re the first person I want to tell things to.', 'You hype me up in group photos.', 'You’ll defend me even when I’m a little bit wrong.', 'You send exactly the right meme.', 'You show up.', 'You know my order.', 'You make me braver.', 'Silence with you is never awkward.', 'You chose me. Every year.'],
  friends: ['The group chat at 2am.', 'Nobody ever lets a birthday go unsung.', 'Inside jokes older than some of our jobs.', 'You show up with snacks without being asked.', 'Every plan becomes a story.', 'No one has to pretend here.', 'You bring the chaos and the comfort.', 'The photos. Especially the bad ones.', 'We fight about restaurants and never about anything that matters.', 'You make every city feel like home.', 'You’ve seen me at my worst and stayed.', 'Because it’s us.'],
  family: ['You taught me how to do almost everything.', 'The way the house smells when you cook.', 'You always pick up the phone.', 'Your terrible jokes, told twice.', 'You’re proud of me even when I don’t deserve it.', 'You make holidays feel like holidays.', 'You never let me leave without leftovers.', 'You’re honest when it counts.', 'You make hard times feel survivable.', 'You remember everyone’s birthday.', 'Home is wherever you are.', 'You’re family. That’s forever.'],
  distance: ['You stay up late to say goodnight.', 'You make the miles feel smaller.', 'Your voice through a bad connection is still my favorite sound.', 'You send photos of ordinary things.', 'You never let the time difference win.', 'You plan the next visit before this one ends.', 'You make waiting feel worth it.', 'You remember what I said on calls when I was half asleep.', 'You’re patient with the distance.', 'You’re worth every flight.', 'Same sky, every night.', 'You’re my favorite person in any time zone.'],
  memorial: ['Your laugh, which filled every room.', 'The way you told stories.', 'Your cooking, and your opinions about ours.', 'How you made everyone feel welcome.', 'Your patience.', 'Your hands, always busy with something.', 'The way you said our names.', 'You never missed a game, a recital, a birthday.', 'Your advice, which we still use.', 'The songs you sang without knowing all the words.', 'How proud you were of us.', 'You loved us so much. We knew it.'],
  kid: ['You give the best hugs.', 'Your laugh is the best sound in the world.', 'You ask the best questions.', 'You’re brave, even when you’re scared.', 'You’re kind to everyone.', 'You make up the funniest games.', 'Your drawings are the best on the fridge.', 'You share your snacks. Sometimes.', 'You make every day an adventure.', 'You’re really, really smart.', 'You make grown-ups laugh.', 'You’re you, and that’s the best.'],
  mentor: ['You believed in me before I did.', 'You made hard things make sense.', 'You stayed late for students who needed it.', 'You were honest when it was easier not to be.', 'You made learning feel like an adventure.', 'You remembered names, and details.', 'You treated questions like gifts.', 'Your red pen was always fair.', 'You showed us what it looks like to care.', 'You changed how I see the world.', 'I still hear your voice when I’m stuck.', 'You made a difference. A real one.'],
  colleague: ['You made Mondays bearable.', 'You always knew where the good snacks were.', 'You covered for me more than once.', 'Your meeting notes were legendary.', 'You laughed at my terrible jokes.', 'You asked the question everyone was thinking.', 'You made the work better and the team kinder.', 'You remembered everyone’s birthdays.', 'You never took credit that wasn’t yours.', 'Your coffee order is iconic.', 'You were the calm one in every crisis.', 'Work was better with you there.'],
  pet: ['You’re always happy to see us.', 'You make the best welcome home.', 'Your warm spot on the couch.', 'The way you tilt your head.', 'You’re a professional napper.', 'You always know when we’re sad.', 'Your snoring.', 'You think every walk is the best walk ever.', 'Your face when you hear the treat bag.', 'You make the house a home.', 'You’re very soft.', 'You’re a very good friend.'],
  self: ['You kept going when it was hard.', 'You’re kinder than you give yourself credit for.', 'You make people laugh.', 'You try new things even when you’re nervous.', 'You’re a good friend.', 'You learn from your mistakes. Eventually.', 'You notice small beautiful things.', 'You ask for help now. That’s new.', 'You’ve survived every bad day so far.', 'You’re growing. It’s working.', 'You still have so much ahead.', 'You’re worth being proud of.'],
};

/* ======================================================================
   Director's commentary, monthly forecast, memories, mixtape
   ====================================================================== */
const COMMENTARY = {
  hero: 'Director’s note: I tried a lot of fonts for your name. This one looked the most like a movie poster.',
  ch1: 'Filmed entirely in my head, mostly late at night.',
  log: 'All events depicted are real. Some were cut for being too embarrassing.',
  stats: 'I did this math three times. Light is fast.',
  hill: 'The bench nobody sits on is a metaphor. For what, I don’t know. Ask the art department (also me).',
  chords: 'Try typing your name, then mine. Decide whose sounds better. (Yours.)',
  catch: 'The stars fall slowly on purpose. I tested it on my own reflexes and lowered the speed twice.',
  cake: 'Five candles, because I’m not putting a number on it.',
  letter: 'No commentary here. I meant every word.',
  epilogue: 'Two timelines, same two people. I like both.',
  credits: 'Stay for the post-credits scene. There’s a whole universe after it. Literally.',
};
const COMMENTARY_GENTLE = {
  hero: 'We picked this font because it looked like something you’d frame.',
  ch1: 'Everyone helped write this part. Everyone remembered it a little differently.',
  log: 'Every row is true. There could have been a thousand more.',
  stats: 'Somebody did this math with a calculator and a box of tissues.',
  hill: 'The bench is where you’d sit. We left room.',
  chords: 'Type your name. It sounds like a hymn, almost.',
  catch: 'Take your time. The stars aren’t going anywhere.',
  cake: 'Five candles. We couldn’t choose fewer.',
  letter: 'No commentary here. We meant every word.',
  epilogue: 'Both columns are full of you.',
  credits: 'There’s more after this. Take your time.',
};
const FORECAST = ['January: A fresh start that actually sticks. Rare. Enjoy.', 'February: Somebody laughs at your joke harder than it deserves. Correctly.', 'March: You finish the thing. Yes, that thing.', 'April: Spontaneous plan, excellent outcome.', 'May: The universe sends a song at exactly the right moment.', 'June: Long golden evenings. Recommended: outdoors, cold drink.', 'July: A day so good you’ll forget to check your phone.', 'August: The sky throws a meteor shower. Accept it graciously.', 'September: Someone builds you something. Roll with it.', 'October: A cozy month. Blankets are strongly indicated.', 'November: A good idea arrives in the shower. Write it down after.', 'December: Lights, snacks, and at least one excellent nap.'];

const MEMORY_PROMPTS = {
  partner: ['The day we met', 'Our first trip', 'That one night', 'A normal Tuesday, somehow perfect', 'Now'],
  bestie: ['How it started', 'The legendary night', 'The worst haircut', 'Road trip', 'Still us'],
  friends: ['The first hangout', 'That trip', 'The group photo', 'The night nobody remembers', 'All of us, now'],
  family: ['Way back when', 'Holidays', 'The kitchen', 'A day out', 'Now'],
  distance: ['Before the miles', 'The last goodbye', 'Video call screenshot', 'The next hello'],
  memorial: ['Young and fearless', 'The house', 'Holidays', 'With the grandkids', 'The way we remember you'],
  kid: ['The very first day', 'First steps', 'Best birthday ever', 'Silly faces', 'Now'],
  mentor: ['The first class', 'The project', 'Graduation', 'Still learning'],
  colleague: ['First day', 'The big launch', 'Team lunch', 'The farewell'],
  pet: ['Gotcha day', 'Tiny', 'Favorite nap spot', 'Best walk', 'Now'],
  self: ['Where I started', 'A hard year', 'A good day', 'Right now'],
};

// The built-in song library: public-domain (CC0) recordings, credited in CREDITS.md.
// Every universe starts with all of them, lofi and piano taking turns.
export const SONGS = [
  { id: 'tr1', src: 'assets/audio/first-snow.mp3', title: 'First Snow', artist: 'HoliznaCC0', kind: 'Lofi', side: 'A', note: 'Track one. For opening credits, and for the part of the evening when the sky goes quiet and nobody says anything.' },
  { id: 'tr2', src: 'assets/audio/goldberg-aria.mp3', title: 'Aria', artist: 'J. S. Bach, played by Kimiko Ishizaka', kind: 'Piano', side: 'A', note: 'The aria from the Goldberg Variations. Supposedly written to help someone fall asleep. It works on worries too.' },
  { id: 'tr3', src: 'assets/audio/snow-drift.mp3', title: 'Snow Drift', artist: 'HoliznaCC0', kind: 'Lofi', side: 'A', note: 'For slow mornings, late drives, and the scene where nothing happens and it’s still the best part.' },
  { id: 'tr4', src: 'assets/audio/goldberg-variation-13.mp3', title: 'Variation 13', artist: 'J. S. Bach, played by Kimiko Ishizaka', kind: 'Piano', side: 'B', note: 'The gentlest of the thirty variations. Best with a window and a cup of something warm.' },
  { id: 'tr5', src: 'assets/audio/everything-you-ever-dreamed.mp3', title: 'Everything You Ever Dreamed', artist: 'HoliznaCC0', kind: 'Lofi', side: 'B', note: 'Exactly what it says on the tape.' },
  { id: 'tr6', src: 'assets/audio/goldberg-aria-da-capo.mp3', title: 'Aria da capo', artist: 'J. S. Bach, played by Kimiko Ishizaka', kind: 'Piano', side: 'B', note: 'The last song on the tape: the aria again, from the top. Some things are worth hearing twice.' },
];
export const DEFAULT_TRACKS = SONGS;
export const songTrack = s => { const { kind, ...t } = s; return { ...t }; };
// The small words on the film's ident and ticket; the maker can change them (copy.gate).
export const GATE_WORDS = gentle => ({ presents: 'presents', forLine: gentle ? 'for {them}' : 'a film for {them}', fromLine: gentle ? 'with love, from {me}' : 'from {me}' });
// How loud the soundtrack plays unless the mixtape says otherwise (0–1): it sits under the film.
export const MUSIC_VOLUME = 0.7;

// Universes made before the library swapped the old house-band songs for it. Bring
// them up to date: a playlist that still had all three old songs gets the whole
// library; otherwise each old song becomes one new one. Returns true if it changed.
const OLD_SONGS = { 'assets/audio/paper-lanterns.mp3': 'tr1', 'assets/audio/slow-orbit.mp3': 'tr2', 'assets/audio/music-box-waltz.mp3': 'tr3' };
export function upgradeTracks(tracks) {
  if (!Array.isArray(tracks) || !tracks.some(t => t && OLD_SONGS[t.src])) return false;
  const at = tracks.findIndex(t => t && OLD_SONGS[t.src]);
  const all = Object.keys(OLD_SONGS).every(src => tracks.some(t => t && t.src === src));
  const keep = tracks.filter(t => !(t && OLD_SONGS[t.src]));
  const fresh = all
    ? SONGS.map(songTrack)
    : tracks.filter(t => t && OLD_SONGS[t.src]).map(t => ({ ...songTrack(SONGS.find(s => s.id === OLD_SONGS[t.src])), side: t.side || 'A' }));
  const used = new Set(keep.map(t => t.id));
  for (const t of fresh) if (used.has(t.id)) t.id = t.id + Math.random().toString(36).slice(2, 6);
  keep.splice(Math.min(at, keep.length), 0, ...fresh.filter(t => !keep.some(k => k.src === t.src)));
  tracks.splice(0, tracks.length, ...keep);
  return true;
}

/* ======================================================================
   generate(): build a complete first draft
   ====================================================================== */
export function generate({ rel, occ, them, me, date, yearKnown = true }) {
  const R0 = relById(rel), O = occById(occ);
  const d = info(date, yearKnown);
  const v = { them, me, date: d.long, month: d.month, season: d.season, nowSeason: nowSeason(), today: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) };
  const gentle = rel === 'memorial' || occ === 'remembrance';
  const ch = CHAPTERS[occ] || CHAPTERS.justbecause;
  const log = LOG[occ] || LOG.justbecause;
  const sm = STATS[statsFor(occ, rel, yearKnown, d.daysSince < 0)];
  const ws = wishSet(occ, rel);
  const tl = TIMELINES[occ] || TIMELINES.justbecause;
  const cakeMode = gentle || occ === 'sorry' || occ === 'getwell' ? 'light' : 'blow';
  const letterBody = LETTER_REL[rel] || LETTER[occ] || LETTER.justbecause;
  const occTitle = rel === 'memorial' && occ === 'birthday' ? 'Happy Birthday' : O.title;

  const themCap = occ === 'birthday' || occ === 'belated' ? (rel === 'memorial' ? 'loved, always' : 'the birthday star') : occ === 'congrats' ? 'the one who did it' : occ === 'farewell' ? 'off on an adventure' : occ === 'getwell' ? 'resting up' : occ === 'reunion' ? 'almost here' : R0.themCap;
  const meCap = occ === 'belated' ? 'the one who forgot' : occ === 'sorry' ? 'the one who got it wrong' : R0.meCap;

  const copy = {
    gate: { tagline: TAGLINE[occ] || TAGLINE.justbecause },
    hero: { scope: '{studio} presents · in {scope}', title: occTitle, line: HERO_LINE[occ] || HERO_LINE.justbecause, themCap, meCap },
    film: {
      ch1: { title: ch[0][0], sub: ch[0][1] }, ch2: { title: ch[1][0], sub: ch[1][1] }, epi: { title: ch[2][0], sub: ch[2][1] },
      log: { kicker: gentle ? 'A record' : 'Mission log', title: log.title, lede: log.lede, rows: log.rows.map(([d0, t, c]) => ({ d: d0, t, c: c || '' })) },
      stats: { on: true, list: sm.stats.map(x => ({ ...x })), lede: sm.lede },
      hill: { on: true, kicker: 'Scene 1 · the hill at twilight', title: gentle ? 'A lovely night to remember' : occ === 'birthday' || occ === 'belated' ? 'A lovely night to be a year older' : 'A lovely night', lede: 'A twilight sky, one streetlamp, a bench nobody sits on, and two friends in propeller hats. Tap anywhere in the scene to make stars. The button does the rest.' },
      chords: { on: true, kicker: 'Scene 2 · first contact', title: 'Say it in chords', lede: 'Somewhere out there is a friend who only speaks in musical chords. So here is a message, translated. Type anything and press play. The translation is not accurate. {me} made it up.', message: CHORD_MSG[occ] || 'hello {them}' },
      catch: { on: true, kicker: 'Scene 3 · refuelling', title: CATCH_TITLE[ws], lede: gentle ? 'Tap the falling stars to catch them. Every one carries a wish.' : 'This message needs fuel to reach you. Tap falling stars to catch them. Every star you catch carries a wish for your year.', wishes: WISHES[ws].slice() },
      cake: { on: true, mode: cakeMode, ...CAKE[cakeMode], done: CAKE_DONE[occ] || 'Wish sent.' },
      letter: { on: true, kicker: gentle ? 'A letter, sent by starlight' : 'A letter, delivered by probe', body: letterBody, sig: gentle ? '— With love, always' : `— ${me}` },
      timelines: { on: true, a: { title: tl.a[0], rows: tl.a[1].map(([t, x]) => ({ t, x })) }, b: { title: tl.b[0], rows: tl.b[1].map(([t, x]) => ({ t, x })) }, closing: tl.closing, redeem: tl.redeem || '' },
      credits: [
        { role: 'Starring', name: them, note: gentle ? 'as themselves, always' : `as ${themCap}` },
        { role: 'and', name: me, note: `as ${meCap}` },
        { role: 'Written & directed by', name: me, note: 'rewritten several times' },
        { role: 'Original score', name: 'The Mixtape', note: 'now on cassette in the Post Office' },
        { role: 'Special thanks', name: gentle ? 'Everyone who loved {them}' : 'Everyone who made {them} who they are' },
      ],
      disclaimer: occ === 'belated' ? 'No birthdays were harmed in the making of this film. One was mildly delayed.' : gentle ? 'Made with love, for someone we’ll always miss.' : occ === 'birthday' ? 'No birthdays were harmed in the making of this film.' : 'No feelings were hurt in the making of this film. Several were felt.',
      post: { title: 'Wait. Don’t leave yet.', lede: 'There’s a whole universe after this: games, letters, a sky you can draw on. Every world you finish earns a passport stamp. Collect enough and the finale unlocks.' },
    },
    map: { title: verseName(them), lede: gentle ? 'A place full of the things we remember. Wander anywhere. Every world you visit earns a passport stamp.' : 'Every world here was made for you. Finish one to stamp your passport. Collect enough stamps and the grand finale unlocks.' },
    letters: { title: gentle ? `Letters to ${them}` : 'Open When…', lede: gentle ? 'Things we wanted to say, for the moments we miss you most.' : `A stack of letters, each for a specific moment. Open them when the moment comes, or right now. ${me} isn’t the boss of you.`, items: [...(LETTERS[rel] || LETTERS.partner), ...lockedLetters(occ, rel, d, them, me)] },
    coupons: rel === 'memorial'
      ? { mode: 'promise', title: 'Promises we’re keeping', lede: `Things we’ll keep doing, for ${them}. Scratch one to see it.`, items: COUPONS.memorial.slice() }
      : { mode: 'coupon', title: occ === 'belated' ? 'That Timeline, Redeemable' : 'The Coupon Book', lede: occ === 'belated' ? 'In that timeline your birthday went perfectly. In this one, it isn’t too late to collect. Scratch each coupon to reveal it, then redeem it whenever you like.' : `Scratch each coupon to reveal it, then redeem it whenever you like. Redeeming means showing ${me}. They have been warned.`, items: [...(COUPONS[rel] || COUPONS.partner), ...(occ === 'belated' ? [{ id: 'forgot', title: 'One “I forgot” pass', fine: 'VOID. This coupon has been cancelled by the issuer. They are not forgetting again.', icon: '🚫', void: true }] : [])] },
    words: wordsFor(occ, rel, them),
    reasons: { title: gentle ? 'Things we remember' : rel === 'partner' ? 'Reasons I love you' : rel === 'self' ? 'Reasons to be proud of you' : 'Reasons you’re the best', items: (REASONS[rel] || REASONS.partner).slice() },
    memories: { title: 'Memory Lane', items: (MEMORY_PROMPTS[rel] || MEMORY_PROMPTS.partner).map(c => ({ id: uid(), caption: c, when: '', photo: null })) },
    trailer: trailerFor(occ, rel, d, them, me),
    finale: { lines: FINALE[occ]?.lines || FINALE.justbecause.lines, burst: FINALE[occ]?.burst || ['FOR', 'YOU'], sign: gentle ? '— With love, always' : `— ${me}` },
    commentary: { ...(gentle ? COMMENTARY_GENTLE : COMMENTARY) },
    forecast: FORECAST.slice(),
    mixtape: { title: `Songs for ${them}, vol. 1`, note: `For ${them}. Compiled by ${me}. Play loud, or play quiet. Both are correct.`, tracks: SONGS.map(songTrack) },
  };
  return deep(copy, v);
}

export function newUniverse({ rel, occ, them, me, date, yearKnown = true, theme, themAvatar, meAvatar }) {
  const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = Date.now();
  return {
    id, v: 1, kind: 'mine', createdAt: now, updatedAt: now,
    rel, occ, date, yearKnown,
    theme: theme || DEFAULT_THEME[rel] || 'twilight',
    them: { name: them, photo: null, avatar: themAvatar || null },
    me: { name: me, photo: null, avatar: meAvatar || null },
    studio: studioName(me),
    scope: `${keyWord(them) || 'Little'}Scope`,
    worlds: recommendedWorlds(rel, occ),
    hidden: true,
    copy: generate({ rel, occ, them, me, date, yearKnown }),
  };
}

// The worlds whose name is the title of their own content, edited with that content.
export const TITLED_WORLDS = { mail: ['letters', 'title'], coupons: ['coupons', 'title'], reasons: ['reasons', 'title'], memories: ['memories', 'title'] };
// One name per world, used everywhere (map, passport, universe page, editor, world header).
// A name the maker gave a world (u.worldText) wins over the built-in one.
export function worldTitle(u, id, def = '') {
  const c = u.copy || {}, them = u.them?.name || '';
  const gentle = u.rel === 'memorial' || u.occ === 'remembrance';
  const own = String(u.worldText?.[id]?.name || '').trim();
  if (own && !TITLED_WORLDS[id]) return own;
  switch (id) {
    case 'mail': return c.letters?.title || (gentle ? `Letters to ${them}` : 'Open When…');
    case 'coupons': return c.coupons?.title || 'The Coupon Book';
    case 'reasons': return c.reasons?.title || 'Reasons';
    case 'memories': return c.memories?.title || 'Memory Lane';
    case 'wordle': return wordGameName(them);
    case 'trailer': return `Coming Soon: ${c.trailer?.title || them + ' 2'}`;
    case 'almanac': { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(u.date || ''); return m ? `The ${MONTHS[+m[2] - 1]} ${+m[3]} Almanac` : 'The Almanac'; }
    default: return def;
  }
}
// A shorter form of the same name, for tight spots (passport stamps).
export function worldShort(u, id, def = '', short = '') {
  const t = worldTitle(u, id, def);
  if (t.length <= 16 || (u.worldText?.[id]?.name && !TITLED_WORLDS[id])) return t;
  switch (id) {
    case 'mail': return 'Letters';
    case 'trailer': return u.copy?.trailer?.title || 'Trailer';
    case 'almanac': return 'Almanac';
    case 'coupons': return u.copy?.coupons?.mode === 'promise' ? 'Promises' : 'Coupons';
    default: return short || t;
  }
}

// Swap a name everywhere in a universe's text (used when the editor renames someone).
export function renameEverywhere(obj, from, to) {
  if (!from || from === to) return obj;
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\p{L}])${esc}(?=$|[^\\p{L}])`, 'gu');
  const walk = o => Array.isArray(o) ? o.map(walk) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, x]) => [k, k === 'photo' || k === 'src' || k === 'id' ? x : walk(x)])) : typeof o === 'string' ? o.replace(re, (m, p) => p + to) : o;
  return walk(obj);
}
export { MONTHS };

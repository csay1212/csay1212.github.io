// Example universes that ship with the app. Every person here is made up.
import { newUniverse } from './templates.js';
import { HATS, allWorldsOn } from './catalog.js';

const hat = id => { const { id: _, ...h } = HATS.find(x => x.id === id); return h; };
const av = (o) => ({ species: 'cat', fur: '#ffffff', hub: '#f5cc4a', blush: true, eyes: 'dots', mouth: 'tongue', acc: 'none', lolli: ['#ef5fa7', '#a46cf0', '#ffffff'], bg: '#2a1d55', ...o });

export function demoUniverses() {
  /* ---------- 1. Mira: a partner's birthday ---------- */
  const mira = newUniverse({ rel: 'partner', occ: 'birthday', them: 'Mira', me: 'Theo', date: '1998-10-21', theme: 'twilight',
    themAvatar: av({ ...hat('sunset'), eyes: 'wink', acc: 'lollipop', bg: '#3b2470' }),
    meAvatar: av({ species: 'bear', fur: '#d9a066', ...hat('primary'), acc: 'specs', bg: '#14304a' }) });
  mira.id = 'demo-mira'; mira.demo = true; mira.worlds = allWorldsOn(); mira.createdAt = mira.updatedAt = Date.parse('2026-09-28T20:00:00');
  Object.assign(mira.copy.film.letter, { body:
`Mira,

Happy birthday. I wanted to give you something you could open more than once, so I built you a small universe. It has games, letters, a sky full of stars, and a few secrets. Take your time with it.

Remember the night on the roof in Lisbon, when the power went out across the whole street and we could suddenly see every star? You said it was like the city had turned off the lights so we could see what was behind them. I think about that a lot.

That’s what you do for me. You turn the noise down and the good stuff up.

I hope this year gives you big sunsets, songs that show up exactly when you need them, and people who make you feel like the main character. You deserve all of it.

Happy birthday. Go explore.` });
  mira.copy.memories.items = [
    { id: 'm1', caption: 'The day we met, at the worst party of 2021', when: 'March 2021', photo: 'assets/demo/scene-city.jpg' },
    { id: 'm2', caption: 'Lisbon, when the lights went out', when: 'August 2022', photo: 'assets/demo/scene-rooftop.jpg' },
    { id: 'm3', caption: 'The cabin with no heating', when: 'January 2023', photo: 'assets/demo/scene-snow.jpg' },
    { id: 'm4', caption: 'A normal Tuesday, somehow perfect', when: 'May 2024', photo: 'assets/demo/scene-picnic.jpg' },
    { id: 'm5', caption: 'Now', when: 'This year', photo: 'assets/demo/scene-beach.jpg' },
  ];
  mira.copy.reasons.items[0] = 'The way you laugh at your own jokes before you get to the end of them.';
  mira.copy.reasons.items[4] = 'Your terrible singing in the car, especially the made-up words.';
  mira.copy.coupons.items[3] = { id: 'plan', title: 'One day in Lisbon where I plan everything', fine: 'You just show up. Pastéis de nata included.', icon: '🗺️' };

  /* ---------- 2. Walt: in loving memory ---------- */
  const walt = newUniverse({ rel: 'memorial', occ: 'remembrance', them: 'Grandpa Walt', me: 'The Bennetts', date: '1938-03-14', theme: 'candle',
    themAvatar: av({ species: 'bear', fur: '#b9b6c2', ...hat('ocean'), eyes: 'happy', mouth: 'smile', acc: 'specs', bg: '#3b2b1d' }),
    meAvatar: av({ species: 'cat', fur: '#f3e3cf', ...hat('mint'), eyes: 'happy', mouth: 'smile', acc: 'flower', bg: '#20321f' }) });
  walt.id = 'demo-walt'; walt.demo = true; walt.createdAt = walt.updatedAt = Date.parse('2026-09-20T18:00:00');
  walt.studio = 'Bennett Family Pictures'; walt.scope = 'WaltScope';
  walt.copy.map.title = 'Waltverse';
  Object.assign(walt.copy.film.letter, { body:
`Walt,

We made this so there would be a place where you’re still at the center of things. A small universe, full of the things you loved: the lake, your terrible puns, the tomato plants you talked to every morning.

When a star goes quiet, its light keeps traveling for a long time. That’s what you are to us. Still arriving, every time one of us says “well, that’s a horse of a different color” and nobody knows why.

The grandkids still fight over who gets your chair. We let them.

We miss you. We’ll keep the light on.` });
  walt.copy.memories.items = [
    { id: 'w1', caption: 'The lake house, the summer it was finished', when: '1971', photo: 'assets/demo/scene-lake.jpg' },
    { id: 'w2', caption: 'Christmas, and the sweater nobody asked for', when: '1988', photo: 'assets/demo/scene-snow.jpg' },
    { id: 'w3', caption: 'Teaching everyone to fish. Catching nothing.', when: '2004', photo: 'assets/demo/scene-picnic.jpg' },
    { id: 'w4', caption: 'The tomato plants, his pride and joy', when: 'Every summer', photo: 'assets/demo/scene-garden.jpg' },
  ];
  walt.copy.reasons.items = ['Your laugh, which you started before the punchline.', 'The way you said “well, that’s a horse of a different color.”', 'Tomato plants, and the way you talked to them.', 'You never missed a single school play.', 'Pancakes every Saturday, shaped like states.', 'Your hands, always fixing something.', 'You taught every one of us to fish. None of us can.', 'How you danced with Grandma in the kitchen.', 'You kept every drawing we ever gave you.', 'Your advice: “eat something, then decide.”', 'How proud you were of all of us.', 'You loved us so much. We knew it.'];

  /* ---------- 3. The Thursday Club: friends, new year ---------- */
  const club = newUniverse({ rel: 'friends', occ: 'newyear', them: 'The Thursday Club', me: 'Ana', date: '2027-01-01', theme: 'golden',
    themAvatar: av({ species: 'fox', fur: '#ff9b52', ...hat('sun'), eyes: 'stars', mouth: 'open', acc: 'balloon', bg: '#4f2134' }),
    meAvatar: av({ species: 'bunny', fur: '#ffffff', ...hat('berry'), eyes: 'wink', acc: 'bow', bg: '#4b1c5f' }) });
  club.id = 'demo-club'; club.demo = true; club.worlds = allWorldsOn(); club.createdAt = club.updatedAt = Date.parse('2026-09-12T12:00:00');
  club.scope = 'ThursdayScope';
  club.copy.memories.items = [
    { id: 'c1', caption: 'The first Thursday. Seven people, one tiny table.', when: '2019', photo: 'assets/demo/scene-city.jpg' },
    { id: 'c2', caption: 'Karaoke. We don’t talk about it.', when: '2022', photo: 'assets/demo/scene-concert.jpg' },
    { id: 'c3', caption: 'The beach trip where it rained for four days', when: '2023', photo: 'assets/demo/scene-beach.jpg' },
    { id: 'c4', caption: 'All of us, now', when: '2026', photo: 'assets/demo/scene-rooftop.jpg' },
  ];

  /* ---------- 4. Received example: Noor → Sam, long distance countdown ---------- */
  const sam = newUniverse({ rel: 'distance', occ: 'reunion', them: 'Sam', me: 'Noor', date: '2026-12-18', theme: 'seaglass',
    themAvatar: av({ species: 'mouse', fur: '#b9b6c2', ...hat('ocean'), eyes: 'dots', acc: 'shades', bg: '#123b51' }),
    meAvatar: av({ species: 'cat', fur: '#8a5a3c', ...hat('lilac'), eyes: 'hearts', acc: 'flower', bg: '#3a2a5e' }) });
  sam.id = 'demo-sam'; sam.demo = true; sam.worlds = allWorldsOn(); sam.kind = 'received'; sam.from = 'Noor'; sam.receivedAt = Date.parse('2026-10-01T09:30:00');
  sam.createdAt = sam.updatedAt = Date.parse('2026-09-30T22:00:00');
  sam.copy.memories.items = [
    { id: 's1', caption: 'Before the miles', when: 'Spring 2025', photo: 'assets/demo/scene-picnic.jpg' },
    { id: 's2', caption: 'The last goodbye at Gate 14', when: 'August 2026', photo: 'assets/demo/scene-airport.jpg' },
    { id: 's3', caption: 'Same moon, two time zones', when: 'Every night', photo: 'assets/demo/scene-rooftop.jpg' },
  ];
  return [mira, walt, club, sam];
}

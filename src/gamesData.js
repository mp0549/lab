import cryptogramthumbnail from '../src/assets/thumbnails/cryptogram.png';
import brickbreaker from '../src/assets/thumbnails/brickbreaker.png';




const games = [
    {
    id: 'cryptogram',
    title: 'Cryptogram Love Notes',
    tagline: 'Decode the messages!',
    route: '/cryptogram',
    image: cryptogramthumbnail
  },
  {
    id: 'breakout',
    title: 'Breakout',
    tagline: '“Break bricks and see if you can survive the experimental glitches!”',
    route: '/breakout',
    image: brickbreaker
  },
];

export default games;

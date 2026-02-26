import cryptogramthumbnail from '../src/assets/thumbnails/cryptogram.png';
import brickbreaker from '../src/assets/thumbnails/brickbreaker.png';




const games = [
    {
    id: 'cryptogram',
    title: 'Cryptogram Love Notes',
    tagline: 'Decrypt the messages!',
    route: '/cryptogram',
    image: cryptogramthumbnail
  },
  {
    id: 'breakout',
    title: 'Breakout',
    tagline: '“See if you can survive the experimental glitches!”',
    route: '/breakout',
    image: brickbreaker
  },
];

export default games;

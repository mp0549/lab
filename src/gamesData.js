import cryptogramthumbnail from '../src/assets/thumbnails/cryptogram.png';
import brickbreaker from '../src/assets/thumbnails/brickbreaker.png';
import connect4thumbnail from '../src/assets/thumbnails/connect4.png';
import teekothumbnail from '../src/assets/thumbnails/connect4.png';


const games = [
    {
    id: 'cryptogram',
    title: 'Cryptogram',
    tagline: 'Decrypt the messages!',
    route: '#/cryptogram',
    image: cryptogramthumbnail
  },
  {
    id: 'breakout',
    title: 'Breakout',
    tagline: '”See if you can survive the experimental glitches!”',
    route: '#/breakout',
    image: brickbreaker
  },
  {
    id: 'teeko',
    title: 'Teeko',
    tagline: 'Play Teeko against an overpowered AI or a friend.',
    route: 'https://mp0549.github.io/teeko_ai/',
    image: teekothumbnail
  },  
  {
    id: 'connect4',
    title: 'Connect 4',
    tagline: 'Play Connect 4 against an AI that shows you exactly how it plans to beat you.',
    route: 'https://mp0549.github.io/connect4/',
    image: connect4thumbnail
  },
  {
    id: 'catch',
    title: 'Node Catch',
    tagline: 'Intercept falling data nodes. Do not let them escape.',
    route: '#/catch',
  },
];

export default games;

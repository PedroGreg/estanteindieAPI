const FIRST = ['Jogador', 'Cavaleira', 'Mago', 'Pilota', 'Ninja', 'Bardo', 'Arqueira', 'Robô', 'Exploradora', 'Ferreiro'];
const SECOND = ['Pixel', 'Byte', 'Sprite', 'Neon', 'Turbo', 'Retrô', 'Cometa', 'Glitch', 'Arcade', 'Cartucho'];
const BIOS = [
    'Fã de metroidvanias e trilhas sonoras em 8 bits.',
    'Coleciono roguelikes e nunca termino nenhum.',
    'Speedrunner nas horas vagas.',
    'Procurando o próximo indie para zerar.',
    'Gosto de jogos com pixel art caprichada.'
];

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function slug(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.');
}

export function fictionalUser() {
    const name = `${pick(FIRST)} ${pick(SECOND)}`;
    const number = Math.floor(100 + Math.random() * 900);
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const password = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return {
        name,
        email: `${slug(name)}${number}@exemplo.com`,
        password,
        bio: pick(BIOS)
    };
}

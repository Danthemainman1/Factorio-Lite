export const RECIPES = {
    'iron-plate': {
        name: 'Iron Plate',
        ingredients: { 'iron-ore': 1 },
        time: 2.0
    },
    'copper-plate': {
        name: 'Copper Plate',
        ingredients: { 'copper-ore': 1 },
        time: 2.0
    },
    'iron-gear': {
        name: 'Iron Gear',
        ingredients: { 'iron-plate': 2 },
        time: 1.0
    },
    'copper-cable': {
        name: 'Copper Cable',
        ingredients: { 'copper-plate': 1 },
        results: { 'copper-cable': 2 },
        time: 0.5
    },
    'electronic-circuit': {
        name: 'Electronic Circuit',
        ingredients: { 'iron-plate': 1, 'copper-cable': 3 },
        time: 1.0
    }
};

export const ITEMS = {
    'iron-ore': { color: '#4682B4' },
    'copper-ore': { color: '#B87333' },
    'stone': { color: '#888C8D' },
    'coal': { color: '#111111' },
    'iron-plate': { color: '#C0C0C0' },
    'copper-plate': { color: '#CD7F32' },
    'iron-gear': { color: '#708090' }, // SlateGray
    'copper-cable': { color: '#F4A460' },
    'electronic-circuit': { color: '#008000' }
};

export class Inventory {
    constructor(size) {
        this.size = size;
        this.slots = {}; // Key: item type, Value: count
    }

    add(type, count = 1) {
        if (!this.slots[type]) this.slots[type] = 0;
        this.slots[type] += count;
        return 0; // Returning 0 means all added (no overflow logic for now)
    }

    remove(type, count = 1) {
        if (this.slots[type] && this.slots[type] >= count) {
            this.slots[type] -= count;
            if (this.slots[type] <= 0) delete this.slots[type];
            return count;
        }
        return 0;
    }

    has(type, count = 1) {
        return this.slots[type] && this.slots[type] >= count;
    }

    getCount(type) {
        return this.slots[type] || 0;
    }
}

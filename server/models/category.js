const db = require('../database/main');
const EventEmitter = require('events');

module.exports = (function () {

    let _categories = [];

    async function getCategories() {
        try {
            _categories = await db.getCategories();
        } catch (e) {
            console.log('Ошибка в функции getCategories', e.message);
        }
    }

    async function deleteCategory(id) {
        try {
            await db.deleteCategory(id);
            const index = _categories.findIndex(category => category.id === id);
            if (index !== -1) {
                _categories.splice(index, 1);
            }
            return Promise.resolve();
        } catch (e) {
            console.log('Ошибка в функции deleteCategory', e.message);
        }
    }

    async function updateCategory(data) {
        try {
            await db.updateCategory(data);
            const category = _categories.find(category => category.id === data.id);
            for (let prop in data) {
                if (prop !== 'id') {
                    category[prop] = data[prop];
                }
            }
            return Promise.resolve();
        } catch (e) {
            console.log('Ошибка в функции updateCategory', e.message);
        }
    }

    async function addCategory(data) {
        try {
            const id = await db.addCategory(data);
            _categories.push({ id, ...data });
            return Promise.resolve(id);
        } catch (e) {
            console.log('Ошибка в функции addCategory', e.message);
        }
    }

    return new class extends EventEmitter {
        constructor() {
            super();
            getCategories();
        }

        get(...keys) {
            if (keys.length === 0) {
                return Array.from(_categories);
            }

            function filterByKeys(arr, keys) {
                return arr.map(obj => {
                    const newObj = {};
                    keys.forEach(key => {
                        if (key in obj) {
                            newObj[key] = obj[key];
                        }
                    })
                    return newObj;
                });
            }
            return filterByKeys(_categories, keys);
        }

        getPriorityById(id) {
            return _categories.find(cat => cat.id === Number(id)).priority;
        }

        async delete(id) {
            await deleteCategory(id);
            this.emit('updateCategories');
        }

        async update(data) {
            await updateCategory(data);
            this.emit('updateCategories');
        }

        async add(data) {
            const id = await addCategory(data);
            this.emit('updateCategories');
            return Promise.resolve(id);
        }
    }
})();
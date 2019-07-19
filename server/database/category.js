const addCategoryQuery = `INSERT INTO categories SET ?`;
const deleteCategoryQuery = `DELETE FROM categories WHERE id = ?`;
const updateCategoryQuery = `UPDATE categories SET name = ?, path = ?, preset = ?, priority = ? WHERE id = ?`;
const getCategiesQuery = `SELECT * FROM categories AS categories`;

module.exports = function(pool) {
  function addCategory(data) {
    return new Promise((resolve, reject) => {
      pool.query(addCategoryQuery, data, (err, result, fields) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      });
    });
  }

  function deleteCategory(id) {
    return new Promise((resolve, reject) => {
      pool.query(deleteCategoryQuery, id, (err, result, fields) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  function updateCategory({ id, name, path, preset, priority }) {
    return new Promise((resolve, reject) => {
      pool.query(
        updateCategoryQuery,
        [name, path, preset, priority, id],
        (err, result, fields) => {
          if (err) {
            reject(err);
          }
          resolve(result);
        }
      );
    });
  }

  function getCategories() {
    return new Promise((resolve, reject) => {
      pool.query(getCategiesQuery, (err, result, fields) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }

  return {
    getCategories,
    updateCategory,
    addCategory,
    deleteCategory
  };
};

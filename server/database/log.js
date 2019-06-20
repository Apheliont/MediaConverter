const addLogQuery = `INSERT INTO logs SET ?`;
const updateLogQuery = `UPDATE logs SET ? WHERE id = ?`;

module.exports = function(pool) {
  function getLogs({
    rowsPerPage,
    search,
    page = 1,
    sortBy = "id",
    descending = "true",
    status = 0
  } = {}) {
    return new Promise((resolve, reject) => {
      if (search) {
        // санизация поисковой строки
        search = pool.escape(search).slice(1, -1);
      }
      // санизация других параметров
      sortBy = pool.escape(sortBy).slice(1, -1);
      rowsPerPage = parseInt(pool.escape(rowsPerPage).slice(1, -1));
      page = parseInt(pool.escape(page).slice(1, -1));
      status = parseInt(pool.escape(status).slice(1, -1));

      const getLogsQuery = [];
      getLogsQuery.push("SELECT * FROM logs AS logs"); // селектим все логи
      getLogsQuery.push(`WHERE status = ${status}`); // фильтруем по статусу
      // если есть строка поиска, то уточняем критерий фильтрации
      if (search) {
        getLogsQuery.push(`AND fileName LIKE '%${search}%'`);
      }
      if (sortBy !== "null") {
        // сортируем по определенному столбцу
        // null может быть, это вариант "не сортированный"
        getLogsQuery.push(`ORDER BY ${sortBy} ${descending === "true" ? "DESC" : "ASC"}`);
      }
      if (rowsPerPage !== undefined) {
        // выдаем только требуемый диапазон записей
        getLogsQuery.push(`LIMIT ${rowsPerPage} OFFSET ${rowsPerPage * (page - 1)}`);
      }
      // создаем объект где будут 2 поля: 1) сами элементы 2) общее число элементов
      // этой группы(стутус)
      const data = {};
      const itemsPromise = new Promise((resolve, reject) => {
        pool.query(getLogsQuery.join(" "), (err, result, fields) => {
          if (err) {
            reject(err);
          }
          data.items = result;
          resolve();
        });
      })
      // Нужно получить число всех элементов с указанным статусом,
      // это для паджинации
      const itemsCountPromise = new Promise((resolve, reject) => {
        const totalItemsQuery = [];
        totalItemsQuery.push(`SELECT COUNT(*) FROM logs WHERE status = ${status}`);
        if (search) {
          totalItemsQuery.push(`AND fileName LIKE '%${search}%'`);
        }
        pool.query(totalItemsQuery.join(" "), (err, result, fields) => {
          if (err) {
            reject(err);
          }
          data.totalItems = result[0]["COUNT(*)"];
          resolve();
        });
      })
      Promise.all([itemsPromise, itemsCountPromise])
      .then(() => {
        resolve(data)
      })
      .catch(e => {
        console.log("error", e);
        reject(e);
      })
    });
  }
  function addLog({ fileName, extension, size, category }) {
    return new Promise((resolve, reject) => {
      pool.query(
        addLogQuery,
        { fileName, extension, size, category },
        (err, result, fields) => {
          if (err) {
            reject(err);
          }
          resolve(result.insertId);
        }
      );
    });
  }

  function updateLog(data) {
    const id = data.id;
    const propsToUpdate = {};
    Object.keys(data).forEach(prop => {
      if (data[prop] !== "undefined" && prop !== "id") {
        propsToUpdate[prop] = data[prop];
      }
    });
    return new Promise((resolve, reject) => {
      pool.query(updateLogQuery, [propsToUpdate, id], (err, result, fields) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }
  return {
    getLogs,
    addLog,
    updateLog
  };
};

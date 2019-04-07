const category = require("../models/category");

async function getCategories(req, res) {
  try {
    const categories = await category.get();
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(categories);
  } catch (e) {
    res.status(500).send(e.message);
  }
}

async function addCategory(req, res) {
  try {
    const id = await category.add(req.body);
    res.status(200).json({ id });
  } catch (e) {
    res.status(500).send(e.message);
  }
}

function deleteCategory(req, res) {
  const id = Number(req.params.id);
  try {
    category.delete(id);
    res.status(200).end();
  } catch (e) {
    res.status(500).send(e.message);
  }
}

function updateCategory(req, res) {
  try {
    category.update(req.body);
    res.status(200).end();
  } catch (e) {
    res.status(500).send(e.message);
  }
}

module.exports = {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory
};

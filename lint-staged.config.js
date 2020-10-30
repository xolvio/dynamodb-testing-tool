module.exports = {
  "*.js": ["eslint --cache --fix", "jest --findRelatedTests"],
  "package.json": ["sort-package-json"],
};

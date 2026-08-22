const { BadRequestError } = require("../utils/AppErrors");

function validate(schemaOrFactory, source = "body") {
  return (req, res, next) => {
    const schema =
      typeof schemaOrFactory === "function"
        ? schemaOrFactory(req)
        : schemaOrFactory;
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        path: issue.path.join(".") || source,
        message: issue.message,
      }));
      const message = fields.map((f) => `${f.path}: ${f.message}`).join(", ");
      const err = new BadRequestError(message);
      err.fields = fields;
      return next(err);
    }

    if (source === "query") {
      for (const key of Object.keys(req.query)) {
        delete req.query[key];
      }
      Object.assign(req.query, result.data);
    } else {
      req[source] = result.data;
    }

    next();
  };
}

module.exports = validate;

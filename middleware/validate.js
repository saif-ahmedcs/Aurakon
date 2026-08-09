const { BadRequestError } = require("../utils/AppErrors");

function validate(schemaOrFactory, source = "body") {
  return (req, res, next) => {
    const schema =
      typeof schemaOrFactory === "function"
        ? schemaOrFactory(req)
        : schemaOrFactory;
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || source}: ${issue.message}`)
        .join(", ");
      return next(new BadRequestError(message));
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

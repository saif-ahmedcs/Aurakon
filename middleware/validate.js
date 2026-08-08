function validate(schemaOrFactory, source = "body") {
  return (req, res, next) => {
    const schema =
      typeof schemaOrFactory === "function"
        ? schemaOrFactory(req)
        : schemaOrFactory;
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const err = new Error(
        result.error.issues
          .map((issue) => `${issue.path.join(".") || source}: ${issue.message}`)
          .join(", "),
      );
      err.status = 400;
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

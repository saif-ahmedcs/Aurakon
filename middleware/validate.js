function validate(schema, source = "body") {
  return (req, res, next) => {
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

    req[source] = result.data;
    next();
  };
}

module.exports = validate;

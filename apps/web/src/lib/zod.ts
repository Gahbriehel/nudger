/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ZodIssue {
  path: (string | number)[];
  message: string;
}

export class ZodError extends Error {
  issues: ZodIssue[];
  constructor(issues: ZodIssue[]) {
    super(JSON.stringify(issues));
    this.issues = issues;
    Object.setPrototypeOf(this, ZodError.prototype);
  }

  get errors() {
    return this.issues;
  }

  flatten() {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of this.issues) {
      const field = issue.path.join(".");
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    return { fieldErrors };
  }
}

export type SafeParseResult<T> =
  { success: true; data: T } | { success: false; error: ZodError };

export abstract class ZodType<T = any> {
  _type!: T;
  abstract parse(data: any, path?: (string | number)[]): T;

  safeParse(data: any): SafeParseResult<T> {
    try {
      const parsed = this.parse(data, []);
      return { success: true, data: parsed };
    } catch (e) {
      if (e instanceof ZodError) {
        return { success: false, error: e };
      }
      return {
        success: false,
        error: new ZodError([
          {
            path: [],
            message: e instanceof Error ? e.message : "Invalid value",
          },
        ]),
      };
    }
  }

  optional(): ZodOptional<this> {
    return new ZodOptional(this);
  }

  nullable(): ZodNullable<this> {
    return new ZodNullable(this);
  }
}

class ZodString extends ZodType<string> {
  private checks: Array<{
    validate: (val: string) => boolean;
    message: string;
  }> = [];

  parse(data: any, path: (string | number)[] = []): string {
    if (typeof data !== "string") {
      throw new ZodError([
        { path, message: "Expected string, received " + typeof data },
      ]);
    }
    for (const check of this.checks) {
      if (!check.validate(data)) {
        throw new ZodError([{ path, message: check.message }]);
      }
    }
    return data;
  }

  min(
    length: number,
    message = `String must contain at least ${length} character(s)`,
  ) {
    this.checks.push({
      validate: (val) => val.length >= length,
      message,
    });
    return this;
  }

  max(
    length: number,
    message = `String must contain at most ${length} character(s)`,
  ) {
    this.checks.push({
      validate: (val) => val.length <= length,
      message,
    });
    return this;
  }

  email(message = "Invalid email address") {
    this.checks.push({
      validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      message,
    });
    return this;
  }
}

class ZodNumber extends ZodType<number> {
  private checks: Array<{
    validate: (val: number) => boolean;
    message: string;
  }> = [];

  parse(data: any, path: (string | number)[] = []): number {
    const num = Number(data);
    if (isNaN(num) || typeof data === "boolean") {
      throw new ZodError([{ path, message: "Expected number, received NaN" }]);
    }
    for (const check of this.checks) {
      if (!check.validate(num)) {
        throw new ZodError([{ path, message: check.message }]);
      }
    }
    return num;
  }

  min(
    minVal: number,
    message = `Number must be greater than or equal to ${minVal}`,
  ) {
    this.checks.push({
      validate: (val) => val >= minVal,
      message,
    });
    return this;
  }

  max(
    maxVal: number,
    message = `Number must be less than or equal to ${maxVal}`,
  ) {
    this.checks.push({
      validate: (val) => val <= maxVal,
      message,
    });
    return this;
  }
}

class ZodBoolean extends ZodType<boolean> {
  parse(data: any, path: (string | number)[] = []): boolean {
    if (typeof data !== "boolean") {
      throw new ZodError([
        { path, message: "Expected boolean, received " + typeof data },
      ]);
    }
    return data;
  }
}

class ZodObject<Shape extends Record<string, ZodType>> extends ZodType<{
  [K in keyof Shape]: Shape[K]["_type"];
}> {
  constructor(public shape: Shape) {
    super();
  }

  parse(data: any, path: (string | number)[] = []): any {
    if (typeof data !== "object" || data === null) {
      throw new ZodError([
        { path, message: "Expected object, received " + typeof data },
      ]);
    }

    const result: any = {};
    const errors: ZodIssue[] = [];

    for (const key in this.shape) {
      const fieldSchema = this.shape[key];
      const fieldValue = data[key];
      try {
        result[key] = fieldSchema.parse(fieldValue, [...path, key]);
      } catch (e) {
        if (e instanceof ZodError) {
          errors.push(...e.issues);
        } else {
          errors.push({
            path: [...path, key],
            message: e instanceof Error ? e.message : "Invalid field",
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ZodError(errors);
    }

    return result;
  }
}

class ZodArray<T extends ZodType> extends ZodType<Array<T["_type"]>> {
  constructor(public itemSchema: T) {
    super();
  }

  parse(data: any, path: (string | number)[] = []): any {
    if (!Array.isArray(data)) {
      throw new ZodError([
        { path, message: "Expected array, received " + typeof data },
      ]);
    }

    const result: any[] = [];
    const errors: ZodIssue[] = [];

    data.forEach((item, index) => {
      try {
        result.push(this.itemSchema.parse(item, [...path, index]));
      } catch (e) {
        if (e instanceof ZodError) {
          errors.push(...e.issues);
        } else {
          errors.push({
            path: [...path, index],
            message: e instanceof Error ? e.message : "Invalid array item",
          });
        }
      }
    });

    if (errors.length > 0) {
      throw new ZodError(errors);
    }

    return result;
  }
}

class ZodOptional<T extends ZodType> extends ZodType<T["_type"] | undefined> {
  constructor(public innerSchema: T) {
    super();
  }

  parse(data: any, path: (string | number)[] = []): any {
    if (data === undefined) {
      return undefined;
    }
    return this.innerSchema.parse(data, path);
  }
}

class ZodNullable<T extends ZodType> extends ZodType<T["_type"] | null> {
  constructor(public innerSchema: T) {
    super();
  }

  parse(data: any, path: (string | number)[] = []): any {
    if (data === null) {
      return null;
    }
    return this.innerSchema.parse(data, path);
  }
}

export const z = {
  string: () => new ZodString(),
  number: () => new ZodNumber(),
  boolean: () => new ZodBoolean(),
  object: <Shape extends Record<string, ZodType>>(shape: Shape) =>
    new ZodObject(shape),
  array: <T extends ZodType>(itemSchema: T) => new ZodArray(itemSchema),
};

export type infer<T extends ZodType> = T["_type"];

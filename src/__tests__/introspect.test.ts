import { describe, test, expect } from "bun:test";
import { unwrapType, formatTypeString, parseField } from "../lib/introspect.ts";

describe("unwrapType", () => {
  test("simple named type: String", () => {
    const type = { kind: "SCALAR", name: "String" };
    expect(unwrapType(type)).toEqual({ name: "String", isRequired: false, isList: false });
  });

  test("non-null: String!", () => {
    const type = { kind: "NON_NULL", ofType: { kind: "SCALAR", name: "String" } };
    expect(unwrapType(type)).toEqual({ name: "String", isRequired: true, isList: false });
  });

  test("list: [String]", () => {
    const type = { kind: "LIST", ofType: { kind: "SCALAR", name: "String" } };
    expect(unwrapType(type)).toEqual({ name: "String", isRequired: false, isList: true });
  });

  test("non-null list: [String]!", () => {
    const type = {
      kind: "NON_NULL",
      ofType: { kind: "LIST", ofType: { kind: "SCALAR", name: "String" } },
    };
    expect(unwrapType(type)).toEqual({ name: "String", isRequired: true, isList: true });
  });

  test("non-null list of non-null: [String!]!", () => {
    const type = {
      kind: "NON_NULL",
      ofType: {
        kind: "LIST",
        ofType: { kind: "NON_NULL", ofType: { kind: "SCALAR", name: "String" } },
      },
    };
    expect(unwrapType(type)).toEqual({ name: "String", isRequired: true, isList: true });
  });

  test("object type: Order", () => {
    const type = { kind: "OBJECT", name: "Order" };
    expect(unwrapType(type)).toEqual({ name: "Order", isRequired: false, isList: false });
  });

  test("non-null object: Order!", () => {
    const type = { kind: "NON_NULL", ofType: { kind: "OBJECT", name: "Order" } };
    expect(unwrapType(type)).toEqual({ name: "Order", isRequired: true, isList: false });
  });

  test("missing name defaults to Unknown", () => {
    const type = { kind: "SCALAR" };
    expect(unwrapType(type)).toEqual({ name: "Unknown", isRequired: false, isList: false });
  });
});

describe("formatTypeString", () => {
  test("simple type", () => {
    expect(formatTypeString({ name: "String", isRequired: false, isList: false })).toBe("String");
  });

  test("required type", () => {
    expect(formatTypeString({ name: "String", isRequired: true, isList: false })).toBe("String!");
  });

  test("list type", () => {
    expect(formatTypeString({ name: "String", isRequired: false, isList: true })).toBe("[String]");
  });

  test("required list type", () => {
    expect(formatTypeString({ name: "ID", isRequired: true, isList: true })).toBe("[ID]!");
  });
});

describe("parseField", () => {
  test("parses a simple required field", () => {
    const field = {
      name: "id",
      description: "The unique ID",
      type: { kind: "NON_NULL", ofType: { kind: "SCALAR", name: "ID" } },
    };
    expect(parseField(field)).toEqual({
      name: "id",
      description: "The unique ID",
      type: "ID!",
      isRequired: true,
      isList: false,
    });
  });

  test("parses optional list field", () => {
    const field = {
      name: "tags",
      description: null,
      type: { kind: "LIST", ofType: { kind: "SCALAR", name: "String" } },
    };
    expect(parseField(field)).toEqual({
      name: "tags",
      description: null,
      type: "[String]",
      isRequired: false,
      isList: true,
    });
  });

  test("handles missing description", () => {
    const field = {
      name: "code",
      type: { kind: "SCALAR", name: "String" },
    };
    expect(parseField(field)).toEqual({
      name: "code",
      description: null,
      type: "String",
      isRequired: false,
      isList: false,
    });
  });
});

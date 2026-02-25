import { executeGraphQL } from "./client.ts";

interface FieldInfo {
  name: string;
  description: string | null;
  type: string;
  isRequired: boolean;
  isList: boolean;
}

interface OperationInfo {
  name: string;
  description: string | null;
  args: FieldInfo[];
  returnType: string;
}

interface TypeInfo {
  name: string;
  kind: string;
  description: string | null;
  fields: FieldInfo[] | null;
  enumValues: string[] | null;
  inputFields: FieldInfo[] | null;
  possibleTypes: string[] | null;
}

// Recursively unwrap GraphQL type wrappers to get the named type and modifiers
export function unwrapType(type: any): { name: string; isRequired: boolean; isList: boolean } {
  let isRequired = false;
  let isList = false;
  let current = type;

  if (current.kind === "NON_NULL") {
    isRequired = true;
    current = current.ofType;
  }
  if (current.kind === "LIST") {
    isList = true;
    current = current.ofType;
    if (current.kind === "NON_NULL") {
      current = current.ofType;
    }
  }

  return { name: current.name ?? "Unknown", isRequired, isList };
}

export function formatTypeString(info: { name: string; isRequired: boolean; isList: boolean }): string {
  let s = info.name;
  if (info.isList) s = `[${s}]`;
  if (info.isRequired) s = `${s}!`;
  return s;
}

export function parseField(field: any): FieldInfo {
  const typeInfo = unwrapType(field.type);
  return {
    name: field.name,
    description: field.description ?? null,
    type: formatTypeString(typeInfo),
    isRequired: typeInfo.isRequired,
    isList: typeInfo.isList,
  };
}

// List all queries and mutations, optionally filtered
export async function listOperations(
  url: string,
  filter?: string,
  token?: string,
  api?: string
): Promise<{ queries: OperationInfo[]; mutations: OperationInfo[] }> {
  const query = `
    query IntrospectOperations {
      __schema {
        queryType { name fields { name description args { name description type { ...TypeRef } } type { ...TypeRef } } }
        mutationType { name fields { name description args { name description type { ...TypeRef } } type { ...TypeRef } } }
      }
    }
    fragment TypeRef on __Type {
      kind name
      ofType { kind name ofType { kind name ofType { kind name } } }
    }
  `;

  const result = await executeGraphQL(url, query, undefined, { token, api });
  if (result.errors) {
    throw new Error(`Introspection failed: ${result.errors[0]?.message}`);
  }

  const schema = result.data?.__schema as any;

  const parseOp = (field: any): OperationInfo => ({
    name: field.name,
    description: field.description ?? null,
    args: (field.args ?? []).map(parseField),
    returnType: formatTypeString(unwrapType(field.type)),
  });

  const filterFn = filter
    ? (op: OperationInfo) => op.name.toLowerCase().includes(filter.toLowerCase())
    : () => true;

  return {
    queries: (schema.queryType?.fields ?? []).map(parseOp).filter(filterFn),
    mutations: (schema.mutationType?.fields ?? []).map(parseOp).filter(filterFn),
  };
}

// Describe a specific type (object, input, enum)
export async function describeType(
  url: string,
  typeName: string,
  token?: string,
  api?: string
): Promise<TypeInfo> {
  const query = `
    query IntrospectType($name: String!) {
      __type(name: $name) {
        name kind description
        fields(includeDeprecated: true) { name description type { ...TypeRef } }
        inputFields { name description type { ...TypeRef } }
        enumValues(includeDeprecated: true) { name description }
        possibleTypes { name }
      }
    }
    fragment TypeRef on __Type {
      kind name
      ofType { kind name ofType { kind name ofType { kind name } } }
    }
  `;

  const result = await executeGraphQL(url, query, { name: typeName }, { token, api });
  if (result.errors) {
    throw new Error(`Type introspection failed: ${result.errors[0]?.message}`);
  }

  const t = result.data?.__type as any;
  if (!t) {
    throw new Error(`Type "${typeName}" not found`);
  }

  return {
    name: t.name,
    kind: t.kind,
    description: t.description ?? null,
    fields: t.fields?.map(parseField) ?? null,
    inputFields: t.inputFields?.map(parseField) ?? null,
    enumValues: t.enumValues?.map((e: any) => e.name) ?? null,
    possibleTypes: t.possibleTypes?.map((p: any) => p.name) ?? null,
  };
}

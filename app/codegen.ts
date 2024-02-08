import { CodegenConfig } from "@graphql-codegen/cli";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const conf = {
  api: process.env.VITE_GRAPHQL_API_URL ?? "",
  key: process.env.VITE_GRAPHQL_API_KEY ?? "",
};

if (conf.api.length === 0 || conf.key.length === 0) {
  throw new Error("Missing API URL or API key");
}

const baseUrl = conf.api;

const schema = [{}];
schema[0][baseUrl] = {
  headers: {
    Authorization: conf.key,
  },
};

const config: CodegenConfig = {
  schema,
  documents: ["src/**/*.tsx", "src/**/*.gql"],
  noSilentErrors: true,
  config: {
    useTypeImports: true,
    dedupeFragments: true,
    arrayInputCoercion: false,
    avoidOptionals: true,
    skipTypename: true,
    experimentalFragmentVariables: true,
    exportFragmentSpreadSubTypes: true,
    scalars: {
      BigInt: "string",
      Date: "string",
      DateTime: "string",
      Decimal: "number",
      Int: "number",
      JSON: "string",
    },
  },
  generates: {
    "./src/codegen/schema.ts": {
      plugins: ["typescript", "typescript-operations"],
    },
    "./src/codegen/index.ts": {
      preset: "import-types",
      presetConfig: {
        typesPath: "./schema",
      },
      plugins: ["typescript-react-apollo"],
      config: {
        pureMagicComment: true,
      },
    },
    "./src/codegen/possibleTypes.ts": {
      plugins: ["fragment-matcher"],
    },
  },
  hooks: {
    afterAllFileWrite: ["eslint --fix", "prettier --write"],
  },
  ignoreNoDocuments: true,
};

export default config;

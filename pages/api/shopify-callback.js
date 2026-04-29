import { shopifyCallbackHandler } from "../../lib/shopify-server";

export default async function handler(req, res) {
  await shopifyCallbackHandler(req, res);
}

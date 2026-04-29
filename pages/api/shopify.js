import { shopifyProxyHandler } from "../../lib/shopify-server";

export default async function handler(req, res) {
  await shopifyProxyHandler(req, res);
}
